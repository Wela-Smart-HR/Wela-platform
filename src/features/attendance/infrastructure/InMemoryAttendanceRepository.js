import { AttendanceRepository } from '../application/repositories/AttendanceRepository.js';
import { DateUtils } from '../../../shared/kernel/DateUtils.js';

/**
 * In-Memory Database (สำหรับ Test เท่านั้น)
 * ข้อมูลจะหายเมื่อปิดโปรแกรม
 */
export class InMemoryAttendanceRepository extends AttendanceRepository {

    constructor() {
        super();
        this.db = new Map(); // ใช้ Map แทน Database จริง
    }

    async save(attendanceLog) {
        // จำลองการ Save ลง Table
        // เราเก็บ Domain Entity ลงไปตรงๆ เลยเพื่อความง่ายในการเทส
        this.db.set(attendanceLog.id, attendanceLog);
        console.log(`[MockDB] Saved Log: ${attendanceLog.id}`);
    }

    async findById(id) {
        return this.db.get(id) || null;
    }

    async findLatestByEmployee(employeeId, date) {
        // จำลองการ Query: select * from logs where employee_id = ? and business_date = ?
        const logs = Array.from(this.db.values());

        // ✅ ใช้ Business Date เปรียบเทียบกับ date ที่ส่งมา (ไม่ใช่ isToday)
        const targetBusinessDate = DateUtils.getBusinessDate(date);

        const todayLog = logs.find(log =>
            log.employeeId === employeeId &&
            DateUtils.getBusinessDate(log.clockIn).getTime() === targetBusinessDate.getTime()
        );

        return todayLog || null;
    }
}