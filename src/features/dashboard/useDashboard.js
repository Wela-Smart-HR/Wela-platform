import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalConfig } from '../../contexts/ConfigContext';
import { db } from '../../shared/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

/**
 * Hook for Admin Dashboard Logic (Zero-Cost Strategy)
 * Reads from: companies/{cid}/daily_attendance/{date} (Single Doc)
 */
export function useDashboard() {
    const { currentUser } = useAuth();
    const { companyConfig, loading: configLoading } = useGlobalConfig();

    // --- STATE ---
    const [stats, setStats] = useState({
        totalEmployees: 0,   // From company config/counter
        activeNow: 0,        // From daily summary
        lateToday: 0,        // From daily summary
        payrollForecast: 0   // Calculated locally or from summary
    });
    const [loading, setLoading] = useState(true);

    // --- 1. Sync from Global Config ---
    useEffect(() => {
        if (companyConfig) {
            setStats(prev => ({
                ...prev,
                totalEmployees: companyConfig.totalEmployees || 0,
                payrollForecast: companyConfig.estimatedPayroll || 0
            }));
        }
    }, [companyConfig]);

    const companyName = companyConfig?.name || "My Company";

    // --- 2. Listen to Daily Summary (Real-time, Single Doc) ---
    useEffect(() => {
        if (!currentUser?.companyId) return;

        const todayStr = new Date().toISOString().split('T')[0];
        const summaryRef = doc(db, 'companies', currentUser.companyId, 'daily_attendance', todayStr);

        // ⚡ Zero-Cost Magic: 1 Listener = 1 Read for the whole day updates
        const unsubscribe = onSnapshot(summaryRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const attendanceMap = data.attendance || {};
                const attendanceList = Object.values(attendanceMap);

                // Calculate Stats client-side from the summary doc
                // (Since summary doc is small enough to process in memory)
                let active = 0;
                let late = 0;

                attendanceList.forEach(record => {
                    // Start of day logic (simplified)
                    // You might want to filter only "active" sessions if you track clock-outs
                    if (record.status !== 'absent') {
                        active++;
                    }

                    if (record.status === 'late') {
                        late++;
                    }
                });

                setStats(prev => ({
                    ...prev,
                    activeNow: active,
                    lateToday: late
                }));
            } else {
                // No one clocked in yet today
                setStats(prev => ({ ...prev, activeNow: 0, lateToday: 0 }));
            }
            setLoading(false);
        }, (error) => {
            console.error("Error listening to dashboard summary:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    return {
        companyName,
        stats,
        loading
    };
}
