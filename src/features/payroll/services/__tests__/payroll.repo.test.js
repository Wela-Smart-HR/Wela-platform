import { describe, test, expect, vi, beforeEach } from 'vitest';
import { PayrollRepo } from '../payroll.repo';
import { runTransaction } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
    doc: vi.fn(),
    serverTimestamp: vi.fn(),
    runTransaction: vi.fn(),
}));

vi.mock('@/shared/lib/firebase', () => ({ db: {} }));

describe('PayrollRepo.addPayment — Overpayment Guard', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    test('should update status to "partial"', async () => {
        const mockData = { financials: { net: 25000 }, payments: [] };

        let capturedUpdate;
        runTransaction.mockImplementation(async (_, cb) => {
            await cb({
                get: vi.fn().mockResolvedValue({ exists: () => true, data: () => mockData }),
                update: vi.fn((ref, data) => capturedUpdate = data)
            });
        });

        await PayrollRepo.addPayment('slip_1', { amount: 10000 });

        expect(capturedUpdate).toEqual(expect.objectContaining({
            paymentStatus: 'partial',
            paidAmount: 10000
        }));
    });

    test('should THROW error when payment exceeds remaining', async () => {
        const mockData = { financials: { net: 20000 }, payments: [{ amount: 15000 }] }; // Paid 15k, Left 5k

        runTransaction.mockImplementation(async (_, cb) => {
            await cb({
                get: vi.fn().mockResolvedValue({ exists: () => true, data: () => mockData }),
                update: vi.fn()
            });
        });

        // Pay 6,000 (Exceeds 5,000)
        await expect(PayrollRepo.addPayment('slip_2', { amount: 6000 }))
            .rejects.toThrow(/ยอดจ่ายเกิน/);
    });
});