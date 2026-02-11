import { AttendanceService } from '../features/attendance/application/AttendanceService.js';
import { FirebaseAttendanceRepository } from '../features/attendance/infrastructure/FirebaseAttendanceRepository.js';
// import { InMemoryAttendanceRepository } from '../features/attendance/infrastructure/InMemoryAttendanceRepository.js';

// 1. เลือก Repository ที่ต้องการใช้ (สลับบรรทัด comment ได้เลย)
export const attendanceRepo = new FirebaseAttendanceRepository();
// const attendanceRepo = new InMemoryAttendanceRepository(); // ใช้ตัวนี้ถ้าอยากเทสโดยไม่ต่อเน็ต

// 2. สร้าง Service Singleton (มีตัวเดียวทั้งแอพ)
export const attendanceService = new AttendanceService(attendanceRepo);