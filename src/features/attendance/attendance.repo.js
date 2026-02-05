import { collection, addDoc, query, where, getDocs, orderBy, limit, serverTimestamp, Timestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '@/shared/lib/firebase';

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
            const docRef = await addDoc(collection(db, 'attendance'), {
                ...data,
                type: 'clock-in',
                createdAt: serverTimestamp()
            });

            // 2. Zero-Cost Strategy: Update Daily Summary Document
            // Path: companies/{companyId}/daily_attendance/{YYYY-MM-DD}
            try {
                const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                const summaryRef = doc(db, 'companies', data.companyId, 'daily_attendance', todayStr);

                // Prepare Denormalized Data
                const userSummary = {
                    timeIn: data.localTimestamp,
                    status: data.status,
                    location: data.location,
                    timestamp: new Date().toISOString() // for sorting
                };

                // Merge data (create doc if not exists)
                await setDoc(summaryRef, {
                    date: todayStr,
                    lastUpdated: serverTimestamp(),
                    // Add user to map: "attendance.{userId}"
                    attendance: {
                        [data.userId]: userSummary
                    }
                }, { merge: true });

            } catch (summaryError) {
                console.error('⚠️ Failed to update Daily Summary (Non-fatal):', summaryError);
                // Don't throw error here, as the main clock-in was successful
            }

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
            const docRef = await addDoc(collection(db, 'attendance'), {
                ...data,
                type: 'clock-out',
                createdAt: serverTimestamp()
            });

            // 2. Zero-Cost Strategy: Update Daily Summary
            try {
                const todayStr = new Date().toISOString().split('T')[0];
                const summaryRef = doc(db, 'companies', data.companyId, 'daily_attendance', todayStr);

                await setDoc(summaryRef, {
                    attendance: {
                        [data.userId]: {
                            timeOut: data.localTimestamp,
                            status: 'completed'
                        }
                    }
                }, { merge: true });

            } catch (summaryError) {
                console.error('⚠️ Failed to update Daily Summary (Non-fatal):', summaryError);
            }

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
