import { collection, addDoc, query, where, getDocs, orderBy, limit, serverTimestamp, Timestamp, doc, setDoc, increment, getDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/shared/lib/firebase';

/**
 * Helper: Update User's Monthly Stats (Zero-Cost Aggregation)
 * Path: users/{userId}/stats/{YYYY-MM}
 */
async function updateMonthlyStats(userId, companyId, dateStr, updates, eventData = null) {
    try {
        const monthStr = dateStr.substring(0, 7); // YYYY-MM
        const statsRef = doc(db, 'users', userId, 'stats', monthStr);

        const payload = {
            companyId,
            month: monthStr,
            updatedAt: serverTimestamp(),
            ...updates
        };

        if (eventData) {
            payload.attendanceEvents = arrayUnion(eventData);
        }

        // Use setDoc with merge: true to create or update
        await setDoc(statsRef, payload, { merge: true });

    } catch (e) {
        console.error('⚠️ Failed to update Monthly Stats:', e);
    }
}

/**
 * Attendance Repository - Firestore operations for attendance
 */
export const attendanceRepo = {
    /**
     * Clock in
     * @param {Object} data - Clock in data
     * @returns {Promise<Object>} Document reference
     */
    async clockIn(data) {
        try {
            // 1. Write to Standard Collection (Detailed Log)
            const dateStr = data.localTimestamp.split('T')[0]; // Extract YYYY-MM-DD
            const docRef = await addDoc(collection(db, 'attendance'), {
                ...data,
                date: dateStr, // ✅ Optimization: Add queryable date field
                type: 'clock-in',
                createdAt: serverTimestamp()
            });

            // 2. Zero-Cost Strategy: Updates

            // 2.1 Update Daily Summary (Company Level)
            try {
                const summaryRef = doc(db, 'companies', data.companyId, 'daily_attendance', dateStr);
                const userSummary = {
                    timeIn: data.localTimestamp,
                    status: data.status,
                    location: data.location,
                    timestamp: new Date().toISOString()
                };

                await setDoc(summaryRef, {
                    date: dateStr,
                    lastUpdated: serverTimestamp(),
                    attendance: { [data.userId]: userSummary }
                }, { merge: true });
            } catch (summaryError) { console.error('⚠️ Daily Summary Error:', summaryError); }

            // 2.2 Update Monthly Stats (User Level)
            // Increment 'presentDays'. If late, increment 'lateCount'.
            // Note: We can't easily calculate 'lateMins' here without schedule, unless passed in data.
            // Assumption: 'data.status' == 'late' is accurate from frontend.
            // Log Event for Payroll
            await updateMonthlyStats(data.userId, data.companyId, dateStr, {
                presentDays: increment(1),
                lateCount: data.status === 'late' ? increment(1) : increment(0),
                // lateMins: increment(data.lateMins || 0) // Future: Pass lateMins from frontend
            }, {
                type: 'clock-in',
                time: data.localTimestamp,
                status: data.status
            });

            return docRef;
        } catch (error) {
            console.error('Error clocking in:', error);
            throw error;
        }
    },

    /**
     * Clock out
     * @param {Object} data - Clock out data
     * @returns {Promise<Object>} Document reference
     */
    async clockOut(data) {
        try {
            // 1. Write to Standard Collection
            const dateStr = data.localTimestamp.split('T')[0];
            const docRef = await addDoc(collection(db, 'attendance'), {
                ...data,
                date: dateStr, // ✅ Optimization: Add queryable date field
                type: 'clock-out',
                createdAt: serverTimestamp()
            });

            // 2. Zero-Cost Strategy: Updates

            // 2.1 Update Daily Summary (Company Level)
            try {
                const summaryRef = doc(db, 'companies', data.companyId, 'daily_attendance', dateStr);
                await setDoc(summaryRef, {
                    attendance: {
                        [data.userId]: {
                            timeOut: data.localTimestamp,
                            status: 'completed'
                        }
                    }
                }, { merge: true });
            } catch (summaryError) { console.error('⚠️ Daily Summary Error:', summaryError); }

            // 2.2 Update Monthly Stats (User Level)
            // Calculate OT Hours if passed, or just record work hours
            // For now, we rely on Frontend to pass 'otHours' if calculated, or we just increment checkOut count
            // Log Event for Payroll
            await updateMonthlyStats(data.userId, data.companyId, dateStr, {
                // No scalar increments on clock-out for now, mostly handled in clock-in
            }, {
                type: 'clock-out',
                time: data.localTimestamp,
                status: 'completed'
            });

            return docRef;
        } catch (error) {
            console.error('Error clocking out:', error);
            throw error;
        }
    },

    /**
     * Get attendance records by user
     * @param {string} userId 
     * @param {Date} startDate 
     * @param {Date} endDate 
     * @returns {Promise<Array>} Attendance records
     */
    async getRecordsByUser(userId, startDate, endDate) {
        try {
            const q = query(
                collection(db, 'attendance'),
                where('userId', '==', userId),
                where('createdAt', '>=', Timestamp.fromDate(startDate)),
                where('createdAt', '<=', Timestamp.fromDate(endDate)),
                orderBy('createdAt', 'desc')
            );

            const snap = await getDocs(q);
            return snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting attendance records:', error);
            throw error;
        }
    },

    /**
     * Get today's record for a user
     * @param {string} userId 
     * @returns {Promise<Object|null>} Today's record
     */
    async getTodayRecord(userId) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const q = query(
                collection(db, 'attendance'),
                where('userId', '==', userId),
                where('createdAt', '>=', Timestamp.fromDate(today)),
                orderBy('createdAt', 'desc'),
                limit(1)
            );

            const snap = await getDocs(q);
            if (snap.empty) return null;

            return {
                id: snap.docs[0].id,
                ...snap.docs[0].data()
            };
        } catch (error) {
            console.error('Error getting today record:', error);
            throw error;
        }
    },

    /**
     * Get attendance records by company
     * @param {string} companyId 
     * @param {Date} startDate 
     * @param {Date} endDate 
     * @returns {Promise<Array>} Attendance records
     */
    async getRecordsByCompany(companyId, startDate, endDate) {
        try {
            const q = query(
                collection(db, 'attendance'),
                where('companyId', '==', companyId),
                where('createdAt', '>=', Timestamp.fromDate(startDate)),
                where('createdAt', '<=', Timestamp.fromDate(endDate)),
                orderBy('createdAt', 'desc')
            );

            const snap = await getDocs(q);
            return snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting company attendance records:', error);
            throw error;
        }
    }
};
