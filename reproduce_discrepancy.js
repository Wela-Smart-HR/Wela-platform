
// Simulate the Discrepancy

const storedData = "2026-02-10T12:59:00.000Z"; // Hypothesis: Stored incorrectly as UTC face-value

// 1. Employee App (Mobile BKK) logic
const dateObj = new Date(storedData);
const appDisplay = dateObj.toLocaleTimeString('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
});
console.log(`[Mobile Log] Stored: ${storedData} -> Display (BKK): ${appDisplay}`);
// Expected: 19:59

// 2. Payroll Logic (Admin generating Cycle on UTC machine or stripping TZ)
// Assuming Admin uses toLocaleTimeString WITHOUT timeZone option on a UTC server
// OR extracting substring
const adminDateObj = new Date(storedData);
const adminDisplay = adminDateObj.toISOString().split('T')[1].slice(0, 5);
console.log(`[Payroll View] Stored: ${storedData} -> Display (UTC/Raw): ${adminDisplay}`);
// Expected: 12:59

// Conclusion
// If outputs match 19:59 and 12:59, hypothesis is confirmed.
