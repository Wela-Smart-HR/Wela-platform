
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, orderBy, limit, runTransaction, increment } from 'firebase/firestore';
import { db } from '@/shared/lib/firebase';
import { updateMonthlyStats, updateDailySummary } from '../attendance/attendance.utils';

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
            await runTransaction(db, async (transaction) => {
                // --- 1. READ PHASE (Reads MUST come before Writes) ---
                const requestRef = doc(db, 'requests', requestId);
                const requestSnap = await transaction.get(requestRef);

                if (!requestSnap.exists()) throw new Error("Request not found");
                const request = requestSnap.data();

                // Pre-fetch User Data if approving (to avoid Read-after-Write error)
                let userData = {};
                if (status === 'approved') {
                    const userRef = doc(db, 'users', request.userId);
                    const userSnap = await transaction.get(userRef);
                    userData = userSnap.exists() ? userSnap.data() : {};
                }

                // --- 2. WRITE PHASE (Only Writes/Updates allowed here) ---

                // 2.1 Update Request Status
                transaction.update(requestRef, {
                    status,
                    adminNote,
                    processedAt: serverTimestamp()
                });

                // 2.2 If Approved -> Apply Changes to System
                if (status === 'approved') {

                    // CASE A: Leave Request (ลา) -> Create Schedule (Leave) & Add Attendance Log
                    if (request.type === 'leave') {
                        // Handle both new (nested data) and old (flat) structure
                        const requestData = request.data || request;
                        const { startDate, endDate, leaveType, reason } = requestData;

                        // Fallback for legacy date field if startDate is missing
                        const effectiveDate = startDate || request.date;

                        // Add to Schedules (Mark as Leave)
                        // Use Deterministic ID to Overwrite existing work schedule
                        const scheduleId = `${request.userId}_${effectiveDate}`;
                        const newScheduleRef = doc(db, 'schedules', scheduleId);

                        transaction.set(newScheduleRef, {
                            userId: request.userId,
                            companyId: request.companyId,
                            date: effectiveDate,
                            shiftId: 'LEAVE',
                            type: 'leave',
                            leaveType: leaveType,
                            note: reason || adminNote,
                            createdAt: serverTimestamp(),
                            // Use pre-fetched User Details
                            userName: userData.name || request.userName || 'Unknown',
                            userRole: userData.position || 'Employee',
                            userAvatar: userData.avatar || null
                        });

                        // Zero-Cost: Update User Stats
                        // Calculate days count
                        let daysCount = 1;
                        if (startDate && endDate) {
                            const start = new Date(startDate);
                            const end = new Date(endDate);
                            const diffTime = Math.abs(end - start);
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            daysCount = diffDays + 1; // Inclusive
                        }

                        // updateMonthlyStats uses transaction.set (Write) - OK
                        await updateMonthlyStats(transaction, request.userId, request.companyId, effectiveDate, {
                            leaveCount: increment(daysCount)
                        }, {
                            type: 'leave',
                            date: effectiveDate,
                            reason: reason || leaveType
                        });
                    }

                    // CASE B: Retro/Time Adjustment (แก้เวลา) -> Insert Attendance Record
                    if (request.type === 'retro' || request.type === 'adjustment' || request.type === 'unscheduled_alert') {
                        const requestData = request.data || request;
                        const { date, timeIn, timeOut } = requestData;
                        const effectiveDate = date || request.targetDate;

                        if (timeIn) {
                            const dateTimeIn = new Date(`${effectiveDate}T${timeIn}:00`);
                            const newAttInRef = doc(collection(db, 'attendance'));
                            transaction.set(newAttInRef, {
                                userId: request.userId,
                                companyId: request.companyId,
                                date: effectiveDate,
                                localTimestamp: `${effectiveDate}T${timeIn}:00`,
                                type: 'clock-in',
                                status: 'adjusted',
                                note: `Approved Request: ${adminNote}`,
                                createdAt: Timestamp.fromDate(dateTimeIn)
                            });

                            const userSummary = {
                                timeIn: `${effectiveDate}T${timeIn}:00`,
                                status: 'adjusted',
                                location: { lat: 0, lng: 0, name: 'Manual Adjustment' },
                                timestamp: new Date().toISOString()
                            };
                            await updateDailySummary(transaction, request.companyId, effectiveDate, request.userId, userSummary);

                            await updateMonthlyStats(transaction, request.userId, request.companyId, effectiveDate, {
                                presentDays: increment(1),
                                lateCount: increment(0)
                            }, {
                                type: 'clock-in (adjusted)',
                                time: `${effectiveDate}T${timeIn}:00`,
                                status: 'adjusted'
                            });
                        }

                        if (timeOut) {
                            const dateTimeOut = new Date(`${effectiveDate}T${timeOut}:00`);
                            const newAttOutRef = doc(collection(db, 'attendance'));
                            transaction.set(newAttOutRef, {
                                userId: request.userId,
                                companyId: request.companyId,
                                date: effectiveDate,
                                localTimestamp: `${effectiveDate}T${timeOut}:00`,
                                type: 'clock-out',
                                status: 'adjusted',
                                note: `Approved Request: ${adminNote}`,
                                createdAt: Timestamp.fromDate(dateTimeOut)
                            });

                            const userSummary = {
                                timeOut: `${effectiveDate}T${timeOut}:00`,
                                status: 'completed'
                            };
                            await updateDailySummary(transaction, request.companyId, effectiveDate, request.userId, userSummary);

                            await updateMonthlyStats(transaction, request.userId, request.companyId, effectiveDate, {}, {
                                type: 'clock-out (adjusted)',
                                time: `${effectiveDate}T${timeOut}:00`,
                                status: 'completed'
                            });
                        }
                    }
                }
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
