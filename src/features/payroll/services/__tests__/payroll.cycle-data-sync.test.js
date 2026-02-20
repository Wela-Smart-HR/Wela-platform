import { describe, test, expect, vi, beforeEach } from 'vitest';
import { PayrollRepo } from '../payroll.repo';

// Mock dependencies
const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn(); // New mock for single doc
// Shared mock functions for batch operations
const mockSet = vi.fn();
const mockCommit = vi.fn();

const mockWriteBatch = vi.fn(() => ({
    set: mockSet,
    commit: mockCommit,
    delete: vi.fn(),
    update: vi.fn()
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: (...args) => mockGetDocs(...args),
    getDoc: (...args) => mockGetDoc(...args), // Mock getDoc
    doc: vi.fn((_, collection, id) => ({ id, path: `${collection}/${id}` })),
    writeBatch: (...args) => mockWriteBatch(...args),
    serverTimestamp: () => 'MOCK_TIMESTAMP'
}));

vi.mock('@/shared/lib/firebase', () => ({ db: {} }));

vi.mock('../payroll.calculator', () => ({
    PayrollCalculator: {
        calculateSSO: vi.fn(() => 0),
        calculateTax: vi.fn(() => 0),
        calculateNet: vi.fn(({ ot, deductions }) => 15000 + (ot || 0) - (deductions || 0)),
        calculateLateDeduction: vi.fn((mins, config) => {
            // Mock logic: 2 THB per minute (regardless of config for simplicity, or check config)
            return mins * 2;
        })
    }
}));

import { PayrollCalculator } from '../payroll.calculator';

describe('PayrollRepo.createCycle - Data Sync Options', () => {

    const mockUser = { id: 'u1', name: 'Test User', salary: 15000, salaryType: 'monthly' };

    // 100 mins late
    const mockAttendance = [
        { userId: 'u1', status: 'late', lateMinutes: 60, date: '2026-06-01' },
        { userId: 'u1', status: 'late', lateMinutes: 40, date: '2026-06-02' }
    ];

    const mockCompanyConfig = {
        deduction: { deductionPerMinute: 2 } // Mock config
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock Company Fetch
        mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => mockCompanyConfig
        });

        // Mock Users & Attendance
        mockGetDocs
            .mockResolvedValueOnce({ docs: [{ id: 'u1', data: () => mockUser }] }) // Users
            .mockResolvedValueOnce({ docs: mockAttendance.map(a => ({ data: () => a })) }) // Legacy
            .mockResolvedValueOnce({ docs: [] }); // New
    });

    test('should SYNC deduction when syncDeduct is true', async () => {
        const cycleData = { month: '2026-06', period: 'full', syncDeduct: true, syncOT: false };

        await PayrollRepo.createCycle('company_A', cycleData);

        // Expect batch.set to be called with payslip containing deduction
        // Total Late = 100 mins. Mock Calc returns 100 * 2 = 200.
        // So financials.deductions should be 200.

        const setCalls = mockSet.mock.calls;
        const payslipCall = setCalls.find(call => call[0].path.startsWith('payslips/'));
        const payslipData = payslipCall[1];

        // Should pass now
        expect(payslipData.financials.deductions).toBe(200);
    });

    test('should IGNORE deduction when syncDeduct is false', async () => {
        const cycleData = { month: '2026-06', period: 'full', syncDeduct: false, syncOT: false };

        await PayrollRepo.createCycle('company_A', cycleData);

        const setCalls = mockSet.mock.calls;
        const payslipCall = setCalls.find(call => call[0].path.startsWith('payslips/'));
        const payslipData = payslipCall[1];

        expect(payslipData.financials.deductions).toBe(0);
    });
});
