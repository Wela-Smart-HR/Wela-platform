
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
            // 0. Pre-fetch Request to get Date (for Attendance Lookup)
            // This is needed because transactions can't run queries for "find by date" easily
            const requestRef = doc(db, 'requests', requestId);
            const initialSnap = await getDoc(requestRef);
            if (!initialSnap.exists()) throw new Error("Request not found");
            const initialData = initialSnap.data();

            // 1. Find Existing Attendance Log (if approving a Retro/Adjustment)
            let existingLogId = null;
            if (status === 'approved' && (initialData.type === 'retro' || initialData.type === 'adjustment' || initialData.type === 'unscheduled_alert')) {
                const data = initialData.data || initialData;
                const d = data.date || initialData.targetDate;
                if (d) {
                    // Query attendance_logs by Date Range
                    const start = `${d}T00:00:00`;
                    const end = `${d}T23:59:59`;
                    const q = query(collection(db, 'attendance_logs'),
                        where('employee_id', '==', initialData.userId),
                        where('clock_in', '>=', start),
                        where('clock_in', '<=', end),
                        limit(1)
                    );
                    const snap = await getDocs(q);
                    if (!snap.empty) existingLogId = snap.docs[0].id;
                }
            }

            await runTransaction(db, async (transaction) => {
                // --- 1. READ PHASE (Reads MUST come before Writes) ---
                const requestSnap = await transaction.get(requestRef);
                if (!requestSnap.exists()) throw new Error("Request not found");
                const request = requestSnap.data();

                // Validation
                if (request.status !== 'pending') throw new Error("Request is not pending");

                // Pre-fetch User Data if approving
                let userData = {};
                if (status === 'approved') {
                    const userRef = doc(db, 'users', request.userId);
                    const userSnap = await transaction.get(userRef);
                    userData = userSnap.exists() ? userSnap.data() : {};
                }

                // Pre-fetch Attendance Log if found in step 1
                let logRef = null;
                let logSnap = null;
                if (existingLogId) {
                    logRef = doc(db, 'attendance_logs', existingLogId);
                    logSnap = await transaction.get(logRef);
                }

                // --- 2. WRITE PHASE ---

                // 2.1 Update Request Status
                transaction.update(requestRef, {
                    status,
                    adminNote,
                    processedAt: serverTimestamp()
                });

                // 2.2 If Approved -> Apply Changes
                if (status === 'approved') {

                    // CASE A: Leave Request (Same as before, simplified)
                    if (request.type === 'leave') {
                        const requestData = request.data || request;
                        const { startDate, endDate, leaveType, reason } = requestData;
                        const effectiveDate = startDate || request.date;
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
                            userName: userData.name || request.userName || 'Unknown',
                            userRole: userData.position || 'Employee',
                            userAvatar: userData.avatar || null
                        });

                        // Legacy Stats Update (Optional but keep for safety)
                        await updateMonthlyStats(transaction, request.userId, request.companyId, effectiveDate, {
                            leaveCount: increment(1)
                        }, { type: 'leave', date: effectiveDate });
                    }

                    // CASE B: Retro/Time Adjustment -> Write to attendance_logs
                    if (request.type === 'retro' || request.type === 'adjustment' || request.type === 'unscheduled_alert') {
                        const requestData = request.data || request;
                        const { date, timeIn, timeOut } = requestData;
                        const effectiveDate = date || request.targetDate;

                        // Helper to create Date Object from YYYY-MM-DD + HH:mm
                        const toISO = (d, t) => new Date(`${d}T${t}:00`).toISOString();

                        const updateData = {
                            status: 'adjusted',
                            note: `Approved Request: ${adminNote}`,
                            updated_at: new Date().toISOString()
                        };

                        if (timeIn) updateData.clock_in = toISO(effectiveDate, timeIn);
                        if (timeOut) updateData.clock_out = toISO(effectiveDate, timeOut);

                        if (logSnap && logSnap.exists()) {
                            // Update Existing
                            transaction.update(logRef, updateData);
                        } else {
                            // Create New
                            const newLogRef = doc(collection(db, 'attendance_logs'));
                            transaction.set(newLogRef, {
                                employee_id: request.userId,
                                company_id: request.companyId,
                                clock_in: updateData.clock_in || `${effectiveDate}T00:00:00.000Z`,
                                clock_out: updateData.clock_out || null,
                                clock_in_location: { lat: 0, lng: 0, address: 'Manual Adjustment' },
                                clock_out_location: null,
                                status: 'adjusted',
                                late_minutes: 0,
                                work_minutes: 0,
                                note: `Approved Request: ${adminNote}`,
                                updated_at: new Date().toISOString()
                            });
                        }

                        // --- Restore Zero-Cost Stats Updates ---
                        // 1. Daily Summary
                        const userSummary = {};
                        if (timeIn) {
                            userSummary.timeIn = updateData.clock_in; // Use ISO
                            userSummary.status = 'adjusted';
                            userSummary.location = { name: 'Manual Adjustment' };
                        }
                        if (timeOut) {
                            userSummary.timeOut = updateData.clock_out; // Use ISO
                            if (!userSummary.status) userSummary.status = 'completed';
                        }

                        await updateDailySummary(transaction, request.companyId, effectiveDate, request.userId, userSummary);

                        // 2. Monthly Stats
                        const statsUpdates = {};
                        if (timeIn) statsUpdates.presentDays = increment(0); // Don't double count if already present? Safe to increment 0 or 1?
                        // Legacy logic incremented 1 for Present. If adjustment, maybe they were absent?
                        // If we don't know, maybe safer to increment 1 if it's a NEW log.
                        if (!logSnap || !logSnap.exists()) {
                            statsUpdates.presentDays = increment(1);
                        }

                        await updateMonthlyStats(transaction, request.userId, request.companyId, effectiveDate, statsUpdates, {
                            type: 'adjustment',
                            date: effectiveDate,
                            reason: adminNote
                        });
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
