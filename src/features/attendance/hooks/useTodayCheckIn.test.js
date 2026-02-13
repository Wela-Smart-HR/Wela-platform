import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTodayCheckIn } from './useTodayCheckIn';

// Mock Firebase Firestore
vi.mock('@/shared/lib/firebase', () => ({
    db: {},
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    onSnapshot: vi.fn(),
}));

// Helper function: สร้าง Mock Data ของ Log
const createMockLog = (clockIn, clockOut = null, hoursAgo = 0) => {
    const date = new Date();
    date.setHours(date.getHours() - hoursAgo);

    return {
        docs: [{
            id: 'log_123',
            data: () => ({
                employee_id: 'user1',
                clock_in: date.toISOString(),
                clock_out: clockOut ? new Date(Date.now() - clockOut * 60 * 60 * 1000).toISOString() : null,
            })
        }],
        empty: false
    };
};

describe('useTodayCheckIn Logic Tests', () => {
    let mockOnSnapshot;

    beforeEach(() => {
        vi.clearAllMocks();
        const { onSnapshot } = require('firebase/firestore');
        mockOnSnapshot = onSnapshot;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // --------------------------------------------------------------------------
    // Scenario 1: Ghost Shift (ลืมออกงานข้ามวัน)
    // --------------------------------------------------------------------------
    test('Should detect "Ghost Shift" (isStuck) when checked in > 20 hours', async () => {
        // Setup: จำลองว่า onSnapshot คืนค่า Log เข้างานเมื่อ 25 ชม. ที่แล้ว
        mockOnSnapshot.mockImplementation((query, callback) => {
            callback(createMockLog(null, null, 25)); // เข้างานค้างไว้ 25 ชม.
            return vi.fn(); // unsubscribe function
        });

        const { result } = renderHook(() => useTodayCheckIn('user1'));

        // Wait for state to update
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Assert: ตรวจสอบผลลัพธ์
        expect(result.current.isCheckedIn).toBe(false); // ต้องไม่ทำงานแล้ว (เพื่อให้กดใหม่ได้)
        expect(result.current.isStuck).toBe(true);      // 🚨 ต้องแจ้งเตือนว่าค้าง!
        expect(result.current.staleCheckIn).toBeTruthy(); // มี record ที่ค้าง
    });

    // --------------------------------------------------------------------------
    // Scenario 2: Night Shift Working (ทำงานข้ามคืน)
    // --------------------------------------------------------------------------
    test('Should remain "Working" even after midnight', async () => {
        // Setup: เข้างานตอน 5 ทุ่มเมื่อวาน (7 ชม. ที่แล้ว - ยังไม่ถึง 20 ชม.)
        mockOnSnapshot.mockImplementation((query, callback) => {
            callback(createMockLog(null, null, 7));
            return vi.fn();
        });

        const { result } = renderHook(() => useTodayCheckIn('user1'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.isCheckedIn).toBe(true); // ✅ ยังทำงานอยู่
        expect(result.current.isStuck).toBe(false);    // ไม่ค้าง (เพราะเพิ่งผ่านไป 7 ชม.)
    });

    // --------------------------------------------------------------------------
    // Scenario 3: Completed Shift
    // --------------------------------------------------------------------------
    test('Should show completed when clocked out', async () => {
        // Setup: มี clock_out แล้ว
        mockOnSnapshot.mockImplementation((query, callback) => {
            const now = new Date();
            callback({
                docs: [{
                    id: 'log_123',
                    data: () => ({
                        employee_id: 'user1',
                        clock_in: new Date(now - 8 * 60 * 60 * 1000).toISOString(), // 8 ชม. ที่แล้ว
                        clock_out: new Date(now - 1 * 60 * 60 * 1000).toISOString(), // ออกไป 1 ชม. ที่แล้ว
                    })
                }],
                empty: false
            });
            return vi.fn();
        });

        const { result } = renderHook(() => useTodayCheckIn('user1'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.isCheckedIn).toBe(false);
        expect(result.current.lastAction).toBe('OUT');
    });

    // --------------------------------------------------------------------------
    // Scenario 4: No Records (พนักงานใหม่)
    // --------------------------------------------------------------------------
    test('Should handle empty records correctly', async () => {
        mockOnSnapshot.mockImplementation((query, callback) => {
            callback({ docs: [], empty: true });
            return vi.fn();
        });

        const { result } = renderHook(() => useTodayCheckIn('user1'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.isCheckedIn).toBe(false);
        expect(result.current.lastAction).toBe('NONE');
        expect(result.current.todayRecord).toBeNull();
    });
});