
import { describe, test, expect } from 'vitest';
import { PayrollCalculator } from '../payroll.calculator';
import { MOCK_EMPLOYEES, MOCK_ATTENDANCE_LOGS, MOCK_COMPANY_CONFIG } from './fixtures/payroll.fixtures';

/** 
 * 🧪 Payroll Simulation Test
 * จำลองการทำงานจริง (Integration Simulation) โดยนำข้อมูล Mock มาผ่าน Calculator
 */
describe('Payroll Simulation (End-to-End Calculation)', () => {

    test('1. Somchai (Monthly): High Salary + Late + OT', () => {
        const emp = MOCK_EMPLOYEES.find(e => e.id === 'emp_monthly_01');
        const logs = MOCK_ATTENDANCE_LOGS.filter(l => l.employee_id === emp.id);

        // 1.1 Aggregate Logs
        const totalLateMinutes = logs.reduce((sum, l) => sum + (l.late_minutes || 0), 0);
        const totalOtHours = logs.reduce((sum, l) => sum + (l.ot_hours || 0), 0);

        // Expectation from Fixtures:
        // - Late: 10 (Grace) + 45 (Exceed) = 55 mins total? 
        //   Wait, Logic applies PER DAY usually for grace?
        //   Repo Logic: "if (log.lateMinutes > 0) totalLateMinutes += log.lateMinutes;"
        //   Calculator Logic: `calculateLateDeduction(totalLateMinutes, config)` -> Calculates on TOTAL?
        //   Re-reading Repository:
        //   It sums `totalLateMinutes`.
        //   Then calls `PayrollCalculator.calculateLateDeduction(totalLateMinutes, deductionConfig)`.
        //   -> So Grace Period logic in Calculator applies to the SUM? 
        //   -> "const mins = Number(lateMinutes); if (mins <= grace) return 0;"
        //   -> This means Grace Period is MONTHLY accumulation grace? 
        //   -> Usually Grace is PER TIME. If Repo sums first, it implies Monthly Grace.
        //   -> Let's assume the Repo logic is correct for now (Monthly Grace).

        expect(totalLateMinutes).toBe(10 + 45); // 55 mins
        expect(totalOtHours).toBe(3);

        // 1.2 Calculate Financials
        const salary = emp.baseSalary; // 50,000
        const dailyRate = salary / 30;
        const hourlyRate = dailyRate / 8;

        // OT Income: 3 hours * 1.5 * Hourly
        const otPay = totalOtHours * hourlyRate * MOCK_COMPANY_CONFIG.payrollConfig.otRate1;

        // Deduction: 55 mins * 5 THB
        // Grace 15 mins. 55 > 15 -> Deduct all.
        const deduction = PayrollCalculator.calculateLateDeduction(totalLateMinutes, MOCK_COMPANY_CONFIG.payrollConfig);

        // SSO: 5% of 15,000 (Max Base 2026 is 17,500?) 
        // Mock Config says maxBase 17,500.
        // 50,000 > 17,500 -> Use 17,500 check calculateSSO logic
        const sso = PayrollCalculator.calculateSSO(salary);

        // Tax: Progressive (Complex, let Calculator handle)
        const tax = PayrollCalculator.calculateTax(salary, sso); // Note: Repo uses annual projection logic inside

        // 1.3 Net Calculation
        const net = PayrollCalculator.calculateNet({
            salary,
            ot: otPay,
            deductions: deduction,
            sso,
            tax
        });

        console.log('Somchai Payment:', { salary, otPay, deduction, sso, tax, net });

        // Assertions
        expect(sso).toBe(875); // 17,500 * 5%
        expect(deduction).toBe(55 * 5); // 275 THB (55 mins * 5)
        expect(net).toBeGreaterThan(0);
    });

    test('2. Somsri (Daily): Work Days', () => {
        const emp = MOCK_EMPLOYEES.find(e => e.id === 'emp_daily_01');
        const logs = MOCK_ATTENDANCE_LOGS.filter(l => l.employee_id === emp.id);

        // Daily Staff gets paid per day worked
        const workDays = logs.filter(l => l.status !== 'absent').length; // Present + Early Leave

        const income = workDays * emp.baseSalary; // 2 days * 500 = 1000

        const sso = PayrollCalculator.calculateSSO(income); // 5% of 1000 = 50 
        // Min Base SSO is 1650?
        // Calculator says: `Decimal.max(cappedBase, 1650)`
        // So base is 1650 -> SSO = 82.5 -> 83

        const net = PayrollCalculator.calculateNet({
            salary: income,
            sso: sso,
            tax: 0
        });

        console.log('Somsri Payment:', { workDays, income, sso, net });

        expect(income).toBe(1000);
        expect(sso).toBe(82); // Min base triggered
        expect(net).toBe(1000 - 82);
    });

});
