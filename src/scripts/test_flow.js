import { AttendanceService } from '../features/attendance/application/AttendanceService.js';
import { InMemoryAttendanceRepository } from '../features/attendance/infrastructure/InMemoryAttendanceRepository.js';

// 1. Setup (เตรียมระบบ)
// เสียบปลั๊ก InMemoryRepo เข้าไปใน Service (Dependency Injection)
const mockRepo = new InMemoryAttendanceRepository();
const service = new AttendanceService(mockRepo);

async function runTest() {
    console.log("🚀 Starting Attendance System Test...\n");

    const empId = "EMP-999";

    // --- CASE 1: กดเข้างาน (Clock In) ---
    console.log("1️⃣  Attempting Clock In...");
    const resultIn = await service.clockIn(empId);

    if (resultIn.isSuccess) {
        console.log("✅ Clock In Success:", resultIn.getValue());
    } else {
        console.error("❌ Clock In Failed:", resultIn.error);
    }

    // --- CASE 2: กดเข้างานซ้ำ (Double Clock In) ---
    console.log("\n2️⃣  Attempting Duplicate Clock In...");
    const resultDup = await service.clockIn(empId);

    if (resultDup.isFailure) {
        console.log("✅ System prevented duplicate:", resultDup.error);
    } else {
        console.error("❌ System failed to prevent duplicate!");
    }

    // --- CASE 3: กดออกงาน (Clock Out) ---
    console.log("\n3️⃣  Attempting Clock Out...");

    // แกล้งหน่วงเวลาสักนิด (ใน Code จริงมันคือเวลาปัจจุบัน)
    const resultOut = await service.clockOut(empId);

    if (resultOut.isSuccess) {
        console.log("✅ Clock Out Success:", resultOut.getValue());
    } else {
        console.error("❌ Clock Out Failed:", resultOut.error);
    }
}

runTest();