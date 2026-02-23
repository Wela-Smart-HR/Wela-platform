import { db } from '@/shared/lib/firebase';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, setDoc } from 'firebase/firestore';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const COMPANY_TIMEZONE = 'Asia/Bangkok';

export const migrationService = {
    /**
     * Phase 2: Idempotent Backfill from Legacy `daily_attendance` to `attendance_logs`
     * 1. Uses Deterministic ID: {companyId}_{employeeId}_{shiftDate}
     * 2. Cleans timezone bugs by using dayjs.tz() to bind the string time into Asia/Bangkok Time
     * 3. Uses writeBatch in chunks of 499 max operations to avoid Firestore limits
     */
    async runDataMigration(companyId, selectedMonth) {
        try {
            console.log("Starting Migration for:", selectedMonth);

            // 1. Calculate Date Range (String format YYYY-MM-DD)
            const year = selectedMonth.getFullYear();
            const month = selectedMonth.getMonth() + 1;
            const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endStr = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

            // 2. Fetch ALL attendance logs from LEGACY collection (not daily_attendance)
            // ⚠️ CRITICAL FIX: Use 'attendance' collection where legacy data actually exists
            const q = query(
                collection(db, 'attendance'),
                where('companyId', '==', companyId),
                where('date', '>=', startStr),
                where('date', '<=', endStr)
            );
            const snap = await getDocs(q);

            // 3. Flatten the Map into individual logs mapped by Employee & Date
            const allLogsToMigrate = [];

            snap.docs.forEach(d => {
                const data = d.data();
                const dateStr = data.date; // Legacy uses date field, not document ID
                
                // ดึงข้อมูลจาก legacy record
                let checkIn = null;
                let checkOut = null;
                
                // จาก localTimestamp (ถ้ามี)
                if (data.localTimestamp) {
                    const parts = data.localTimestamp.split('->');
                    if (parts.length === 2) {
                        checkIn = parseTimeSafely(parts[0].trim());
                        checkOut = parseTimeSafely(parts[1].trim());
                    }
                }
                
                // จาก retro-approved adjustments
                if (data.retro_approved && Array.isArray(data.retro_approved)) {
                    const approved = data.retro_approved.find(r => r.shift_date === dateStr);
                    if (approved) {
                        checkIn = parseTimeSafely(approved.check_in);
                        checkOut = parseTimeSafely(approved.check_out);
                    }
                }
                
                // คำนวณ late minutes จาก check-in และ schedule start time (09:30)
                let lateMinutes = 0;
                if (checkIn) {
                    // แปลงเวลาเป็นนาที
                    const checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
                    const scheduleStartMinutes = 9 * 60 + 30; // 09:30 = 570 minutes
                    
                    lateMinutes = Math.max(0, checkInMinutes - scheduleStartMinutes);
                    console.log(`🕐 Calculated late minutes for ${dateStr}: checkIn=${checkIn.toTimeString().slice(0,5)}, late=${lateMinutes}m`);
                }
                
                // สร้าง log data ใหม่
                const logData = {
                    company_id: companyId,
                    employee_id: data.employee_id || data.userId, // ใช้ employee_id ถ้ามี ไม่งั้น userId
                    shift_date: dateStr,
                    clock_in: checkIn,
                    clock_out: checkOut,
                    status: checkIn ? (checkOut ? 'complete' : 'incomplete') : 'absent',
                    late_minutes: lateMinutes, // ใช้ค่าที่คำนวณแล้ว
                    clock_in_location: null,
                    timezone: COMPANY_TIMEZONE,
                    is_migrated: true,
                    migrated_at: serverTimestamp(),
                    source: 'migration_script',
                    original_legacy_id: data.id || null
                };

                const logKey = `${companyId}_${data.userId}_${dateStr}`;
                
                let existingLog = allLogsToMigrate.find(log => log.logKey === logKey);
                
                if (!existingLog) {
                    existingLog = {
                        logKey,
                        ...logData
                    };
                    allLogsToMigrate.push(existingLog);
                }
                
                // Process time based on type
                const timeString = data.localTimestamp || data.time || data.createdAt;
                if (!timeString) return;
                
                const parseTimeSafely = (timeString) => {
                    if (!timeString) return null;

                    // กรณีที่ 1: เป็น ISO String ที่มีตัว T (เช่น 2024-02-01T08:30:00.000Z)
                    if (timeString.includes('T')) {
                        return dayjs.tz(timeString.replace('Z', ''), COMPANY_TIMEZONE).toDate();
                    }

                    // กรณีที่ 2: เป็นแค่เวลา (เช่น "08:30" หรือ "08:30:00")
                    if (timeString.match(/^\d{1,2}:\d{2}/)) {
                        // เอาวันที่จาก dateStr มาประกอบร่างกับเวลา
                        return dayjs.tz(`${dateStr} ${timeString}`, COMPANY_TIMEZONE).toDate();
                    }

                    // กรณีที่ 3: Format อื่นๆ เช่น "YYYY-MM-DD HH:mm:ss"
                    return dayjs.tz(timeString, COMPANY_TIMEZONE).toDate();
                };
                
                const parsedTime = parseTimeSafely(timeString);
                if (!parsedTime) return;
                
                // Assign clock-in or clock-out based on type
                if (data.type === 'clock-in' || data.actionType === 'clock-in') {
                    existingLog.clock_in = parsedTime;
                    existingLog.clock_in_location = data.location || null;
                    existingLog.status = data.status || 'present';
                    existingLog.late_minutes = data.lateMinutes || data.lateMins || 0;
                } else if (data.type === 'clock-out' || data.actionType === 'clock-out') {
                    existingLog.clock_out = parsedTime;
                }
            });

            if (allLogsToMigrate.length === 0) {
                console.log("No legacy logs found to migrate.");
                return 0;
            }

            // 4. Batch Write with Batch Limiting (Max 500, we use 499)
            let totalCommitted = 0;
            const chunkSize = 499;
            for (let i = 0; i < allLogsToMigrate.length; i += chunkSize) {
                const chunk = allLogsToMigrate.slice(i, i + chunkSize);
                const batch = writeBatch(db);

                chunk.forEach(log => {
                    // Architecture Rule 2: Idempotency with Deterministic Document ID
                    const deterministicId = `${companyId}_${log.employee_id}_${log.shift_date}`;
                    const docRef = doc(db, 'attendance_logs', deterministicId);

                    // Use setDoc in batch with merge: true to avoid creating duplicates
                    batch.set(docRef, log, { merge: true });
                });

                await batch.commit();
                totalCommitted += chunk.length;
                console.log(`Committed chunk: ${chunk.length} | Total: ${totalCommitted}/${allLogsToMigrate.length}`);
            }

            console.log(`Migration Complete. Successfully migrated ${totalCommitted} records.`);
            return totalCommitted;

        } catch (error) {
            console.error("Migration Error:", error);
            throw error;
        }
    }
};
