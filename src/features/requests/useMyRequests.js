import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/shared/lib/firebase';
import { requestsRepo } from './requests.repo';

/**
 * Hook for managing own requests (employee perspective)
 * Uses Realtime Listener for live updates + Repo for writes.
 * @param {Object} currentUser - Full user object from AuthContext
 * @returns {Object}
 */
export function useMyRequests(currentUser) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Realtime Listener (replaces the direct Firestore call in MyRequests.jsx)
    useEffect(() => {
        if (!currentUser?.uid) return;

        const q = query(
            collection(db, 'requests'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRequests(docs);
            setLoading(false);
        }, (err) => {
            console.error('Realtime listener error:', err);
            setError(err.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser?.uid]);

    /**
     * Submit Leave Request (via Repo with Snapshot + Document Numbering)
     */
    const submitLeaveRequest = async (leaveData) => {
        try {
            setError(null);
            const result = await requestsRepo.createRequest({
                companyId: currentUser.companyId,
                userId: currentUser.uid,
                userName: currentUser.displayName || currentUser.email,
                type: 'leave',
                leaveType: leaveData.type,
                startDate: leaveData.startDate || leaveData.date,
                endDate: leaveData.endDate || leaveData.date,
                reason: leaveData.reason,
                date: leaveData.date || leaveData.startDate, // Backward compat & Fix undefined
            });
            return result; // { id, documentNo }
        } catch (err) {
            console.error('Error submitting leave:', err);
            setError(err.message);
            throw err;
        }
    };

    /**
     * Submit Attendance Adjustment Request (via Repo)
     */
    const submitAdjustmentRequest = async (adjustData) => {
        try {
            if (!adjustData.date) throw new Error("กรุณาระบุวันที่ต้องการแก้ไข");
            setError(null);

            const result = await requestsRepo.createRequest({
                companyId: currentUser.companyId,
                userId: currentUser.uid,
                userName: currentUser.displayName || currentUser.email,
                type: 'attendance-adjustment',
                targetDate: adjustData.date,
                timeIn: adjustData.timeIn,
                timeOut: adjustData.timeOut,
                reason: adjustData.reason,
                date: adjustData.date, // Backward compat
            });
            return result; // { id, documentNo }
        } catch (err) {
            console.error('Error submitting adjustment:', err);
            setError(err.message);
            throw err;
        }
    };

    /**
     * Cancel Request (only if pending)
     */
    const cancelRequest = async (requestId) => {
        try {
            setError(null);
            // Simple status update — No need for complex transaction
            const { updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
            await updateDoc(doc(db, 'requests', requestId), {
                status: 'cancelled',
                updatedAt: serverTimestamp(),
            });
        } catch (err) {
            console.error('Error cancelling request:', err);
            setError(err.message);
            throw err;
        }
    };

    return {
        requests,
        loading,
        error,
        submitLeaveRequest,
        submitAdjustmentRequest,
        cancelRequest,
    };
}
