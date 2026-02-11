import { Result } from '../../../shared/kernel/Result.js';
import { Guard } from '../../../shared/kernel/Guard.js';
import { DateUtils } from '../../../shared/kernel/DateUtils.js';
import { IdGenerator } from '../../../shared/kernel/IdGenerator.js';
import { Location } from './value-objects/Location.js';

/**
 * AttendanceLog Entity (Session Model)
 * 1 แถว = 1 กะการทำงาน (มีทั้ง clock_in + clock_out ในตัว)
 * 
 * Props:
 * - id, companyId, employeeId
 * - clockIn (Date), clockOut (Date|null)
 * - clockInLocation (Location|null), clockOutLocation (Location|null)
 * - status ('on-time'|'late'|'adjusted'), lateMinutes (number)
 */
export class AttendanceLog {

    constructor(props) {
        this.props = props;
        Object.freeze(this);
    }

    /**
     * Factory Method: สร้าง Object และ Validate กฎเหล็ก
     */
    static create(props) {
        // 1. Guard: ตรวจข้อมูลพื้นฐาน
        const guardResult = Guard.combine([
            Guard.againstNullOrUndefined(props.employeeId, 'Employee ID'),
            Guard.againstNullOrUndefined(props.clockIn, 'Clock In Time')
        ]);

        if (guardResult.isFailure) {
            return Result.fail(guardResult.error);
        }

        // 2. Auto-generate ID ถ้าไม่มี
        const id = props.id || IdGenerator.newId();

        // 3. กฎ: เวลาออกงานต้องไม่อยู่ก่อนเวลาเข้างาน
        if (props.clockOut) {
            const duration = DateUtils.diffInMinutes(props.clockIn, props.clockOut);
            if (duration < 0) {
                return Result.fail("Clock-out time cannot be before Clock-in time");
            }
        }

        // 4. สร้าง Object สำเร็จ
        return Result.ok(new AttendanceLog({
            ...props,
            id: id,
            // Normalize: ถ้าส่ง location มาแบบ plain object ให้แปลงเป็น Location VO
            // แต่ถ้าเป็น Location instance อยู่แล้ว ก็ใช้ตรงๆ
            clockInLocation: props.clockInLocation instanceof Location
                ? props.clockInLocation
                : (props.clockInLocation ? Location.fromPersistence(props.clockInLocation) : null),
            clockOutLocation: props.clockOutLocation instanceof Location
                ? props.clockOutLocation
                : (props.clockOutLocation ? Location.fromPersistence(props.clockOutLocation) : null),
        }));
    }

    // --- Business Logic ---

    /**
     * คำนวณว่าสายกี่นาที
     * @param {Date} shiftStart เวลาเริ่มงานตามกะ
     * @returns {number} จำนวนนาทีที่สาย (0 = ไม่สาย)
     */
    getLateMinutes(shiftStart) {
        if (!shiftStart) return 0;
        if (this.props.clockIn <= shiftStart) return 0;
        return DateUtils.diffInMinutes(shiftStart, this.props.clockIn);
    }

    /**
     * คำนวณชั่วโมงทำงานจริง (นาที)
     * @returns {number} 0 ถ้ายังไม่ clock out
     */
    getWorkDurationMinutes() {
        if (!this.props.clockOut) return 0;
        return DateUtils.diffInMinutes(this.props.clockIn, this.props.clockOut);
    }

    /**
     * สั่ง Clock Out (สร้าง Instance ใหม่ — Immutable Pattern)
     * @param {Date} time เวลาที่กดออกงาน
     * @param {Location|Object|null} location พิกัดที่กดออกงาน
     */
    markClockOut(time, location = null) {
        return AttendanceLog.create({
            ...this.props,
            clockOut: time,
            clockOutLocation: location
        });
    }

    // --- Getters ---
    get id() { return this.props.id; }
    get companyId() { return this.props.companyId; }
    get employeeId() { return this.props.employeeId; }
    get clockIn() { return this.props.clockIn; }
    get clockOut() { return this.props.clockOut; }
    get clockInLocation() { return this.props.clockInLocation; }
    get clockOutLocation() { return this.props.clockOutLocation; }
    get status() { return this.props.status; }
    get lateMinutes() { return this.props.lateMinutes; }
    get workMinutes() { return this.getWorkDurationMinutes(); }

    /**
     * แปลงเป็น Plain Object สำหรับ Database
     */
    toPrimitives() {
        return {
            id: this.props.id,
            company_id: this.props.companyId,
            employee_id: this.props.employeeId,
            clock_in: this.props.clockIn,
            clock_out: this.props.clockOut || null,
            clock_in_location: this.props.clockInLocation?.toPrimitives() || null,
            clock_out_location: this.props.clockOutLocation?.toPrimitives() || null,
            status: this.props.status || 'on-time',
            late_minutes: this.props.lateMinutes || 0,
            work_minutes: this.getWorkDurationMinutes()
        };
    }
}