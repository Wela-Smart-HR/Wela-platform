import { describe, test, expect, vi, beforeEach } from 'vitest';
import { PayrollRepo } from '../payroll.repo';

// Mock dependencies
const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn(); // Mock for company config
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
        calculateNet: vi.fn(() => 10000),
        calculateLateDeduction: vi.fn(() => 0)
    }
}));

describe('PayrollRepo.createCycle - Target Filtering (Thai)', () => {

    const mockUsers = [
        { id: 'u1', name: 'Monthly Emp', salaryType: 'monthly', role: 'user', active: true },
        { id: 'u2', name: 'Daily Emp', salaryType: 'daily', role: 'user', active: true },
        { id: 'u3', name: 'Default Emp', role: 'user', active: true }, // Should default to monthly
        { id: 'u4', name: 'Thai Monthly', type: 'รายเดือน', role: 'user', active: true }, // New case
        { id: 'u5', name: 'Thai Daily', type: 'รายวัน', role: 'user', active: true } // New case
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });
        mockGetDocs
            .mockResolvedValueOnce({ docs: mockUsers.map(u => ({ id: u.id, data: () => u })) })
            .mockResolvedValueOnce({ docs: [] }); // Attendance
    });

    test('Target: daily -> Should include Daily (Eng) & Thai Daily', async () => {
        await PayrollRepo.createCycle('company_A', { month: '2026-06', period: 'first', target: 'daily' });

        const payslips = mockSet.mock.calls
            .map(call => call[1])
            .filter(d => d.employeeSnapshot);
        const empIds = payslips.map(p => p.employeeId);

        expect(empIds).toContain('u2'); // Daily
        expect(empIds).toContain('u5'); // Thai Daily
        expect(empIds).not.toContain('u1');
        expect(empIds).not.toContain('u4');
        expect(empIds.length).toBe(2);
    });

    test('Target: monthly -> Should include Monthly (Eng), Default & Thai Monthly', async () => {
        mockGetDocs
            .mockResolvedValueOnce({ docs: mockUsers.map(u => ({ id: u.id, data: () => u })) })
            .mockResolvedValueOnce({ docs: [] });

        await PayrollRepo.createCycle('company_A', { month: '2026-06', period: 'full', target: 'monthly' });

        const payslips = mockSet.mock.calls
            .map(call => call[1])
            .filter(d => d.employeeSnapshot);
        const empIds = payslips.map(p => p.employeeId);

        expect(empIds).toContain('u1');
        expect(empIds).toContain('u3');
        expect(empIds).toContain('u4');
        expect(empIds).not.toContain('u2');
        expect(empIds.length).toBe(3);
    });
});
