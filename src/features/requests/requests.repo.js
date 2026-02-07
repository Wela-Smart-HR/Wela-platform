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
            const requestRef = doc(db, 'requests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) throw new Error("Request not found");
            const request = requestSnap.data();

            // 1. Update Request Status
            await updateDoc(requestRef, {
                status,
                adminNote,
                processedAt: serverTimestamp()
            });

            // 2. If Approved -> Apply Changes to System
            if (status === 'approved') {

                // CASE A: Leave Request (ลา) -> Create Schedule (Leave) & Add Attendance Log
                if (request.type === 'leave') {
                    // ✅ Fix: Handle both new (nested data) and old (flat) structure
                    const requestData = request.data || request;
                    const { startDate, endDate, leaveType, reason } = requestData;

                    // Fallback for legacy date field if startDate is missing
                    const effectiveDate = startDate || request.date;

                    // Add to Schedules (Mark as Leave)
                    const scheduleRef = collection(db, 'schedules');
                    await addDoc(scheduleRef, {
                        userId: request.userId,
                        companyId: request.companyId,
                        date: effectiveDate,
                        shiftId: 'LEAVE',
                        type: 'leave',
                        leaveType: leaveType,
                        note: reason || adminNote,
                        createdAt: serverTimestamp()
                    });
                }

                // CASE B: Retro/Time Adjustment (แก้เวลา) -> Insert Attendance Record
                // Note: Check both 'retro' (new) and 'adjustment' (old/legacy) types
                if (request.type === 'retro' || request.type === 'adjustment' || request.type === 'unscheduled_alert') {
                    // ✅ Fix: Handle both new and old structure
                    const requestData = request.data || request;
                    const { date, timeIn, timeOut } = requestData;

                    // Fallback for legacy targetDate
                    const effectiveDate = date || request.targetDate;

                    if (timeIn) {
                        const dateTimeIn = new Date(`${effectiveDate}T${timeIn}:00`);
                        await addDoc(collection(db, 'attendance'), {
                            userId: request.userId,
                            companyId: request.companyId,
                            date: effectiveDate,
                            localTimestamp: `${effectiveDate}T${timeIn}:00`,
                            type: 'clock-in',
                            status: 'adjusted', // Mark as manual adjustment
                            note: `Approved Request: ${adminNote}`,
                            createdAt: Timestamp.fromDate(dateTimeIn)
                        });
                    }

                    if (timeOut) {
                        const dateTimeOut = new Date(`${effectiveDate}T${timeOut}:00`);
                        await addDoc(collection(db, 'attendance'), {
                            userId: request.userId,
                            companyId: request.companyId,
                            date: effectiveDate,
                            localTimestamp: `${effectiveDate}T${timeOut}:00`,
                            type: 'clock-out',
                            status: 'adjusted',
                            note: `Approved Request: ${adminNote}`,
                            createdAt: Timestamp.fromDate(dateTimeOut)
                        });
                    }
                }
            }

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
