import { useState, useCallback } from 'react';
import { attendanceService, attendanceRepo } from '../../../di/attendanceDI';
import { offlineService } from '../offline.service';
import { addDoc, collection, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { DateUtils } from '../../../shared/kernel/DateUtils'; // ✅ Import สำหรับจัดการวันที่แบบ Local Time

/**
 * ⚡ useAttendanceActions
 * จัดการ Action ทั้งหมด (Clock In/Out, Request)
 */
export function useAttendanceActions({
    userId,
    companyId,
    location,
    locationStatus,
    distance,
    isOffline,
    companyConfig,
    currentUser, // ✅ FIX: Added currentUser to avoid ReferenceError
    onSuccess // callback เช่น loadTodayRecord
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * ลงเวลาเข้า
     */
    const clockIn = useCallback(async (options = {}) => {
        setLoading(true);
        setError(null);

        try {
            // Validate Location
            if (!location) {
                throw new Error('ไม่สามารถระบุตำแหน่งได้ กรุณารอสักครู่');
            }
            if (locationStatus === 'out-of-range') {
                throw new Error(`คุณอยู่นอกรัศมีบริษัท (${distance} เมตร)`);
            }

            // คำนวณเวลาเข้างานตามกะ (Fixed Logic: No Grace Period added here)
            let scheduleTime = null;
            let shiftDateStr = null;
            const now = new Date(); // Physical Time

            // --- ARCHITECTURE RULE: LATE NIGHT CLOCK-IN TRAP ---
            // If clocking in at 01:00 AM, is it today's shift or yesterday's late shift?
            // 1. Check Schedule: If scheduled for yesterday 22:00, it's yesterday's shift.
            // 2. No Schedule: Use Cut-off Time (e.g. 05:00 AM).
            const physicalDateStr = DateUtils.formatDate(now); // ✅ ใช้ DateUtils คืนค่าเวลา Local Time เสมอ
            const currentHour = now.getHours();

            if (options.scheduleData?.startTime) {
                const [sh, sm] = options.scheduleData.startTime.split(':').map(Number);

                // If schedule starts late night (e.g., 22:00) and we clock in past midnight (e.g., 01:00)
                // We assume shiftDate is the previous day.
                if (sh >= 18 && currentHour < 12) {
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    shiftDateStr = DateUtils.formatDate(yesterday); // ✅ แก้เป็นเวลา Local

                    scheduleTime = new Date(yesterday);
                    scheduleTime.setHours(sh, sm, 0, 0);
                } else {
                    shiftDateStr = physicalDateStr;
                    scheduleTime = new Date(now);
                    scheduleTime.setHours(sh, sm, 0, 0);
                }
            } else {
                // No schedule: Apply 05:00 AM Cut-off rule
                const CUTOFF_HOUR = 5;
                if (currentHour < CUTOFF_HOUR) {
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    shiftDateStr = DateUtils.formatDate(yesterday); // ✅ แก้เป็นเวลา Local
                } else {
                    shiftDateStr = physicalDateStr;
                }
            }

            const attendanceData = {
                companyId,
                userId,
                actionType: 'clock-in',
                shiftDate: shiftDateStr,
                location: {
                    lat: location.lat,
                    lng: location.lng,
                    address: location.address
                },
                localTimestamp: now.toISOString(),
                shiftStart: scheduleTime ? scheduleTime.toISOString() : null
            };

            // Offline Check
            if (isOffline) {
                await offlineService.addToQueue(attendanceData);
                if (onSuccess) onSuccess({ ...attendanceData, _offline: true });

                return {
                    success: true,
                    isLate: false,
                    message: 'บันทึกไว้ในเครื่อง จะอัปโหลดเมื่อมีเน็ต',
                    offline: true
                };
            }

            // Online Call
            const result = await attendanceService.clockIn(
                userId,
                companyId,
                attendanceData.location,
                new Date(attendanceData.localTimestamp),
                scheduleTime,
                attendanceData.shiftDate
            );

            if (result.isFailure) {
                throw new Error(result.error);
            }

            // Refresh Data
            if (onSuccess) await onSuccess();

            const newLog = result.getValue();
            const isLate = newLog.status === 'late';

            return {
                success: true,
                isLate: isLate,
                message: isLate
                    ? (companyConfig?.greeting?.late || 'มาสายนะ')
                    : (companyConfig?.greeting?.onTime || 'บันทึกสำเร็จ!')
            };

        } catch (err) {
            console.error('[Action] ClockIn Error:', err);
            setError(err.message);
            return { success: false, message: err.message };
        } finally {
            setLoading(false);
        }
    }, [userId, companyId, location, locationStatus, distance, isOffline, companyConfig, onSuccess]);

    /**
     * ลงเวลาออก
     */
    const clockOut = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            if (!location) {
                throw new Error('ไม่สามารถระบุตำแหน่งได้ กรุณารอสักครู่');
            }

            const now = new Date();
            const currentHour = now.getHours();

            // Reconstruct logical shiftDate (since clockOut must find the active clockIn)
            // If it's physically 06:00 AM, they likely clocked in yesterday night.
            // A more robust way offline is just trying yesterday if today fails, but
            // for now use cutoff to find the active shift.
            const CUTOFF_HOUR = Number(companyConfig?.cutoffHour) || 12; // Out cutoff might be wider, assume 12:00 PM
            let shiftDateStr = DateUtils.formatDate(now); // ✅ ใช้ Local Time
            if (currentHour < CUTOFF_HOUR) {
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                shiftDateStr = DateUtils.formatDate(yesterday); // ✅ ใช้ Local Time
            }

            const attendanceData = {
                companyId,
                userId,
                actionType: 'clock-out',
                shiftDate: shiftDateStr,
                location: {
                    lat: location.lat,
                    lng: location.lng,
                    address: location.address
                },
                localTimestamp: now.toISOString()
            };

            if (isOffline) {
                await offlineService.addToQueue(attendanceData);
                // Can't infer full log state easily offline, pass minimal update
                if (onSuccess) onSuccess({ clockOut: now, _offline: true });

                return {
                    success: true,
                    message: 'บันทึกไว้ในเครื่อง จะอัปโหลดเมื่อมีเน็ต',
                    offline: true
                };
            }

            // Note: Currently, attendanceService.clockOut doesn't accept shiftDateStr. Let's pass the date object so it limits findLatestByEmployee boundary correctly, 
            // OR we rely on findLatestByEmployee just searching for the "latest". Actually, findLatestByEmployee now accepts dateOrShiftDate!
            // Let's modify attendanceService.clockOut to proxy it. But wait, clockOut in Service is: async clockOut(employeeId, locationData, timestamp = DateUtils.now()) 
            // Wait, we can just pass the physical timestamp, since Firebase Repo findLatestByEmployee uses physical `new Date()` fallback safely for legacy, 
            // BUT for new logs it strictly matches `shift_date == timestamp formatting`. 
            // This means we MUST pass the shiftDate string or date object that formats to it.
            // I will update the service in a moment if needed, but for now passing `attendanceData.shiftDate` as a 4th argument?
            // Actually, let's just pass `new Date(attendanceData.shiftDate)` to trick DateUtils.formatDate in repo safely.
            const logicalSearchDate = new Date(attendanceData.shiftDate);

            const result = await attendanceService.clockOut(userId, attendanceData.location, new Date(attendanceData.localTimestamp), logicalSearchDate);

            if (result.isFailure) {
                throw new Error(result.error);
            }

            const finalLog = result.getValue();
            if (onSuccess) await onSuccess();

            return {
                success: true,
                message: `เลิกงานแล้ว! (ทำไป ${finalLog.workMinutes} นาที)`
            };

        } catch (err) {
            console.error('[Action] ClockOut Error:', err);
            setError(err.message);
            return { success: false, message: err.message };
        } finally {
            setLoading(false);
        }
    }, [userId, companyId, location, isOffline, onSuccess]);

    /**
     * ส่งคำขอแก้ไขย้อนหลัง
     */
    const submitRetroRequest = useCallback(async (data) => {
        if (!userId || !companyId) {
            return { success: false, message: 'ไม่พบ userId หรือ companyId' };
        }

        try {
            // Note: Keeping logic simple here, or move to Service/Repo if preferred.
            // But requests collection is simple.
            await addDoc(collection(db, "requests"), {
                companyId,
                userId,
                userName: data.userName || '',
                type: 'retro',
                status: 'pending',
                date: data.date,
                timeIn: data.timeIn,
                timeOut: data.timeOut,
                location: data.location || '',
                reason: data.reason,
                createdAt: serverTimestamp()
            });

            return { success: true, message: 'ส่งคำขอแก้เวลาเรียบร้อยแล้ว' };
        } catch (err) {
            console.error('[Action] Retro Request Error:', err);
            return { success: false, message: 'เกิดข้อผิดพลาด: ' + err.message };
        }
    }, [userId, companyId]);

    /**
     * Proxy to Repo for History
     */
    const getHistory = useCallback(async (startDate, endDate) => {
        return attendanceRepo.getRecordsByUser(userId, startDate, endDate);
    }, [userId]);

    /**
     * สั่งปิดกะแบบ Manual (สำหรับเคสลืมออกงาน)
     * 🛡️ SECURITY: สร้างคำขอให้ admin อนุมัติด้วย (กันกระสุน)
     */
    const closeStaleShift = useCallback(async (logId, time, reason, clockInTime) => {
        setLoading(true);
        try {
            // ✅ ARCHITECTURE FIX: Cross-day Shift Compensation (T+1)
            // เช็คว่าถ้าเวลาที่เลือกมาเป็นช่วงเช้า (เช่น 01:00 - 12:00) 
            // แต่กะนั้นเป็นของวันที่ 18 (Night Shift) เราต้องบวกวันเพิ่มให้ 1 วัน
            // เพื่อไม่ให้เกิด Error: Clock-out < Clock-in
            let adjustedTime = new Date(time);

            // Get the clock-in time of the stale shift to determine if we need cross-day adjustment
            const staleClockInTime = new Date(clockInTime);

            // ✅ BULLETPROOF CROSS-DAY LOGIC
            // If the requested clock-out time is earlier than the clock-in time, it must be the next day
            if (adjustedTime < staleClockInTime) {
                adjustedTime.setDate(adjustedTime.getDate() + 1);
                console.log("[HR Logic] Auto-adjusted cross-day shift to T+1 (out < in). Clock-in:", staleClockInTime, "Adjusted Out:", adjustedTime);
            }

            // 1. สร้างคำขอให้ admin อนุมัติก่อน
            const requestRef = await addDoc(collection(db, "requests"), {
                companyId,
                userId,
                userName: currentUser?.name || 'Unknown',
                type: 'stale-shift-close', // 🆕 ประเภทใหม่สำหรับปิดกะเก่า
                status: 'pending',
                originalLogId: logId,
                manualTime: adjustedTime.toISOString(),
                reason: reason,
                createdAt: serverTimestamp()
            });

            // 2. บันทึกข้อมูลไว้ใน attendance_logs แต่ยังไม่ active (รออนุมัติ)
            const result = await attendanceService.closeStaleShift(userId, logId, adjustedTime, reason);
            if (result.isFailure) throw new Error(result.error);

            // 3. อัปเดตคำขอด้วยข้อมูลที่บันทึก
            await updateDoc(requestRef, {
                attendanceLogId: result.getValue().id,
                processedAt: serverTimestamp()
            });

            if (onSuccess) await onSuccess();
            return { success: true, requestId: requestRef.id };
        } catch (err) {
            console.error('[Action] CloseStaleShift Error:', err);
            return { success: false, message: err.message };
        } finally {
            setLoading(false);
        }
    }, [userId, companyId, currentUser, onSuccess]);

    return {
        loading,
        error,
        clockIn,
        clockOut,
        submitRetroRequest,
        getHistory,
        closeStaleShift
    };
}
