import { describe, test, expect, vi, beforeEach } from 'vitest';
import { PayrollRepo } from '../payroll.repo';

// Mock dependencies
const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
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
    getDoc: (...args) => mockGetDoc(...args),
    doc: vi.fn((_, collection, id) => ({ id, path: `${collection}/${id}` })),
    writeBatch: (...args) => mockWriteBatch(...args),
    serverTimestamp: () => 'MOCK_TIMESTAMP'
}));

vi.mock('@/shared/lib/firebase', () => ({ db: {} }));
vi.mock('../payroll.calculator', () => ({
    PayrollCalculator: {
        calculateSSO: vi.fn(() => 0),
        calculateTax: vi.fn(() => 0),
        calculateNet: vi.fn(() => 0), // Simplification
        calculateLateDeduction: vi.fn(() => 0),
        calculateOT: vi.fn(() => 0)
    }
}));

describe('Payroll Proration Logic', () => {

    const mockMonthlyUser = { id: 'u1', name: 'Monthly', salary: 30000, salaryType: 'monthly', role: 'user', active: true };
    const mockDailyUser = { id: 'u2', name: 'Daily', salary: 500, salaryType: 'daily', role: 'user', active: true };

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetDoc.mockResolvedValue({ exists: () => false, data: () => ({}) }); // No config
    });

    test('Period: full -> Monthly should get FULL salary', async () => {
        mockGetDocs
            .mockResolvedValueOnce({ docs: [{ id: 'u1', data: () => mockMonthlyUser }] }) // Users
            .mockResolvedValueOnce({ docs: [] }) // Legacy Logs
            .mockResolvedValueOnce({ docs: [] }); // New Logs

        await PayrollRepo.createCycle('company_A', { month: '2026-06', period: 'full' });

        const payslip = mockSet.mock.calls
            .map(call => call[1])
            .find(d => d.employeeSnapshot && d.employeeId === 'u1');

        expect(payslip.financials.salary).toBe(30000);
    });

    test('Period: first -> Monthly should get HALF salary', async () => {
        mockGetDocs
            .mockResolvedValueOnce({ docs: [{ id: 'u1', data: () => mockMonthlyUser }] })
            .mockResolvedValueOnce({ docs: [] })
            .mockResolvedValueOnce({ docs: [] });

        await PayrollRepo.createCycle('company_A', { month: '2026-06', period: 'first' });

        const payslip = mockSet.mock.calls
            .map(call => call[1])
            .find(d => d.employeeSnapshot && d.employeeId === 'u1');

        expect(payslip.financials.salary).toBe(15000); // 30000 / 2
    });

    test('Period: second -> Monthly should get HALF salary', async () => {
        mockGetDocs
            .mockResolvedValueOnce({ docs: [{ id: 'u1', data: () => mockMonthlyUser }] })
            .mockResolvedValueOnce({ docs: [] })
            .mockResolvedValueOnce({ docs: [] });

        await PayrollRepo.createCycle('company_A', { month: '2026-06', period: 'second' });

        const payslip = mockSet.mock.calls
            .map(call => call[1])
            .find(d => d.employeeSnapshot && d.employeeId === 'u1');

        expect(payslip.financials.salary).toBe(15000);
    });

    test('Period: first -> Daily should get paid by WORK DAYS', async () => {
        // Daily user worked 5 days in first period (each day = clock-in + clock-out pair)
        const attendanceLogs = [];
        for (let i = 1; i <= 5; i++) {
            const d = String(i).padStart(2, '0');
            attendanceLogs.push(
                { userId: 'u2', date: `2026-06-${d}`, type: 'clock-in', status: 'present', localTimestamp: `2026-06-${d}T08:00:00` },
                { userId: 'u2', date: `2026-06-${d}`, type: 'clock-out', localTimestamp: `2026-06-${d}T17:00:00` }
            );
        }

        mockGetDocs
            .mockResolvedValueOnce({ docs: [{ id: 'u2', data: () => mockDailyUser }] }) // Users
            .mockResolvedValueOnce({ docs: attendanceLogs.map(l => ({ data: () => l })) }) // Legacy
            .mockResolvedValueOnce({ docs: [] }); // New

        await PayrollRepo.createCycle('company_A', { month: '2026-06', period: 'first' });

        const payslip = mockSet.mock.calls
            .map(call => call[1])
            .find(d => d.employeeSnapshot && d.employeeId === 'u2');

        // 5 days * 500 = 2500
        expect(payslip.financials.salary).toBe(2500);
    });
});