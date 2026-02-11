/**
 * Abstract Class: AttendanceRepository
 * นี่คือ "สัญญาใจ" (Contract) ว่า Database ต้องทำอะไรได้บ้าง
 * ห้ามแก้ Logic ในนี้ นี่เป็นแค่แม่แบบ
 */
export class AttendanceRepository {

    /**
     * บันทึกข้อมูลลง DB
     * @param {AttendanceLog} attendanceLog 
     * @returns {Promise<void>}
     */
    async save(attendanceLog) {
        throw new Error("Method 'save()' must be implemented.");
    }

    /**
     * ค้นหาตาม ID
     * @param {string} id 
     * @returns {Promise<AttendanceLog | null>}
     */
    async findById(id) {
        throw new Error("Method 'findById()' must be implemented.");
    }

    /**
     * หาข้อมูลการลงเวลาล่าสุดของพนักงานในวันนี้ (เพื่อเช็คว่า Clock In ไปยัง)
     * @param {string} employeeId 
     * @param {Date} date 
     * @returns {Promise<AttendanceLog | null>}
     */
    async findLatestByEmployee(employeeId, date) {
        throw new Error("Method 'findLatestByEmployee()' must be implemented.");
    }
}