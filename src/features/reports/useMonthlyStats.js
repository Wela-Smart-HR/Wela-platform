import { useState, useEffect } from 'react';
import { db } from '../../shared/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

/**
 * Hook to fetch aggregated stats for ALL users in a company for a specific month.
 * Zero-Cost Strategy: Reads `users/{uid}/stats/{YYYY-MM}` subcollection derived data.
 * 
 * Note: Firestore doesn't support "Collection Group Query" strictly by parent ID easily without index.
 * Only way to read ALL users' stats for a month efficiently:
 * 1. Read all users (Paginated/Cached).
 * 2. For each user, read `stats/{YYYY-MM}` doc (or use `getAllStatsForMonth` if we structured it differently).
 * 
 * Alternative Structure Optimization:
 * If we need to read stats for ALL users often, better to store them in `companies/{cid}/monthly_stats/{YYYY-MM}`
 * containing a map of all users (like Daily Summary).
 * 
 * Current Approach (As per Plan): `users/{uid}/stats/{YYYY-MM}`
 * This is good for "My Profile" but bad for "Admin Reports" (N Reads).
 * 
 * REVISITING STRATEGY:
 * To make Reports Zero-Cost (1 Read), we need a Company-Level Monthly Summary.
 * Structure: `companies/{cid}/monthly_stats/{YYYY-MM}`
 * 
 * I will implement a Hybrid Hook that tries to fetch Company-Level Summary if available.
 * But since we just implemented User-Level writing in Repo, let's stick to User-Level logic for now,
 * but optimize it with parallel fetching or lazy loading.
 */
export function useMonthlyStats(companyId, monthDate) {
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!companyId || !monthDate) return;

        const fetchStats = async () => {
            setLoading(true);
            try {
                // Construct YYYY-MM
                const year = monthDate.getFullYear();
                const month = String(monthDate.getMonth() + 1).padStart(2, '0');
                const monthStr = `${year}-${month}`;

                // 1. Get List of Employees (Should come from cache/context in real app)
                const qUsers = query(collection(db, 'users'), where('companyId', '==', companyId), where('role', '==', 'employee'));
                const userSnap = await getDocs(qUsers);

                const statsMap = {};

                // 2. Fetch Stats for each user (Parallel)
                // WARNING: potentially N reads. 
                // Optimization: In real Zero-Cost v2, we should move this to a single company doc.
                // For now, this is still better than reading 30 attendance docs per user.
                const promises = userSnap.docs.map(async (userDoc) => {
                    const userId = userDoc.id;
                    const statRef = doc(db, 'users', userId, 'stats', monthStr);
                    const statSnap = await getDoc(statRef);

                    if (statSnap.exists()) {
                        statsMap[userId] = statSnap.data();
                    } else {
                        // Default empty stats
                        statsMap[userId] = {
                            presentDays: 0,
                            lateCount: 0,
                            lateMins: 0,
                            absentCount: 0
                        };
                    }
                });

                await Promise.all(promises);
                setStats(statsMap);

            } catch (err) {
                console.error("Error fetching monthly stats:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [companyId, monthDate]);

    return { stats, loading };
}
