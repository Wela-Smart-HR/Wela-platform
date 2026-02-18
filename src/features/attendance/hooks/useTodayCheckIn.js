import { useState, useEffect } from 'react';
import { db } from '@/shared/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { DateUtils } from '@/shared/kernel/DateUtils';

/**
 * useTodayCheckIn
 * 
 * Centralized hook to determine the "Current Attendance Status" of an employee.
 * Uses "Last Action" logic instead of simple time-range query to support:
 * 1. Cross-day shifts (e.g. 22:00 - 05:00)
 * 2. Stale check-in detection (>20 hours)
 * 3. Immediate UI updates via 'estimate' server timestamps
 */
export function useTodayCheckIn(userId) {
    const [status, setStatus] = useState({
        todayRecord: null,      // The active or latest record
        isCheckedIn: false,     // True if currently working
        isStuck: false,         // True if forgot to clock out (>20 hours)
        staleCheckIn: null,     // The specific record that is stuck
        lastAction: 'NONE',     // 'IN' | 'OUT' | 'NONE'
        currentSessionStart: null,
        loading: true,
        error: null
    });

    useEffect(() => {
        if (!userId) {
            setStatus(prev => ({ ...prev, loading: false }));
            return;
        }

        // 1. Query Last Action (Limit 1, Descending)
        // We don't filter by date here because we need to know the *latest* state regardless of when it happened.
        // 1. Query Last Action (Limit 1, Descending)
        // Optimization: Limit to last 7 days to enable Range Index and avoid full scan
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const q = query(
            collection(db, "attendance_logs"),
            where("employee_id", "==", userId),
            where("clock_in", ">=", sevenDaysAgo.toISOString()),
            where("clock_in", "<", "3000-01-01"), // Filter out invalid dates like "undefined..."
            orderBy("clock_in", "desc"),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            try {
                if (snapshot.empty) {
                    setStatus({
                        todayRecord: null,
                        isCheckedIn: false,
                        isStuck: false,
                        staleCheckIn: null,
                        lastAction: 'NONE',
                        currentSessionStart: null,
                        loading: false,
                        error: null
                    });
                    return;
                }

                // 2. Get Latest Record
                // Use 'estimate' to handle local writes immediately
                const doc = snapshot.docs[0];
                const data = doc.data({ serverTimestamps: 'estimate' });
                const record = { id: doc.id, ...data };

                // Parse Dates Safely
                const clockInTime = parseDate(record.clock_in);
                const clockOutTime = parseDate(record.clock_out);

                // Add parsed dates to record for UI convenience
                record.clockIn = clockInTime;
                record.clockOut = clockOutTime;

                // 3. Analyze Status
                let isCheckedIn = false;
                let isStuck = false;
                let staleCheckIn = null;
                let lastAction = 'NONE';
                let currentSessionStart = null;
                let todayRecord = record;

                if (!clockOutTime) {
                    // === Case A: Currently Working (No Clock Out) ===
                    lastAction = 'IN';
                    currentSessionStart = clockInTime;

                    // Check for Stale Check-in (> 20 Hours)
                    if (clockInTime) {
                        const hoursSinceIn = (new Date() - clockInTime) / (1000 * 60 * 60);
                        if (hoursSinceIn > 20) {
                            // User forgot to clock out yesterday
                            isStuck = true;
                            staleCheckIn = record;
                            isCheckedIn = false; // Forced false to allow "Closing" flow
                        } else {
                            // Normal working state
                            isCheckedIn = true;
                        }
                    }
                } else {
                    // === Case B: Completed Session (Has Clock Out) ===
                    lastAction = 'OUT';

                    // Check if this session belongs to "Today's Business Day"
                    // Business Day starts at 04:00 AM
                    const businessDateRaw = DateUtils.getBusinessDate(new Date(), 4);
                    // Note: We use 4 AM cutoff as per requirements

                    const sessionDate = DateUtils.getBusinessDate(clockInTime, 4);

                    // If the latest session is from yesterday (or older),
                    // then for *today*, the user is "Ready to Check In" (not checked in).
                    // If the latest session is from today, user is "Checked Out" (for today).

                    // In both cases, isCheckedIn is false.
                    isCheckedIn = false;
                }

                // === Contextual Filtering (Fix for Dashboard) ===
                // If the latest record is from a previous business day and is COMPLETED (clocked out),
                // it should NOT be returned as 'todayRecord'. 
                // (e.g. Today is 18th, latest record is 16th -> Should show empty, not 16th)
                const todayBusinessDate = DateUtils.getBusinessDate(new Date(), 4); // "YYYY-MM-DD"
                const recordBusinessDate = DateUtils.getBusinessDate(clockInTime, 4);

                if (recordBusinessDate < todayBusinessDate && clockOutTime) {
                    todayRecord = null;
                }

                setStatus({
                    todayRecord,
                    isCheckedIn,
                    isStuck,
                    staleCheckIn,
                    lastAction,
                    currentSessionStart,
                    loading: false,
                    error: null
                });

            } catch (err) {
                console.error("[useTodayCheckIn] Error processing snapshot:", err);
                setStatus(prev => ({ ...prev, loading: false, error: err.message }));
            }
        }, (err) => {
            console.error("[useTodayCheckIn] Snapshot error:", err);
            setStatus(prev => ({ ...prev, loading: false, error: err.message }));
        });

        return () => unsubscribe();
    }, [userId]);

    return status;
}

// Helper to safe parse date from Firestore or String
function parseDate(val) {
    if (!val) return null;
    if (val && typeof val.toDate === 'function') return val.toDate();
    if (val instanceof Date) return val;
    const d = new Date(val);
    return !isNaN(d.getTime()) ? d : null;
}
