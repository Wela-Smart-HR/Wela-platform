// Simple check script that doesn't require Firebase config
// Just shows the structure of the problem

const COMPANIES_TO_CHECK = ['comp_1764954200820', 'COMP-1768062566486'];

console.log('=== Attendance Data Structure Analysis ===');
console.log('Companies to check:', COMPANIES_TO_CHECK);
console.log('');

console.log('Expected structure in attendance_logs collection:');
console.log({
  company_id: "comp_xxx",
  employee_id: "user_xxx", 
  shift_date: "2026-02-23", // ← This field is the issue
  clock_in: "2026-02-23T09:04:59.853Z",
  clock_out: null,
  status: "late"
});

console.log('');
console.log('Possible issues:');
console.log('1. Some documents have shift_date: "2026-02-23"');
console.log('2. Some documents have shift_date: null or missing');
console.log('3. Some documents might have different date format');

console.log('');
console.log('To fix this, we need to:');
console.log('1. Check which company has missing shift_date');
console.log('2. Run migration script to fix the missing data');
console.log('3. Verify all documents have consistent structure');

// Since we can't access Firebase directly without proper env setup,
// let's create a manual check approach
console.log('');
console.log('=== Manual Check Required ===');
console.log('Please check in Firebase Console:');
console.log('1. Go to attendance_logs collection');
console.log('2. Filter by company_id: "comp_1764954200820"');
console.log('3. Check if documents have shift_date field');
console.log('4. Repeat for company_id: "COMP-1768062566486"');
console.log('5. Compare the results');
