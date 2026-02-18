
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { requestsRepo } from '../requests.repo';
import { db } from '@/shared/lib/firebase';
import { runTransaction, doc, collection, serverTimestamp } from 'firebase/firestore';

// Mock Firebase
vi.mock('@/shared/lib/firebase', () => ({
    db: {}
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    doc: vi.fn(),
    runTransaction: vi.fn(),
    serverTimestamp: vi.fn(() => 'MOCKED_TIMESTAMP'),
    increment: vi.fn(),
    arrayUnion: vi.fn(),
}));

describe('Unscheduled Work Request Workflow', () => {
    let mockTransaction;

    beforeEach(() => {
        vi.clearAllMocks();
        mockTransaction = {
            get: vi.fn(),
            set: vi.fn(),
            update: vi.fn(),
        };
        runTransaction.mockImplementation((db, callback) => callback(mockTransaction));

        // Fix: doc() must return a ref object so transaction.set receives it
        doc.mockReturnValue({ id: 'mock-doc-ref' });
        collection.mockReturnValue({ id: 'mock-collection-ref' });
    });

    describe('approveRequest (Unscheduled Work)', () => {
        it('should create schedule and attendance log upon approval', async () => {
            // ARRANGE
            const mockRequest = {
                id: 'req-123',
                documentNo: 'REQ-202402-0001',
                companyId: 'comp-abc',
                userId: 'user-xyz',
                userName: 'Somchai',
                type: 'unscheduled-work',
                targetDate: '2024-02-14',
                timeIn: '08:00',
                timeOut: '17:00',
                status: 'pending',
                workflowSnapshot: { steps: [{ role: 'supervisor' }] },
                currentStepIndex: 0,
                approvers: [],
                logs: []
            };

            const mockApprover = {
                uid: 'approver-1',
                email: 'boss@company.com',
                role: 'supervisor' // Matches the required role
            };

            // Mock Firestore Get (Return the Request Doc)
            mockTransaction.get.mockResolvedValue({
                exists: () => true,
                data: () => mockRequest
            });

            // ACT
            await requestsRepo.approveRequest(mockRequest.id, mockApprover);

            // ASSERT
            // 1. Check if Schedule Doc is created/updated (Deterministic ID)
            const expectedScheduleId = 'user-xyz_2024-02-14';
            expect(doc).toHaveBeenCalledWith(db, 'schedules', expectedScheduleId);

            expect(mockTransaction.set).toHaveBeenCalledWith(
                expect.anything(), // The schedule doc ref
                expect.objectContaining({
                    userId: 'user-xyz',
                    date: '2024-02-14',
                    startTime: '08:00',
                    endTime: '17:00',
                    type: 'work',
                    shiftCode: 'EXTRA',
                    note: expect.stringContaining('REQ-202402-0001'),
                }),
                { merge: true }
            );

            // 2. Check if Attendance Log is created (with correct Timezone +07:00)
            expect(collection).toHaveBeenCalledWith(db, 'attendance_logs');

            expect(mockTransaction.set).toHaveBeenCalledWith(
                expect.anything(), // The new log doc ref
                expect.objectContaining({
                    employee_id: 'user-xyz',
                    clock_in: '2024-02-14T08:00:00+07:00',
                    clock_out: '2024-02-14T17:00:00+07:00',
                    status: 'approved-extra',
                    note: expect.stringContaining('Approved Unscheduled Work'),
                })
            );

            // 3. Request status update
            expect(mockTransaction.update).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    status: 'approved'
                })
            );
        });

        it('should throw error if time data is missing', async () => {
            const invalidRequest = {
                id: 'req-bad',
                type: 'unscheduled-work',
                targetDate: '2024-02-14',
                // Missing timeIn/timeOut
                status: 'pending',
                workflowSnapshot: { steps: [{ role: 'supervisor' }] },
                currentStepIndex: 0,
                approvers: []
            };

            const mockApprover = { uid: 'approver-1', role: 'supervisor' };

            // Mock Firestore Get
            mockTransaction.get.mockResolvedValue({
                exists: () => true,
                data: () => invalidRequest
            });

            await expect(requestsRepo.approveRequest(invalidRequest.id, mockApprover))
                .rejects.toThrow('ข้อมูลเวลาเข้า/ออกงานไม่ครบ');
        });
    });
});
