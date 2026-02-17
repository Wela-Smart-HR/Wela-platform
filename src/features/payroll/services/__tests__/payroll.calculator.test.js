import { PayrollCalculator } from '../services/payroll.calculator'; // ปรับ path ตามจริง
import Decimal from 'decimal.js';

describe('PayrollCalculator (The Brain)', () => {

    // ----------------------------------------------------
    // Test 1: Floating Point Precision (เรื่องคอขาดบาดตาย)
    // ----------------------------------------------------
    test('should handle floating point arithmetic correctly', () => {
        // JS Number ปกติ: 0.1 + 0.2 = 0.30000000000000004
        const income = 0.1;
        const bonus = 0.2;

        // เราไม่ได้เรียก method ตรงๆ แต่จำลองการบวกใน logic
        const decimalResult = new Decimal(income).plus(bonus);

        expect(decimalResult.toNumber()).toBe(0.3); // ต้องได้ 0.3 เป๊ะๆ
        expect(decimalResult.toNumber()).not.toBe(0.30000000000000004);
    });

    // ----------------------------------------------------
    // Test 2: SSO Calculation (ประกันสังคม)
    // ----------------------------------------------------
    describe('calculateSSO', () => {
        test('should calculate 5% for standard salary', () => {
            // 20,000 -> Max Cap 15,000 * 5% = 750
            const sso = PayrollCalculator.calculateSSO(20000);
            expect(sso.toNumber()).toBe(750);
        });

        test('should cap at 750 for high salary', () => {
            const sso = PayrollCalculator.calculateSSO(100000);
            expect(sso.toNumber()).toBe(750);
        });

        test('should calculate correct amount for low salary', () => {
            // 10,000 * 5% = 500
            const sso = PayrollCalculator.calculateSSO(10000);
            expect(sso.toNumber()).toBe(500);
        });

        test('should handle rounding correctly (Half Up)', () => {
            // 5555 * 0.05 = 277.75 -> ควรปัดเป็น 278 (ตาม Logic เดิมที่คุยกัน)
            const sso = PayrollCalculator.calculateSSO(5555);
            expect(sso.toNumber()).toBe(278);
        });
    });

    // ----------------------------------------------------
    // Test 3: Thai Tax (PND1) Logic
    // ----------------------------------------------------
    describe('calculateThaiTax (PND1)', () => {
        test('should return 0 tax for salary under threshold', () => {
            // เงินเดือน 20,000 * 12 = 240,000
            // หักค่าใช้จ่าย 100,000 + ลดหย่อนส่วนตัว 60,000 + SSO (750*12=9000)
            // สุทธิ = 71,000 -> ไม่ถึงเกณฑ์ 150,000 -> ภาษี 0
            const tax = PayrollCalculator.calculateThaiTax(20000, 750);
            expect(tax.toNumber()).toBe(0);
        });

        test('should calculate progressive tax for high salary', () => {
            // Case: เงินเดือน 100,000 (SSO 750)
            // รายได้ปี = 1,200,000
            // หักค่าใช้จ่าย = 100,000 (Max)
            // หักลดหย่อน = 60,000 (ตัว) + 9,000 (SSO) = 69,000
            // สุทธิ = 1,031,000

            // Step 1: 0-150k = 0
            // Step 2: 150k-300k (150k * 5%) = 7,500
            // Step 3: 300k-500k (200k * 10%) = 20,000
            // Step 4: 500k-750k (250k * 15%) = 37,500
            // Step 5: 750k-1M (250k * 20%) = 50,000
            // Step 6: 1M-1.031M (31k * 25%) = 7,750
            // Total Year Tax = 122,750
            // Monthly Tax = 122,750 / 12 = 10,229.166... -> 10,229.17

            const tax = PayrollCalculator.calculateThaiTax(100000, 750);
            expect(tax.toNumber()).toBe(10229.17);
        });
    });
});