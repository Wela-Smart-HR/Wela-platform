import { describe, test, expect } from 'vitest';
import { PayrollCalculator } from '../payroll.calculator';

describe('PayrollCalculator.calculateNet', () => {

    test('Basic Salary: Net = Salary - Deduction - SSO - Tax', () => {
        const input = {
            salary: 20000,
            ot: 0,
            incentive: 0,
            deductions: 500, // Late/Absent
            sso: 750,
            tax: 0
        };

        // 20,000 - 500 - 750 = 18,750
        const net = PayrollCalculator.calculateNet(input);
        expect(net).toBe(18750);
    });

    test('With OT and Incentive', () => {
        const input = {
            salary: 15000,
            ot: 2000,
            incentive: 1000, // Total Income = 18,000
            deductions: 0,
            sso: 750,
            tax: 100 // Total Deduct = 850
        };

        // 18,000 - 850 = 17,150
        const net = PayrollCalculator.calculateNet(input);
        expect(net).toBe(17150);
    });

    test('With Custom Income Items', () => {
        const input = {
            salary: 10000,
            customIncomes: [
                { amount: 500 }, // Travel
                { amount: 300 }  // Food
            ]
        };

        // 10,000 + 500 + 300 = 10,800
        const net = PayrollCalculator.calculateNet(input);
        expect(net).toBe(10800);
    });

    test('With Custom Deduction Items', () => {
        const input = {
            salary: 10000,
            customDeducts: [
                { amount: 1000 }, // Loan
                { amount: 200 }   // Uniform
            ]
        };

        // 10,000 - 1,200 = 8,800
        const net = PayrollCalculator.calculateNet(input);
        expect(net).toBe(8800);
    });

    test('Mixed Complete Scenario', () => {
        const input = {
            salary: 30000,
            ot: 5000,
            incentive: 2000,
            customIncomes: [{ amount: 1000 }],
            // Total Income = 38,000

            deductions: 1000, // Absent
            sso: 750,
            tax: 500,
            customDeducts: [{ amount: 2000 }],
            // Total Deduct = 4,250
        };

        // 38,000 - 4,250 = 33,750
        expect(PayrollCalculator.calculateNet(input)).toBe(33750);
    });

    test('Edge Case: All Zeros', () => {
        expect(PayrollCalculator.calculateNet({})).toBe(0);
        expect(PayrollCalculator.calculateNet({ salary: 0, sso: 0 })).toBe(0);
    });

    test('Edge Case: Result should not be negative (?)', () => {
        // Depends on requirement, but usually net shouldn't be negative on payslip
        // The calculator uses simple math currently. 
        // If logic changes to Math.max(0, ...), update this test.

        const input = {
            salary: 5000,
            customDeducts: [{ amount: 6000 }]
        };

        // Current implementation: 5000 - 6000 = -1000
        expect(PayrollCalculator.calculateNet(input)).toBe(-1000);
    });

    test('Floating Point Precision Check', () => {
        // 0.1 + 0.2 = 0.3 test inside
        const input = {
            salary: 10000.10,
            ot: 2000.20 // 12000.30
        };
        expect(PayrollCalculator.calculateNet(input)).toBe(12000.30);
    });
});
