/**
 * ===================================================
 * ⏰ useMyAttendance (Facade)
 * ===================================================
 * 
 * 👑 The Orchestrator
 * รวบรวม Logic จาก Hooks ย่อยๆ ให้ UI เรียกใช้ง่ายๆ
 * ตามหลักการ Separation of Concerns (SoC)
 * 
 * 🧩 Composition:
 * 1. 📍 useLocationTracking   - จัดการ GPS
 * 2. 📊 useAttendanceLogs     - จัดการ Real-time Data
 * 3. 📡 useOfflineSync        - จัดการ Network & Queue
 * 4. ⚡ useAttendanceActions  - จัดการ Action (Clock In/Out)
 * 5. ⏰ useTodayCheckIn       - จัดการสถานะวันนี้ (Server State)
 */

import { useEffect, useState, useCallback } from 'react';
import { useGlobalConfig } from '../../contexts/ConfigContext';
import { useTodayCheckIn } from './hooks/useTodayCheckIn';
import { useLocationTracking } from './hooks/useLocationTracking';
import { useAttendanceLogs } from './hooks/useAttendanceLogs';
import { useAttendanceActions } from './hooks/useAttendanceActions';
import { useOfflineSync } from './hooks/useOfflineSync';
import { attendanceRepo } from '../../di/attendanceDI';

export function useMyAttendance(userId, companyId, currentMonth = new Date(), currentUser = null) {
    const { companyConfig } = useGlobalConfig();

    // === Local State (Server + Instant Updates) ===
    const [todayRecord, setTodayRecord] = useState(null);

    // Helper: Reload Today's Record manually (for instant update after action)
    const refreshTodayRecord = useCallback(async () => {
        if (!userId) return;
        try {
            const latest = await attendanceRepo.findLatestByEmployee(userId, new Date());
            if (latest) setTodayRecord(latest.toPrimitives());
        } catch (err) {
            console.error("[Facade] Refresh Error:", err);
        }
    }, [userId]);

    // 1. 📡 Network & Offline Sync
    const { isOffline, pendingCount, syncOfflineData } = useOfflineSync(refreshTodayRecord);

    // 2. 📍 GPS Tracking
    // Pass config for radius/location check
    const {
        location, locationStatus, distance, gpsError, retryGps
    } = useLocationTracking(companyConfig);

    // 3. 📊 Data Fetching (Read)
    const {
        attendanceLogs, schedules, todaySchedule, loading: dataLoading
    } = useAttendanceLogs(userId, currentMonth);

    // 4. ⏰ Today's Server State (Reactive)
    const {
        todayRecord: serverTodayRecord, isStuck, staleCheckIn
    } = useTodayCheckIn(userId);

    // Sync Server Record to Local State
    useEffect(() => {
        if (serverTodayRecord) {
            setTodayRecord(serverTodayRecord);
        }
    }, [serverTodayRecord]);

    // Initial Load
    useEffect(() => {
        refreshTodayRecord();
    }, [refreshTodayRecord]);

    // 5. ⚡ Actions (Write)
    const {
        clockIn, clockOut, submitRetroRequest, getHistory, closeStaleShift, loading: actionLoading, error: actionError
    } = useAttendanceActions({
        userId,
        companyId,
        location,
        locationStatus,
        distance,
        isOffline,
        companyConfig,
        currentUser, // ✅ Pass currentUser down
        onSuccess: refreshTodayRecord // Callback to update local state immediately
    });

    // ===================================================
    // 🎯 RETURN UNIFIED API
    // ===================================================
    return {
        // === Data ===
        todayRecord,
        attendanceLogs,
        schedules,
        todaySchedule,

        // === GPS ===
        location,
        locationStatus,
        distance,
        gpsError,
        retryGps,

        // === Status & Config ===
        companyConfig,
        loading: dataLoading || actionLoading,
        error: actionError,
        isOffline,
        pendingOfflineCount: pendingCount,

        // === Actions ===
        clockIn,
        clockOut,
        submitRetroRequest,
        getHistory,
        reload: refreshTodayRecord,
        syncOfflineData,

        // === Stale Shift Management ===
        isStuck,
        staleCheckIn,
        closeStaleShift
    };
}
