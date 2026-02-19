import { describe, test, expect } from 'vitest';
import { PayrollCalculator } from '../payroll.calculator';
import Decimal from 'decimal.js';

describe('PayrollCalculator (The Brain)', () => {

    // ✅ Test 1: ความแม่นยำทศนิยม
    test('should handle floating point arithmetic correctly', () => {
        const income = 0.1;
        const bonus = 0.2;
        const decimalResult = new Decimal(income).plus(bonus);
        expect(decimalResult.toNumber()).toBe(0.3);
    });

    // ✅ Test 2: ประกันสังคม (อัปเดตเพดานใหม่ 17,500 บาท / 875 บาท)
    describe('calculateSSO', () => {
        test('should calculate 5% for standard salary', () => {
            const sso = PayrollCalculator.calculateSSO(10000);
            expect(sso).toBe(500);
        });

        test('should cap at 875 for high salary (Base 17,500)', () => {
            // กฎใหม่ปี 2026: ฐาน 17,500 * 5% = 875
            const sso = PayrollCalculator.calculateSSO(20000);
            expect(sso).toBe(875);
        });

        test('should use minimum base 1,650', () => {
            // 1,000 -> Min Base 1,650 * 5% = 82.5 -> ปัดเป็น 83
            const sso = PayrollCalculator.calculateSSO(1000);
            expect(sso).toBe(83);
        });
    });

    // ✅ Test 3: ภาษี ภ.ง.ด.1 (PND 1 - Progressive Rate)
    // Note: In implementation, we replaced flat rate with progressive calculation named 'calculateTax'
    describe('calculateTax (Progressive)', () => {

        test('Salary 20,000: Should pay 0 tax', () => {
            // SSO (875) -> Net Taxable Income < 150,000 -> Tax 0
            const tax = PayrollCalculator.calculateTax(20000, 875);
            expect(tax).toBe(0);
        });

        test('Salary 50,000: Should pay tax correctly', () => {
            // SSO = 875
            // รายได้ทั้งปี = 600,000
            // หักค่าใช้จ่าย 100,000
            // หักลดหย่อน 60,000 + (875*12 = 10,500) = 70,500
            // Net Taxable = 429,500

            // 0-150k = 0
            // 150-300k (150k * 5%) = 7,500
            // 300-429.5k (129,500 * 10%) = 12,950
            // Total Tax Year = 20,450
            // Monthly = 20,450 / 12 = 1,704.166... -> 1,704.17

            const tax = PayrollCalculator.calculateTax(50000, 875);
            expect(tax).toBe(1704.17);
        });

        test('Salary 100,000: Should pay tax correctly', () => {
            // Net Taxable ~ 1,029,500
            // Tax ~ 122,375 / 12 = 10,197.92
            const tax = PayrollCalculator.calculateTax(100000, 875);
            expect(tax).toBe(10197.92);
        });
    });

    // ✅ Test 4: Late Deduction (New 2026 Logic)
    describe('calculateLateDeduction', () => {
        const config = {
            gracePeriod: 5,         // 5 mins grace
            deductionPerMinute: 10,  // 10 THB/min
            maxDeduction: 500        // Max 500 THB
        };

        test('Not late (0 mins): Should be 0', () => {
            expect(PayrollCalculator.calculateLateDeduction(0, config)).toBe(0);
        });

        test('Within Grace Period (5 mins): Should be 0', () => {
            expect(PayrollCalculator.calculateLateDeduction(5, config)).toBe(0);
        });

        test('Exceed Grace Period (6 mins): Should deduct full amount', () => {
            // 6 mins * 10 = 60
            expect(PayrollCalculator.calculateLateDeduction(6, config)).toBe(60);
        });

        test('High Lateness (60 mins): Should deduct correctly', () => {
            // 60 mins * 10 = 600 -> But Cap is 500
            expect(PayrollCalculator.calculateLateDeduction(60, config)).toBe(500);
        });

        test('No config provided: Should fallback cleanly', () => {
            expect(PayrollCalculator.calculateLateDeduction(10, {})).toBe(0);
        });
    });
});