import { useState, useCallback } from 'react';
import { db } from '@/shared/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

/**
 * useAttendanceHistory
 * 
 * Hook to fetch historical attendance logs on demand.
 * Separates "Current Status" logic from "Reporting" logic.
 */
export function useAttendanceHistory() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Fetch logs by range
     * @param {string} userId 
     * @param {Date} startDate 
     * @param {Date} endDate 
     */
    const fetchHistory = useCallback(async (userId, startDate, endDate) => {
        if (!userId || !startDate || !endDate) return;

        setLoading(true);
        setError(null);

        try {
            // Ensure dates are ISO strings for querying
            const startStr = startDate.toISOString();
            const endStr = endDate.toISOString();

            const q = query(
                collection(db, "attendance_logs"),
                where("employee_id", "==", userId),
                where("clock_in", ">=", startStr),
                where("clock_in", "<=", endStr),
                orderBy("clock_in", "desc")
            );

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                clockIn: doc.data().clock_in ? new Date(doc.data().clock_in) : null,
                clockOut: doc.data().clock_out ? new Date(doc.data().clock_out) : null,
            }));

            setLogs(data);
        } catch (err) {
            console.error("[useAttendanceHistory] Error fetching history:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    return { logs, loading, error, fetchHistory };
}
