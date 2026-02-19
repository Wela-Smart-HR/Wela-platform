import { describe, test, expect, vi } from 'vitest';
import { PayrollCalculator } from '../payroll.calculator';

// Simulate Form Logic from usePayrollForm
// We allow injection of PayrollCalculator for testing interactions

// Mock Calculator
vi.mock('../payroll.calculator', () => ({
    PayrollCalculator: {
        calculateSSO: vi.fn(),
        calculateTax: vi.fn()
    }
}));

const calculateTaxAndSSO = (currentForm, currentConfig) => {
    const salary = Number(currentForm.salary) || 0;
    const totalIncome = salary + (Number(currentForm.ot) || 0) + (Number(currentForm.incentive) || 0);

    let sso = 0;
    if (currentConfig.enableSSO) {
        sso = PayrollCalculator.calculateSSO(salary);
    }

    let tax = 0;
    if (currentConfig.taxMode === 'progressive') {
        tax = PayrollCalculator.calculateTax(totalIncome, sso);
    } else if (currentConfig.taxMode === 'flat3') {
        tax = totalIncome * 0.03;
    }

    return { sso, tax };
};

describe('Payroll Form Logic & Profile Mapping', () => {

    // ----------------------------------------------------
    // 1. Profile Logic
    // ----------------------------------------------------
    describe('Deduction Profile Logic', () => {

        test('Standard Profile (SSO + Progressive Tax)', () => {
            // Mock returns
            PayrollCalculator.calculateSSO.mockReturnValue(750);
            PayrollCalculator.calculateTax.mockReturnValue(500);

            const config = { enableSSO: true, taxMode: 'progressive' };
            const form = { salary: 15000, ot: 0 };

            const result = calculateTaxAndSSO(form, config);

            expect(PayrollCalculator.calculateSSO).toHaveBeenCalledWith(15000);
            expect(PayrollCalculator.calculateTax).toHaveBeenCalledWith(15000, 750);
            expect(result.sso).toBe(750);
            expect(result.tax).toBe(500);
        });

        test('Contract Profile (No SSO + Flat 3% Tax)', () => {
            const config = { enableSSO: false, taxMode: 'flat3' };
            const form = { salary: 20000, ot: 0 };

            // Should NOT call SSO calc
            PayrollCalculator.calculateSSO.mockClear();

            const result = calculateTaxAndSSO(form, config);

            expect(PayrollCalculator.calculateSSO).not.toHaveBeenCalled();
            expect(result.sso).toBe(0);

            // Flat 3%: 20000 * 0.03 = 600
            expect(result.tax).toBe(600);
        });

        test('None Profile (Full Pay)', () => {
            const config = { enableSSO: false, taxMode: 'none' };
            const form = { salary: 50000 };

            const result = calculateTaxAndSSO(form, config);

            expect(result.sso).toBe(0);
            expect(result.tax).toBe(0);
        });
    });

    // ----------------------------------------------------
    // 2. Input Change Triggers
    // ----------------------------------------------------
    describe('Recalculation Triggers', () => {
        test('Changing OT should affect Tax (if Flat 3%)', () => {
            const config = { enableSSO: false, taxMode: 'flat3' };
            const form = { salary: 10000, ot: 1000 }; // Total = 11,000

            const result = calculateTaxAndSSO(form, config);

            // 11,000 * 3% = 330
            expect(result.tax).toBe(330);
        });

        test('Changing OT should NOT affect SSO', () => {
            PayrollCalculator.calculateSSO.mockReturnValue(750);
            const config = { enableSSO: true, taxMode: 'none' };
            const form = { salary: 15000, ot: 5000 };

            calculateTaxAndSSO(form, config);

            // SSO based on salary only (15k), not OT
            expect(PayrollCalculator.calculateSSO).toHaveBeenCalledWith(15000);
        });
    });
});
