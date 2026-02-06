import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '@/shared/lib/firebase';

/**
 * Requests Repository - Firestore operations for leave/adjustment requests
 */
export const requestsRepo = {
    /**
     * Create request
     * @param {Object} requestData 
     * @returns {Promise<Object>}
     */
    async createRequest(requestData) {
        try {
            return await addDoc(collection(db, 'requests'), {
                ...requestData,
                status: 'pending',
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error creating request:', error);
            throw error;
        }
    },

    /**
     * Get requests by user
     * @param {string} userId 
     * @returns {Promise<Array>}
     */
    async getRequestsByUser(userId) {
        try {
            const q = query(
                collection(db, 'requests'),
                where('userId', '==', userId)
            );

            const snap = await getDocs(q);
            return snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting user requests:', error);
            throw error;
        }
    },

    /**
     * Get requests by company (for admin)
     * @param {string} companyId 
     * @param {string} status - 'pending', 'approved', 'rejected', or 'all'
     * @returns {Promise<Array>}
     */
    async getRequestsByCompany(companyId, status = 'all') {
        try {
            let constraints = [
                where('companyId', '==', companyId),
                orderBy('createdAt', 'desc'), // Show newest first
                limit(100) // ✅ Optimization: Limit to last 100 requests to save costs
            ];

            if (status !== 'all') {
                constraints.push(where('status', '==', status));
            }

            const q = query(collection(db, 'requests'), ...constraints);

            const snap = await getDocs(q);
            return snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting company requests:', error);
            throw error;
        }
    },

    /**
     * Update request status (approve/reject)
     * @param {string} requestId 
     * @param {string} status - 'approved' or 'rejected'
     * @param {string} adminNote - Optional note from admin
     * @returns {Promise<void>}
     */
    async updateRequestStatus(requestId, status, adminNote = '') {
        try {
            await updateDoc(doc(db, 'requests', requestId), {
                status,
                adminNote,
                processedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating request status:', error);
            throw error;
        }
    },

    /**
     * Delete request (only if pending)
     * @param {string} requestId 
     * @returns {Promise<void>}
     */
    async deleteRequest(requestId) {
        try {
            await deleteDoc(doc(db, 'requests', requestId));
        } catch (error) {
            console.error('Error deleting request:', error);
            throw error;
        }
    }
};
