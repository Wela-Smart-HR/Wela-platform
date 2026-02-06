import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/shared/lib/firebase';

/**
 * Schedule Repository - Firestore operations for schedules
 */
export const scheduleRepo = {
    /**
     * Create schedule
     * @param {Object} scheduleData 
     * @returns {Promise<Object>}
     */
    async createSchedule(scheduleData) {
        try {
            return await addDoc(collection(db, 'schedules'), {
                ...scheduleData,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error creating schedule:', error);
            throw error;
        }
    },

    /**
     * Get schedules by company (with date range)
     * @param {string} companyId 
     * @param {string} startDate - YYYY-MM-DD
     * @param {string} endDate - YYYY-MM-DD
     * @returns {Promise<Array>}
     */
    async getSchedulesByCompany(companyId, startDate, endDate) {
        try {
            // ✅ Optimization: Enforce Date Range to avoid fetching full history
            const q = query(
                collection(db, 'schedules'),
                where('companyId', '==', companyId),
                where('date', '>=', startDate),
                where('date', '<=', endDate)
            );

            const snap = await getDocs(q);
            return snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting schedules:', error);
            throw error;
        }
    },

    /**
     * Get schedule by user (for specific date)
     * @param {string} userId 
     * @param {string} date - YYYY-MM-DD
     * @returns {Promise<Object|null>}
     */
    async getScheduleByUser(userId, date) {
        try {
            // ✅ Optimization: Fetch specific day only.
            // ID format is usually: `${userId}_${date}` (based on Schedule.jsx)
            // But we query to be safe if ID structure changes.
            const q = query(
                collection(db, 'schedules'),
                where('userId', '==', userId),
                where('date', '==', date)
            );

            const snap = await getDocs(q);
            if (snap.empty) return null;

            return {
                id: snap.docs[0].id,
                ...snap.docs[0].data()
            };
        } catch (error) {
            console.error('Error getting user schedule:', error);
            throw error;
        }
    },

    /**
     * Update schedule
     * @param {string} scheduleId 
     * @param {Object} updates 
     * @returns {Promise<void>}
     */
    async updateSchedule(scheduleId, updates) {
        try {
            await updateDoc(doc(db, 'schedules', scheduleId), {
                ...updates,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating schedule:', error);
            throw error;
        }
    },

    /**
     * Delete schedule
     * @param {string} scheduleId 
     * @returns {Promise<void>}
     */
    async deleteSchedule(scheduleId) {
        try {
            await deleteDoc(doc(db, 'schedules', scheduleId));
        } catch (error) {
            console.error('Error deleting schedule:', error);
            throw error;
        }
    }
};
