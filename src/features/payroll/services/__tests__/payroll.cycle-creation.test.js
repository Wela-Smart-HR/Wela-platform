import { describe, test, expect, vi, beforeEach } from 'vitest';
import { PayrollRepo } from '../payroll.repo';

// Mock dependencies
const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn(); // Added for company config fetch

// Shared mock functions for batch operations
const mockSet = vi.fn();
const mockCommit = vi.fn();

// Mock writeBatch to return the SAME mock functions every time
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
    getDoc: (...args) => mockGetDoc(...args), // Added
    doc: vi.fn((_, collection, id) => ({ id, path: `${collection}/${id}` })),
    writeBatch: (...args) => mockWriteBatch(...args),
    serverTimestamp: () => 'MOCK_TIMESTAMP'
}));

vi.mock('@/shared/lib/firebase', () => ({ db: {} }));

// Mock Calculator to avoid testing it here
vi.mock('../payroll.calculator', () => ({
    PayrollCalculator: {
        calculateSSO: vi.fn(() => 750),
        calculateTax: vi.fn(() => 0),
        calculateNet: vi.fn(() => 15000)
    }
}));

describe('PayrollRepo.createCycle', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Default Mock for Company Config (Empty)
        mockGetDoc.mockResolvedValue({
            exists: () => false, // No config by default for these tests
            data: () => ({})
        });
    });

    // ----------------------------------------------------
    // 1. Date Range & Cycle ID Tests
    // ----------------------------------------------------
    describe('Date Range & ID Generation', () => {

        test('Full Month: should set range 1st to End of Month', async () => {
            // Mock empty employees to focus on cycle creation
            mockGetDocs
                .mockResolvedValueOnce({ docs: [] }) // Users
                .mockResolvedValueOnce({ docs: [] }); // Attendance

            const cycleData = { month: '2026-02', period: 'full' };
            await PayrollRepo.createCycle('company_123', cycleData);

            // Check Cycle ID
            const expectedId = 'company_123_2026-02_full';
            expect(mockSet).toHaveBeenCalledWith(
                expect.objectContaining({ path: `payroll_cycles/${expectedId}` }),
                expect.objectContaining({
                    id: expectedId,
                    startDate: '2026-02-01',
                    endDate: '2026-02-28' // 2026 is not leap year
                })
            );
        });

        test('Leap Year (2024): End date should be 29th', async () => {
            mockGetDocs
                .mockResolvedValueOnce({ docs: [] })
                .mockResolvedValueOnce({ docs: [] });

            const cycleData = { month: '2024-02', period: 'full' };
            await PayrollRepo.createCycle('company_123', cycleData);

            expect(mockSet).toHaveBeenCalledWith(
                expect.objectContaining({ path: 'payroll_cycles/company_123_2024-02_full' }),
                expect.objectContaining({
                    startDate: '2024-02-01',
                    endDate: '2024-02-29'
                })
            );
        });

        test('First Period: should set range 1-15', async () => {
            mockGetDocs
                .mockResolvedValueOnce({ docs: [] })
                .mockResolvedValueOnce({ docs: [] });

            const cycleData = { month: '2026-03', period: 'first' };
            await PayrollRepo.createCycle('company_123', cycleData);

            expect(mockSet).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    startDate: '2026-03-01',
                    endDate: '2026-03-15'
                })
            );
        });

        test('Second Period: should set range 16-End', async () => {
            mockGetDocs
                .mockResolvedValueOnce({ docs: [] })
                .mockResolvedValueOnce({ docs: [] });

            const cycleData = { month: '2026-03', period: 'second' }; // March has 31 days
            await PayrollRepo.createCycle('company_123', cycleData);

            expect(mockSet).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    startDate: '2026-03-16',
                    endDate: '2026-03-31'
                })
            );
        });
    });

    // ----------------------------------------------------
    // 2. Employee Filtering Tests
    // ----------------------------------------------------
    describe('Employee Filtering Logic', () => {
        const mockUsers = [
            { id: 'u1', name: 'Valid User', role: 'user', active: true, status: 'employed' },
            { id: 'u2', name: 'Admin User', role: 'admin', active: true }, // Should filter out
            { id: 'u3', name: 'Resigned User', role: 'user', status: 'resigned' }, // Should filter out
            { id: 'u4', name: 'Inactive User', role: 'user', active: false }, // Should filter out
            { id: 'u5', name: 'Duplicate Name', role: 'user' },
            { id: 'u6', name: 'Duplicate Name ', role: 'user' }, // Should dedupe (trim)
            { id: 'u7', name: '   ', role: 'user' } // Should filter empty name
        ];

        beforeEach(() => {
            mockGetDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });

            // Mock Users Return AND Attendance Return (needs 2 calls)
            mockGetDocs
                .mockResolvedValueOnce({
                    docs: mockUsers.map(u => ({ id: u.id, data: () => u }))
                })
                .mockResolvedValueOnce({ docs: [] }); // Attendance
        });

        test('should filter out invalid employees', async () => {
            await PayrollRepo.createCycle('company_A', { month: '2026-06', period: 'full' });

            const batchSetCalls = mockSet.mock.calls;

            // Should create Payslips for: u1 and u5 (u6 is dupe of u5)
            // Retrieve payslip docs created
            // batchSetCalls arguments: [docRef, data]
            const payslipsCreated = batchSetCalls
                .map(call => call[1])
                .filter(data => data.employeeSnapshot); // distinguish from cycle doc

            const createdIds = payslipsCreated.map(p => p.employeeId);

            expect(createdIds).toContain('u1');
            expect(createdIds).toContain('u5');

            expect(createdIds).not.toContain('u2'); // Admin
            expect(createdIds).not.toContain('u3'); // Resigned
            expect(createdIds).not.toContain('u4'); // Inactive
            expect(createdIds).not.toContain('u7'); // Empty Name
            expect(createdIds).not.toContain('u6'); // Duplicate

            expect(createdIds.length).toBe(2);
        });
    });
});
