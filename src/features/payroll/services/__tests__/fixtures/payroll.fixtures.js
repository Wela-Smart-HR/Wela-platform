
/**
 * 🏭 Standard Payroll Mock Data Fixtures
 * 
 * ชุดข้อมูลจำลองสำหรับทดสอบการคำนวณเงินเดือนแบบครบวงจร (End-to-End Payroll Test)
 * ครอบคลุมเคส:
 * 1. พนักงานรายเดือน (Monthly) - มาสาย, OT, ขาดงาน
 * 2. พนักงานรายวัน (Daily) - ทำงานปกติ, วันหยุด
 * 3. พนักงานกะดึก (Night Shift) - ข้ามวัน
 * 4. พนักงานลาออกระหว่างเดือน (Resigned)
 */

export const MOCK_COMPANY_CONFIG = {
    payrollConfig: {
        cutoffDate: 25,          // ตัดรอบวันที่ 25
        paymentDate: 30,         // จ่ายเงินวันที่ 30
        otRate1: 1.5,            // OT วันธรรมดา
        otRate2: 3.0,            // OT วันหยุด
        deductionPerMinute: 5,   // หักสายนาทีละ 5 บาท
        maxDeduction: 500,       // หักสูงสุด 500 บาท
        gracePeriod: 15          // อนุโลมสาย 15 นาที
    },
    ssoConfig: {
        rate: 0.05,
        minBase: 1650,
        maxBase: 17500           // เพดานใหม่ 2026
    }
};

export const MOCK_EMPLOYEES = [
    {
        id: 'emp_monthly_01',
        name: 'Somchai Manager',
        role: 'manager',
        salaryType: 'monthly',
        baseSalary: 50000,
        deductionProfile: 'sso_tax', // หัก SSO + Tax
        department: 'Management',
        active: true
    },
    {
        id: 'emp_daily_01',
        name: 'Somsri Staff',
        role: 'staff',
        salaryType: 'daily',
        baseSalary: 500,        // วันละ 500
        deductionProfile: 'sso', // หัก SSO อย่างเดียว
        department: 'Operations',
        active: true
    },
    {
        id: 'emp_shift_01',
        name: 'Somboon Security',
        role: 'security',
        salaryType: 'monthly',
        baseSalary: 18000,
        deductionProfile: 'none',
        department: 'Security',
        active: true,
        shiftType: 'night'      // กะดึก
    }
];

// 📅 Mock Attendance Logs based on 'attendance_logs' collection structure
// Period: 2026-02-01 to 2026-02-28
export const MOCK_ATTENDANCE_LOGS = [
    // ----------------------------------------------------
    // 1. Somchai (Monthly) - Standard & Late Scenarios
    // Schedule: 09:00 - 18:00
    // ----------------------------------------------------

    // ✅ Case 1: On Base Time (09:00 - 18:00)
    {
        employee_id: 'emp_monthly_01',
        clock_in: '2026-02-02T09:00:00.000Z',
        clock_out: '2026-02-02T18:00:00.000Z',
        status: 'present',
        late_minutes: 0,
        ot_hours: 0,
        notes: 'Normal working day'
    },

    // ⚠️ Case 2: Late but within Grace Period (09:10 - 18:00) -> Late 10 mins (Grace 15)
    // Result: No deduction
    {
        employee_id: 'emp_monthly_01',
        clock_in: '2026-02-03T09:10:00.000Z',
        clock_out: '2026-02-03T18:00:00.000Z',
        status: 'late',
        late_minutes: 10,
        ot_hours: 0,
        notes: 'Late within grace period'
    },

    // ❌ Case 3: Late Exceeding Grace (09:45 - 18:00) -> Late 45 mins
    // Result: Deduct 45 * 5 = 225 THB
    {
        employee_id: 'emp_monthly_01',
        clock_in: '2026-02-04T09:45:00.000Z',
        clock_out: '2026-02-04T18:00:00.000Z',
        status: 'late',
        late_minutes: 45,
        ot_hours: 0,
        notes: 'Late exceeding grace'
    },

    // 💰 Case 4: OT Work (09:00 - 21:00) -> OT 3 Hours
    // Result: OT Pay = (50000/30/8) * 1.5 * 3
    {
        employee_id: 'emp_monthly_01',
        clock_in: '2026-02-05T09:00:00.000Z',
        clock_out: '2026-02-05T21:00:00.000Z',
        status: 'present',
        late_minutes: 0,
        ot_hours: 3,
        notes: 'Overtime work'
    },

    // ----------------------------------------------------
    // 2. Somsri (Daily 500 THB) - No Work No Pay logic
    // Schedule: 08:00 - 17:00
    // ----------------------------------------------------

    // ✅ Case 1: Full Day Work
    // Result: +500 THB
    {
        employee_id: 'emp_daily_01',
        clock_in: '2026-02-02T08:00:00.000Z',
        clock_out: '2026-02-02T17:00:00.000Z',
        status: 'present',
        late_minutes: 0,
        ot_hours: 0
    },

    // ❌ Case 2: Half Day / Early Leave (No Pay if rule strict? or Pay half?)
    // Usually Daily pays per "Day" present unless Hourly.
    // Assuming 1 record = 1 Day Wage in current repo logic.
    {
        employee_id: 'emp_daily_01',
        clock_in: '2026-02-03T08:00:00.000Z',
        clock_out: '2026-02-03T12:00:00.000Z',
        status: 'early_leave', // Repo counts 'present' or 'late' as workday
        late_minutes: 0,
        ot_hours: 0
    },

    // ----------------------------------------------------
    // 3. Somboon (Night Shift) - Cross Day
    // Schedule: 22:00 (Day 1) - 06:00 (Day 2)
    // ----------------------------------------------------

    // 🌙 Case 1: Night Shift Normal
    // In: 2026-02-06 22:00
    // Out: 2026-02-07 06:00
    // Should count for Date of "In" (Feb 6)
    {
        employee_id: 'emp_shift_01',
        clock_in: '2026-02-06T22:00:00.000Z',
        clock_out: '2026-02-07T06:00:00.000Z',
        status: 'present',
        late_minutes: 0,
        ot_hours: 0,
        notes: 'Night shift cross-day'
    },

    // 🌙 Case 2: Night Shift Late
    // In: 2026-02-07 22:30 (Late 30 mins)
    // Out: 2026-02-08 06:00
    {
        employee_id: 'emp_shift_01',
        clock_in: '2026-02-07T22:30:00.000Z',
        clock_out: '2026-02-08T06:00:00.000Z',
        status: 'late',
        late_minutes: 30,
        ot_hours: 0,
        notes: 'Night shift late'
    }
];
