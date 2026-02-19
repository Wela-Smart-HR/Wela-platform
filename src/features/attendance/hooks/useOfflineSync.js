import { useState, useEffect, useCallback } from 'react';
import { offlineService } from '../offline.service';
import { attendanceService } from '../../../di/attendanceDI';

/**
 * 📡 useOfflineSync
 * จัดการสถานะ Network และ Sync ข้อมูลเมื่อกลับมา Online
 */
export function useOfflineSync(onSyncSuccess) {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [pendingCount, setPendingCount] = useState(offlineService.getPendingCount());

    /**
     * Sync ข้อมูลที่ค้างอยู่
     */
    const syncOfflineData = useCallback(async () => {
        const result = await offlineService.syncPendingData(
            // ฟังก์ชันอัปโหลด (Adapter Pattern)
            async (item) => {
                const ts = item.localTimestamp ? new Date(item.localTimestamp) : new Date();
                const loc = item.location;

                // Call Service (Logic การส่งข้อมูล)
                if (item.actionType === 'clock-in') {
                    const shiftStart = item.shiftStart ? new Date(item.shiftStart) : null;
                    await attendanceService.clockIn(item.userId, item.companyId, loc, ts, shiftStart);
                } else {
                    await attendanceService.clockOut(item.userId, loc, ts);
                }
            },
            // Progress Callback
            (progress) => {
                console.log(`[Sync] ${progress.current}/${progress.total}`);
            }
        );

        // Update local pending count
        setPendingCount(offlineService.getPendingCount());

        // Notify parent to reload data if needed
        if (result.success > 0 && onSyncSuccess) {
            onSyncSuccess();
        }

        return result;
    }, [onSyncSuccess]);

    useEffect(() => {
        // Initial Check
        setIsOffline(!navigator.onLine);
        setPendingCount(offlineService.getPendingCount());

        // Auto Sync if online and has pending data
        if (navigator.onLine && offlineService.getPendingCount() > 0) {
            syncOfflineData();
        }

        // Subscribe to Network Status
        const cleanup = offlineService.subscribeToNetworkStatus(
            // Online
            () => {
                setIsOffline(false);
                syncOfflineData();
            },
            // Offline
            () => {
                setIsOffline(true);
            }
        );

        return () => cleanup();
    }, [syncOfflineData]);

    return {
        isOffline,
        pendingCount,
        syncOfflineData
    };
}
