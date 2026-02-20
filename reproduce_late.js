
import { AttendanceLog } from './src/features/attendance/domain/AttendanceLog.js';
import { DateUtils } from './src/shared/kernel/DateUtils.js';

// Simulate the scenario
// Schedule: 12:00
// Clock In: 12:59

const today = new Date();
today.setHours(12, 0, 0, 0); // 12:00:00
const shiftStart = new Date(today);

const clockInTime = new Date(today);
clockInTime.setHours(12, 59, 0, 0); // 12:59:00

console.log('--- Debug Scenario ---');
console.log('Shift Start:', shiftStart.toISOString());
console.log('Clock In   :', clockInTime.toISOString());

// 1. Direct Utils Check
const diff = DateUtils.diffInMinutes(shiftStart, clockInTime);
console.log('DateUtils.diffInMinutes:', diff);

// 2. Domain Logic Check
const logOrError = AttendanceLog.create({
    employeeId: 'debug_user',
    clockIn: clockInTime,
    companyId: 'comp_1'
});

if (logOrError.isFailure) {
    console.error('Failed to create log:', logOrError.error);
} else {
    const log = logOrError.getValue();
    const lateMinutes = log.getLateMinutes(shiftStart);
    console.log('AttendanceLog.getLateMinutes:', lateMinutes);
}
