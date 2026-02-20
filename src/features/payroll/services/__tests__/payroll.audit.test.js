import { describe, test, expect, vi, beforeEach } from 'vitest';
import { PayrollRepo } from '../payroll.repo';

// Mock dependencies (Same as proration test)
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
// Use REAL calculator for auditing logic check (except complex tax tables if needed, but here we test integration)
// Actually better to mock calculator to control outputs, BUT we want to test the REPO's conditional calling of calculator.
// So we mock Calculator to spy on calls.
vi.mock('../payroll.calculator', () => ({
    PayrollCalculator: {
        calculateSSO: vi.fn(() => 750), // Mock standard SSO
        calculateTax: vi.fn(() => 500),
        calculateNet: vi.fn((items) => {
            return (items.salary || 0) + (items.ot || 0) - (items.deductions || 0) - (items.sso || 0) - (items.tax || 0);
        }),
        calculateLateDeduction: vi.fn((mins) => mins * 5) // 5 baht per min
    }
}));

import { PayrollCalculator } from '../payroll.calculator';

describe('Payroll Audit & Enriched Logs', () => {

    const mockAdmin = {
        id: 'admin1',
        name: 'Admin',
        salary: 0,
        salaryType: 'monthly',
        deductionProfile: 'none', // Critical for fix
        role: 'user',
        active: true
    };

    const mockStaff = {
        id: 'staff1',
        name: 'Staff',
        salary: 20000,
        salaryType: 'daily',
        deductionProfile: 'sso',
        role: 'user',
        active: true
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ deduction: { deductionPerMinute: 5 } }) });
    });

    test('Zero Salary Admin with profile "none" should have 0 Taxes/SSO', async () => {
        mockGetDocs
            .mockResolvedValueOnce({ docs: [{ id: 'admin1', data: () => mockAdmin }] }) // users
            .mockResolvedValueOnce({ docs: [] }) // legacy attendance - no logs
            .mockResolvedValueOnce({ docs: [] }); // new attendance_logs - no logs

        await PayrollRepo.createCycle('company_A', { month: '2026-06', period: 'full' });

        const payslip = mockSet.mock.calls
            .map(call => call[1])
            .find(d => d.employeeId === 'admin1');

        expect(PayrollCalculator.calculateSSO).not.toHaveBeenCalled();
        expect(PayrollCalculator.calculateTax).not.toHaveBeenCalled();
        expect(payslip.financials.sso).toBe(0);
        expect(payslip.financials.tax).toBe(0);
        expect(payslip.financials.net).toBe(0);
    });

    test('Logs should be enriched with Income and Deduction details', async () => {
        const logs = [
            { userId: 'staff1', date: '2026-06-01', otHours: 1, type: 'clock-in', status: 'present', localTimestamp: '2026-06-01T08:00:00' },
            { userId: 'staff1', date: '2026-06-01', type: 'clock-out', localTimestamp: '2026-06-01T17:00:00' },
            { userId: 'staff1', date: '2026-06-02', lateMinutes: 10, type: 'clock-in', status: 'late', localTimestamp: '2026-06-02T08:10:00' },
            { userId: 'staff1', date: '2026-06-02', type: 'clock-out', localTimestamp: '2026-06-02T17:00:00' }
        ];

        mockGetDocs
            .mockResolvedValueOnce({ docs: [{ id: 'staff1', data: () => mockStaff }] }) // users
            .mockResolvedValueOnce({ docs: logs.map(l => ({ data: () => l })) }) // legacy attendance logs
            .mockResolvedValueOnce({ docs: [] }); // new attendance_logs - empty (legacy test data uses old format)

        await PayrollRepo.createCycle('company_A', {
            month: '2026-06', period: 'full',
            syncOT: true, syncDeduct: true
        });

        const payslip = mockSet.mock.calls
            .map(call => call[1])
            .find(d => d.employeeId === 'staff1');

        const enrichedLogs = payslip.logsSnapshot;

        // Day 1: OT (merged from clock-in + clock-out)
        const day1 = enrichedLogs.find(l => l.date === '2026-06-01');
        expect(day1.income).toBeGreaterThan(0);
        expect(day1.note).toContain('OT 1h');
        expect(day1.checkIn).toBe('08:00');
        expect(day1.checkOut).toBe('17:00');

        // Day 2: Late (merged)
        const day2 = enrichedLogs.find(l => l.date === '2026-06-02');
        expect(day2.deduction).toBe(50); // 10 mins * 5 (mock)
        expect(day2.note).toContain('สาย 10 นาที');
        expect(day2.checkIn).toBe('08:10');
    });

    test('Should capture morning shifts that fall into previous UTC day (Timezone Edge Case)', async () => {
        // Case: 2026-06-01 06:00 AM (Thai) = 2026-05-31 23:00:00 UTC
        // This record usually gets filtered out if query starts exactly at 2026-06-01T00:00:00Z
        const logs = [
            {
                employee_id: 'staff1',
                clock_in: '2026-05-31T23:00:00.000Z', // 06:00 AM Thai
                clock_out: '2026-06-01T08:00:00.000Z', // 15:00 PM Thai
                status: 'present',
                late_minutes: 0
            }
        ];

        // Mock return for NEW logs query
        mockGetDocs
            .mockResolvedValueOnce({ docs: [{ id: 'staff1', data: () => mockStaff }] })
            .mockResolvedValueOnce({ docs: [] }) // Legacy empty
            .mockResolvedValueOnce({ docs: logs.map(l => ({ data: () => l })) }) // New logs found!
            .mockResolvedValueOnce({ exists: () => true, data: () => ({}) }); // Company

        const cycleId = await PayrollRepo.createCycle('company_A', {
            month: '2026-06', period: 'full'
        });

        const payslip = mockSet.mock.calls.find(call => call[1].employeeId === 'staff1')[1];
        const enrichedLogs = payslip.logsSnapshot;

        // Expect to find record for June 1st
        const day1 = enrichedLogs.find(l => l.date === '2026-06-01');
        expect(day1).toBeDefined();
        expect(day1.checkIn).toBe('06:00'); // Converted to Local Time
        expect(day1.checkOut).toBe('15:00');
    });
});
