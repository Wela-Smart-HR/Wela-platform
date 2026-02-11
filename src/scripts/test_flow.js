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
    console.log("1️⃣  Attempting Clock In (Late Scenario)...");
    const locationIn = { lat: 13.7563, lng: 100.5018, address: "Bangkok" };

    // Simulate Shift Start at 09:00
    const shiftStart = new Date();
    shiftStart.setHours(9, 0, 0, 0);

    // Simulate Clock In at 09:15 (Late)
    const clockInTime = new Date();
    clockInTime.setHours(9, 15, 0, 0);

    // Pass timestamp and shiftStart
    const resultIn = await service.clockIn(empId, locationIn, clockInTime, shiftStart);

    if (resultIn.isSuccess) {
        const val = resultIn.getValue();
        console.log("✅ Clock In Success:", val);

        if (val.status === 'late' && val.late_minutes === 15) {
            console.log("✅ Lateness Calculated Correctly (15 mins late)");
        } else {
            console.error("❌ Lateness Calculation Failed:", val.status, val.late_minutes);
        }
    } else {
        console.error("❌ Clock In Failed:", resultIn.error);
    }

    // --- CASE 2: กดเข้างานซ้ำ (Double Clock In) ---
    console.log("\n2️⃣  Attempting Duplicate Clock In...");
    const resultDup = await service.clockIn(empId, locationIn);

    if (resultDup.isFailure) {
        console.log("✅ System prevented duplicate:", resultDup.error);
    } else {
        console.error("❌ System failed to prevent duplicate!");
    }

    // --- CASE 3: กดออกงาน (Clock Out) ---
    console.log("\n3️⃣  Attempting Clock Out...");

    // แกล้งหน่วงเวลาสักนิด (ใน Code จริงมันคือเวลาปัจจุบัน)
    const locationOut = { lat: 13.7565, lng: 100.5020, address: "Bangkok Exit" };
    const resultOut = await service.clockOut(empId, locationOut);

    if (resultOut.isSuccess) {
        const val = resultOut.getValue();
        console.log("✅ Clock Out Success:", val);
        if (val.clock_out_location && val.clock_out_location.address === "Bangkok Exit") {
            console.log("✅ Clock Out Location Correctly Saved:", val.clock_out_location);
        } else {
            console.error("❌ Clock Out Location Missing or Incorrect:", val.clock_out_location);
        }
    } else {
        console.error("❌ Clock Out Failed:", resultOut.error);
    }
}

runTest();