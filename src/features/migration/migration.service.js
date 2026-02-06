import { db } from '@/shared/lib/firebase';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';

export const migrationService = {
    /**
     * Backfill Daily Summaries for a specific month
     * Reads ALL attendance records for the month (Expensive, Run ONCE)
     * Writes to `companies/{cid}/daily_attendance/{date}`
     */
    async syncDailyStats(companyId, selectedMonth) {
        try {
            console.log("Starting Migration for:", selectedMonth);

            // 1. Calculate Date Range (String format YYYY-MM-DD)
            const year = selectedMonth.getFullYear();
            const month = selectedMonth.getMonth() + 1;
            const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endStr = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

            // 2. Fetch ALL Attendance (using 'date' string like legacy system)
            // This ensures we catch the exact same records the old report used to show.
            const q = query(
                collection(db, 'attendance'),
                where('companyId', '==', companyId),
                where('date', '>=', startStr),
                where('date', '<=', endStr)
            );
            const snap = await getDocs(q);
            const attendanceList = snap.docs.map(d => d.data());

            // 3. Group by Date
            const dailyMap = {}; // { "2024-02-01": { userId: { ... } } }

            attendanceList.forEach(att => {
                if (!att.createdAt) return;
                // Convert timestamp to YYYY-MM-DD (Local Time approximation)
                // Note: att.createdAt is UTC. att.localTimestamp is better if available.
                let dateKey;
                if (att.localTimestamp) {
                    dateKey = att.localTimestamp.split('T')[0];
                } else if (att.date) {
                    dateKey = att.date;
                } else {
                    const d = att.createdAt.toDate ? att.createdAt.toDate() : new Date(att.createdAt);
                    dateKey = d.toISOString().split('T')[0];
                }

                if (!dailyMap[dateKey]) dailyMap[dateKey] = {};

                // Merge logic (Last write wins or smart merge)
                const existing = dailyMap[dateKey][att.userId] || {};

                if (att.type === 'clock-in') {
                    dailyMap[dateKey][att.userId] = {
                        ...existing,
                        timeIn: att.localTimestamp || att.createdAt,
                        status: att.status || 'on-time',
                        location: att.location,
                        timestamp: att.createdAt // for sorting
                    };
                } else if (att.type === 'clock-out') {
                    dailyMap[dateKey][att.userId] = {
                        ...existing,
                        timeOut: att.localTimestamp || att.createdAt,
                        status: 'completed' // if clocked out
                    };
                }
            });

            // 4. Batch Write
            const batch = writeBatch(db);
            let count = 0;

            Object.entries(dailyMap).forEach(([dateStr, attendanceMap]) => {
                const docRef = doc(db, 'companies', companyId, 'daily_attendance', dateStr);
                batch.set(docRef, {
                    date: dateStr,
                    attendance: attendanceMap,
                    lastUpdated: serverTimestamp()
                }, { merge: true });
                count++;
            });

            await batch.commit();
            console.log(`Migrated ${count} days.`);
            return count;

        } catch (error) {
            console.error("Migration Error:", error);
            throw error;
        }
    }
};
