import { AttendanceLog } from '../domain/AttendanceLog.js';
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
     */
    async clockIn(employeeId, location, timestamp = DateUtils.now()) {
        try {
            // 1. เช็คก่อนว่าวันนี้กดไปหรือยัง? (Prevent Double Clock-in)
            // Note: เช็คจาก timestamp ที่ส่งมา (เผื่อเป็น offline data ของเมื่อวาน)
            const existingLog = await this.repo.findLatestByEmployee(employeeId, timestamp);
            if (existingLog) {
                return Result.fail("คุณได้ลงเวลาเข้างานของวันนี้ไปแล้ว");
            }

            // 2. สร้าง Domain Entity (ใช้ Factory Method ที่เราทำไว้)
            const logOrError = AttendanceLog.create({
                employeeId: employeeId,
                clockIn: timestamp,
                location: location
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
     */
    async clockOut(employeeId, location, timestamp = DateUtils.now()) {
        try {
            // 1. หาใบลงเวลาใบเดิมของวันนี้
            const existingLog = await this.repo.findLatestByEmployee(employeeId, timestamp);

            if (!existingLog) {
                return Result.fail("ไม่พบข้อมูลการเข้างาน กรุณากดเข้างานก่อน");
            }

            if (existingLog.clockOut) {
                return Result.fail("คุณได้ลงเวลาออกงานไปแล้ว");
            }

            // 2. สั่ง Domain ให้ Clock Out (คำนวณเวลาอัตโนมัติในตัว)
            const updatedLogOrError = existingLog.markClockOut(timestamp, location);

            if (updatedLogOrError.isFailure) {
                return Result.fail(updatedLogOrError.error);
            }
            const finalLog = updatedLogOrError.getValue();

            // 3. บันทึกทับใบเดิม
            await this.repo.save(finalLog);

            // 4. คืนค่าพร้อมระยะเวลาทำงาน (Work Duration)
            return Result.ok({
                ...finalLog.toPrimitives(),
                workMinutes: finalLog.getWorkDurationMinutes()
            });

        } catch (error) {
            console.error(error);
            return Result.fail("System Error: ไม่สามารถบันทึกเวลาออกได้");
        }
    }
}