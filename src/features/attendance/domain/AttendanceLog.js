import { Result } from '../../../shared/kernel/Result.js';
import { Guard } from '../../../shared/kernel/Guard.js';
import { DateUtils } from '../../../shared/kernel/DateUtils.js';
import { IdGenerator } from '../../../shared/kernel/IdGenerator.js';

/**
 * AttendanceLog Entity
 * หัวใจสำคัญของการลงเวลา เก็บ "ความจริง" (Fact) ของการเข้า-ออกงาน
 */
export class AttendanceLog {

    constructor(props) {
        this.props = props;
        Object.freeze(this); // ทำให้แก้ไขค่าตรงๆ ไม่ได้ (Immutability)
    }

    /**
     * Factory Method: สร้าง Object และ Validate กฎเหล็ก
     * เราจะไม่ใช้ new AttendanceLog() ตรงๆ แต่จะผ่าน function นี้เพื่อความปลอดภัย
     */
    static create(props) {
        // 1. เรียก รปภ. (Guard) ตรวจข้อมูลพื้นฐาน
        const guardResult = Guard.combine([
            Guard.againstNullOrUndefined(props.employeeId, 'Employee ID'),
            Guard.againstNullOrUndefined(props.clockIn, 'Clock In Time')
        ]);

        if (guardResult.isFailure) {
            return Result.fail(guardResult.error);
        }

        // 2. ถ้าไม่มี ID ให้สร้างใหม่ (กรณี New Record)
        const id = props.id || IdGenerator.newId();

        // 3. กฎ: เวลาออกงาน ต้องไม่อยู่ก่อนเวลาเข้างาน
        if (props.clockOut) {
            const duration = DateUtils.diffInMinutes(props.clockIn, props.clockOut);
            if (duration < 0) {
                return Result.fail("Clock-out time cannot be before Clock-in time");
            }
        }

        // 4. สร้าง Object สำเร็จ
        return Result.ok(new AttendanceLog({
            ...props,
            id: id
        }));
    }

    // --- Business Logic (สูตรคำนวณฝังในตัว) ---

    /**
     * คำนวณว่าสายกี่นาที (On-the-fly calculation)
     * @param {Date} shiftStart เวลาเริ่มงานตามกะ (เช่น 09:00)
     * @returns {number} จำนวนนาทีที่สาย (ถ้าไม่สายจะได้ 0)
     */
    getLateMinutes(shiftStart) {
        if (!shiftStart) return 0;

        // ถ้าเข้างานก่อนหรือตรงเวลา = ไม่สาย
        if (this.props.clockIn <= shiftStart) return 0;

        return DateUtils.diffInMinutes(shiftStart, this.props.clockIn);
    }

    /**
     * คำนวณชั่วโมงทำงานจริง (นาที)
     */
    getWorkDurationMinutes() {
        if (!this.props.clockOut) return 0;
        return DateUtils.diffInMinutes(this.props.clockIn, this.props.clockOut);
    }

    /**
     * สั่ง Clock Out (สร้าง Instance ใหม่ที่มีเวลาออกงาน)
     * @param {Date} time เวลาที่กดออกงาน
     */
    /**
     * สั่ง Clock Out (สร้าง Instance ใหม่ที่มีเวลาออกงาน)
     * @param {Date} time เวลาที่กดออกงาน
     */
    markClockOut(time) {
        // ใช้ create เพื่อ validate เวลาซ้ำอีกรอบ
        return AttendanceLog.create({
            ...this.props,
            clockOut: time
        });
    }

    // --- Getters ---
    get id() { return this.props.id; }
    get employeeId() { return this.props.employeeId; }
    get clockIn() { return this.props.clockIn; }
    get clockOut() { return this.props.clockOut; }

    /**
     * แปลงข้อมูลกลับเป็น Plain Object เพื่อบันทึกลง Database
     */
    toPrimitives() {
        return {
            id: this.props.id,
            employee_id: this.props.employeeId, // Snake case สำหรับ DB
            clock_in: this.props.clockIn,
            clock_out: this.props.clockOut || null
        };
    }
}