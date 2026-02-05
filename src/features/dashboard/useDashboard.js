import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../shared/lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';

/**
 * Hook for Admin Dashboard Logic (Zero-Cost Strategy)
 * Reads from: companies/{cid}/daily_attendance/{date} (Single Doc)
 */
export function useDashboard() {
    const { currentUser } = useAuth();

    // --- STATE ---
    const [companyName, setCompanyName] = useState('กำลังโหลด...');
    const [stats, setStats] = useState({
        totalEmployees: 0,   // From company config/counter
        activeNow: 0,        // From daily summary
        lateToday: 0,        // From daily summary
        payrollForecast: 0   // Calculated locally or from summary
    });
    const [loading, setLoading] = useState(true);

    // --- 1. Fetch Company Info (Once) ---
    useEffect(() => {
        async function fetchCompanyInfo() {
            if (currentUser?.companyId) {
                try {
                    const docRef = doc(db, "companies", currentUser.companyId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setCompanyName(data.name || "My Company");

                        // If we have aggregated counters in company doc (Recommended for Zero-Cost)
                        setStats(prev => ({
                            ...prev,
                            totalEmployees: data.totalEmployees || 0, // Fallback to 0 if not implemented yet
                            payrollForecast: data.estimatedPayroll || 0
                        }));
                    }
                } catch (error) {
                    console.error("Error fetching company info:", error);
                }
            }
        }
        fetchCompanyInfo();
    }, [currentUser]);

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
