import { AttendanceLog } from '../features/attendance/domain/AttendanceLog.js';
import { DateUtils } from '../shared/kernel/DateUtils.js';

// Helper function เพื่อโชว์ผลลัพธ์สวยๆ
const printResult = (title, result) => {
    console.log(`\n--- Test Case: ${title} ---`);
    if (result.isFailure) {
        console.error("❌ Failed:", result.error);
    } else {
        console.log("✅ Success!");
        return result.getValue(); // คืนค่า Object ข้างในออกมา
    }
};

// ==========================================
// SCENARIO 1: พนักงานมาเช้า (Normal Case)
// ==========================================
const shiftStart = new Date("2024-02-14T09:00:00"); // กะเข้า 9 โมง
const earlyCheckIn = new Date("2024-02-14T08:55:00"); // มา 8:55

const log1 = printResult("1. มาทำงานเช้า", AttendanceLog.create({
    employeeId: "EMP-001",
    clockIn: earlyCheckIn
}));

if (log1) {
    console.log(`   Clock In: ${DateUtils.format(log1.clockIn)}`);
    console.log(`   Late Minutes: ${log1.getLateMinutes(shiftStart)} นาที (ควรเป็น 0)`);
}

// ==========================================
// SCENARIO 2: พนักงานมาสาย (Late Case)
// ==========================================
const lateCheckIn = new Date("2024-02-14T09:15:00"); // มา 9:15

const log2 = printResult("2. มาทำงานสาย", AttendanceLog.create({
    employeeId: "EMP-002",
    clockIn: lateCheckIn
}));

if (log2) {
    console.log(`   Clock In: ${DateUtils.format(log2.clockIn)}`);
    console.log(`   Late Minutes: ${log2.getLateMinutes(shiftStart)} นาที (ควรเป็น 15)`);
}

// ==========================================
// SCENARIO 3: ข้อมูลผิดพลาด (Error Case)
// ==========================================
const checkIn = new Date("2024-02-14T09:00:00");
const invalidCheckOut = new Date("2024-02-14T08:00:00"); // ออกก่อนเข้า! (เป็นไปไม่ได้)

printResult("3. เวลาออกงานผิด (ClockOut < ClockIn)", AttendanceLog.create({
    employeeId: "EMP-003",
    clockIn: checkIn,
    clockOut: invalidCheckOut
}));