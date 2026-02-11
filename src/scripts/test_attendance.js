import { AttendanceLog } from '../features/attendance/domain/AttendanceLog.js';
import { DateUtils } from '../shared/kernel/DateUtils.js';

// Helper function to print results synchronously
const printResult = (title, result) => {
    console.log(`\n--- Test Case: ${title} ---`);
    if (result.isFailure) {
        console.log(`❌ Failed: ${result.error}`); // Use log instead of error to keep order
        return null;
    } else {
        console.log("✅ Success!");
        return result.getValue();
    }
};

const runTests = () => {
    console.log("Starting Attendance Tests...");

    // ==========================================
    // SCENARIO 1: Normal Case (Early)
    // ==========================================
    const shiftStart = new Date("2024-02-14T09:00:00");
    const earlyCheckIn = new Date("2024-02-14T08:55:00");

    const log1 = printResult("1. Normal Check-in (08:55)", AttendanceLog.create({
        employeeId: "EMP-001",
        clockIn: earlyCheckIn
    }));

    if (log1) {
        console.log(`   Clock In: ${DateUtils.format(log1.clockIn)}`);
        console.log(`   Late Minutes: ${log1.getLateMinutes(shiftStart)} minutes (Expected: 0)`);
    }

    // ==========================================
    // SCENARIO 2: Late Case
    // ==========================================
    const lateCheckIn = new Date("2024-02-14T09:15:00");

    const log2 = printResult("2. Late Check-in (09:15)", AttendanceLog.create({
        employeeId: "EMP-002",
        clockIn: lateCheckIn
    }));

    if (log2) {
        console.log(`   Clock In: ${DateUtils.format(log2.clockIn)}`);
        console.log(`   Late Minutes: ${log2.getLateMinutes(shiftStart)} minutes (Expected: 15)`);
    }

    // ==========================================
    // SCENARIO 3: Error Case (Out < In)
    // ==========================================
    const checkIn = new Date("2024-02-14T09:00:00");
    const invalidCheckOut = new Date("2024-02-14T08:00:00");

    printResult("3. Invalid Clock-out (Before Clock-in)", AttendanceLog.create({
        employeeId: "EMP-003",
        clockIn: checkIn,
        clockOut: invalidCheckOut
    }));

    console.log("\nTests Completed.");
};

runTests();