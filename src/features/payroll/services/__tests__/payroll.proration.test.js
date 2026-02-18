import { describe, test, expect } from 'vitest';
import { PayrollCalculator } from '../payroll.calculator';

describe('PayrollCalculator - Proration Logic', () => {

    // ----------------------------------------------------
    // 🏢 กลุ่มพนักงานรายเดือน (Monthly) - หาร 30 วันเสมอ
    // ----------------------------------------------------
    describe('Monthly Employee (Standard 30-day divisor)', () => {

        test('should calculate prorated salary based on 30-day logic', () => {
            // เงินเดือน 30,000
            // เริ่มงานวันที่ 16 (ทำงาน 15 วัน: 16-30)
            // สูตร: (30000 / 30) * 15 = 15,000
            const prorated = PayrollCalculator.calculateProratedSalary('monthly', 30000, 15, 30);
            expect(prorated).toBe(15000);
        });

        test('should pay FULL salary if worked full month (February 28 days)', () => {
            // เดือนกุมภาพันธ์ มี 28 วัน ทำงานเต็มเดือน (28 วัน)
            // ต้องได้เต็ม 30,000 (ไม่ใช่ (30000/30)*28 = 28,000)
            const prorated = PayrollCalculator.calculateProratedSalary('monthly', 30000, 28, 28);
            expect(prorated).toBe(30000);
        });

        test('should pay FULL salary if worked full month (March 31 days)', () => {
            // เดือนมีนาคม มี 31 วัน ทำงานเต็มเดือน
            // ต้องได้เต็ม 30,000 (ไม่ใช่ได้เพิ่ม)
            const prorated = PayrollCalculator.calculateProratedSalary('monthly', 30000, 31, 31);
            expect(prorated).toBe(30000);
        });
    });

    // ----------------------------------------------------
    // 👷 กลุ่มพนักงานรายวัน (Daily) - จ่ายตามจริง (No Work No Pay)
    // ----------------------------------------------------
    describe('Daily Employee (Per Day Rate)', () => {

        test('should calculate strictly by days worked', () => {
            // ค่าแรงวันละ 500
            // มาทำงาน 10 วัน
            // สูตร: 500 * 10 = 5,000
            const wage = PayrollCalculator.calculateProratedSalary('daily', 500, 10, 30);
            expect(wage).toBe(5000);
        });

        test('should NOT use 30-day divisor logic', () => {
            // ค่าแรงวันละ 1,000
            // เดือนกุมภาพันธ์ (28 วัน) มาทำงานครบ 28 วัน
            // สูตร: 1,000 * 28 = 28,000 (ไม่ใช่ 30,000 แบบรายเดือน)
            const wage = PayrollCalculator.calculateProratedSalary('daily', 1000, 28, 28);
            expect(wage).toBe(28000);
        });
    });
});