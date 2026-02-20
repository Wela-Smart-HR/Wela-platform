import { AttendanceLog } from '../domain/AttendanceLog.js';
import { Location } from '../domain/value-objects/Location.js';
import { Result } from '../../../shared/kernel/Result.js';
import { DateUtils } from '../../../shared/kernel/DateUtils.js';

/**
 * Attendance Service (Use Case)
 * ควบคุม Flow การทำงานทั้งหมด: รับคำสั่ง -> ตรวจสอบ -> บันทึก
 */
export class AttendanceService {

    // รับ Repository เข้ามา (Dependency Injection)
    // ทำให้เราสลับ Firebase/Supabase/InMemory ได้ง่ายๆ
    constructor(attendanceRepo) {
        this.repo = attendanceRepo;
    }

    /**
     * Use Case: พนักงานกดเข้างาน
     * @param {string} employeeId
     * @param {string} companyId
     * @param {Object} locationData - { lat, lng, address }
     * @param {Date} timestamp
     * @param {Date} shiftStart (Optional) เวลาเริ่มงานสำหรับคำนวณสาย
     * @param {string} shiftDateStr (Optional) Logical Shift Date YYYY-MM-DD
     */
    async clockIn(employeeId, companyId, locationData, timestamp = DateUtils.now(), shiftStart = null, shiftDateStr = null) {
        try {
            // 1. เช็คก่อนว่าวันนี้กดไปหรือยัง? (Prevent Double Clock-in)
            // Query by the resolved shiftDate rather than physical timestamp
            const searchKey = shiftDateStr || timestamp;
            const existingLog = await this.repo.findLatestByEmployee(employeeId, searchKey);
            if (existingLog && !existingLog.clockOut) {
                return Result.fail("คุณมีกะงานที่ยังไม่ได้ออก กรุณากดออกงานก่อน");
            }
            if (existingLog && existingLog.clockOut) {
                // Already finished a shift for this logical day? Maybe allow multiple? Usually 1 shift per day in basic systems.
                // Let's assume 1 shift per shift_date for now, or just check if it exists.
                // Wait, existing logic was: if (existingLog) return fail("คุณได้ลงเวลาเข้างานของวันนี้ไปแล้ว");
                return Result.fail("คุณได้ลงเวลาเข้างานของวันนี้ไปแล้ว");
            }

            // 1.1 คำนวณสาย (ถ้ามีตารางเวลา)
            let lateMinutes = 0;
            let status = 'on-time';

            if (shiftStart) {
                // สร้าง Temp Log เพื่อใช้ Logic คำนวณ (หรือจะเขียน Logic ตรงนี้ก็ได้)
                const tempLog = new AttendanceLog({ clockIn: timestamp });
                lateMinutes = tempLog.getLateMinutes(shiftStart);
                if (lateMinutes > 0) status = 'late';
            }

            // 2. Validate Location ผ่าน Value Object
            const locationOrError = Location.create(locationData);
            if (locationOrError.isFailure) {
                return Result.fail(`GPS Error: ${locationOrError.error}`);
            }

            // 3. สร้าง Domain Entity
            const logOrError = AttendanceLog.create({
                companyId: companyId,
                employeeId: employeeId,
                shiftDate: shiftDateStr || DateUtils.formatDate(timestamp), // Fallback if not provided
                clockIn: timestamp,
                clockInLocation: locationOrError.getValue(),
                status: status,
                lateMinutes: lateMinutes
            });

            if (logOrError.isFailure) {
                return Result.fail(logOrError.error);
            }
            const newLog = logOrError.getValue();

            // 3. บันทึกลง Database (ผ่าน Interface)
            await this.repo.save(newLog);

            // 4. คืนค่าสำเร็จกลับไปให้ UI
            return Result.ok(newLog.toPrimitives());

        } catch (error) {
            console.error(error);
            return Result.fail("System Error: ไม่สามารถบันทึกเวลาได้");
        }
    }

    /**
     * Use Case: พนักงานกดออกงาน
     * @param {string} employeeId
     * @param {Object} locationData - { lat, lng, address }
     * @param {Date} timestamp
     * @param {Date|string} shiftDateStr
     */
    async clockOut(employeeId, locationData, timestamp = DateUtils.now(), shiftDateStr = null) {
        try {
            // 1. หาใบลงเวลาใบเดิมของวันนี้ (ควรหาใบที่ยังไม่ปิด)
            // Ideally should find by generic latest, or we pass shiftDate here too. 
            // In a real scenario, finding the LATEST entry for the employee limit 1 is safest.
            const searchKey = shiftDateStr || timestamp;
            const existingLog = await this.repo.findLatestByEmployee(employeeId, searchKey);

            if (!existingLog) {
                return Result.fail("ไม่พบข้อมูลการเข้างาน กรุณากดเข้างานก่อน");
            }

            if (existingLog.clockOut) {
                return Result.fail("คุณได้ลงเวลาออกงานไปแล้ว");
            }

            // 2. Validate Location
            const locationOrError = Location.create(locationData);
            if (locationOrError.isFailure) {
                return Result.fail(`GPS Error: ${locationOrError.error}`);
            }

            // 3. สั่ง Domain ให้ Clock Out
            const updatedLogOrError = existingLog.markClockOut(timestamp, locationOrError.getValue());

            if (updatedLogOrError.isFailure) {
                return Result.fail(updatedLogOrError.error);
            }
            const finalLog = updatedLogOrError.getValue();

            // 4. บันทึกทับใบเดิม
            await this.repo.save(finalLog);

            // 5. คืนค่า (workMinutes อยู่ใน toPrimitives แล้ว)
            return Result.ok(finalLog.toPrimitives());

            return Result.ok(finalLog.toPrimitives());

        } catch (error) {
            console.error(error);
            return Result.fail("System Error: ไม่สามารถบันทึกเวลาออกได้");
        }
    }

    /**
     * Use Case: ปิดกะที่ค้างอยู่ (Manual Close)
     * @param {string} employeeId 
     * @param {string} logId 
     * @param {Date} manualTime 
     * @param {string} reason 
     */
    async closeStaleShift(employeeId, logId, manualTime, reason) {
        try {
            // 1. หา Log เดิม
            const existingLog = await this.repo.findById(logId);
            if (!existingLog) return Result.fail("ไม่พบรายการลงเวลา");

            if (existingLog.employeeId !== employeeId) return Result.fail("คุณไม่มีสิทธิ์แก้ไขรายการนี้");
            if (existingLog.clockOut) return Result.fail("รายการนี้ถูกปิดไปแล้ว");

            // 2. สั่ง Domain ให้ Manual Close
            const updatedLogOrError = existingLog.markManualClockOut(manualTime, reason);

            if (updatedLogOrError.isFailure) return Result.fail(updatedLogOrError.error);
            const finalLog = updatedLogOrError.getValue();

            // 3. บันทึก
            await this.repo.save(finalLog);

            return Result.ok(finalLog.toPrimitives());

        } catch (error) {
            console.error(error);
            return Result.fail("System Error: ไม่สามารถปิดกะได้");
        }
    }
}