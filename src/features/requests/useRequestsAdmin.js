import { useState, useEffect } from 'react';
import { requestsRepo } from './requests.repo';
import { db } from '@/shared/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Hook for managing requests (admin perspective)
 * @param {string} companyId 
 * @param {string} filterStatus - 'pending', 'approved', 'rejected', or 'all'
 * @returns {Object}
 */
export function useRequestsAdmin(companyId, filterStatus = 'pending') {
    const { currentUser } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (companyId) {
            loadRequests();
        }
    }, [companyId, filterStatus]);

    const loadRequests = async () => {
        try {
            setLoading(true);
            const data = await requestsRepo.getRequestsByCompany(companyId, filterStatus);

            // Enrich with User Profiles (Photo, DisplayName)
            if (data.length > 0) {
                const userIds = [...new Set(data.map(r => r.userId))];
                const userPromises = userIds.map(uid => getDoc(doc(db, 'users', uid)));
                const userSnaps = await Promise.all(userPromises);

                const userMap = {};
                userSnaps.forEach(snap => {
                    if (snap.exists()) userMap[snap.id] = snap.data();
                });

                const enrichedData = data.map(req => ({
                    ...req,
                    userProfile: userMap[req.userId] || {}
                }));
                setRequests(enrichedData);
            } else {
                setRequests([]);
            }
            setError(null);
        } catch (err) {
            console.error('Error loading requests:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const approveRequest = async (requestOrId, adminNote = '') => {
        try {
            setLoading(true);
            // รองรับทั้ง object และ string ID
            const requestId = typeof requestOrId === 'string' ? requestOrId : requestOrId?.id;
            if (!requestId) throw new Error('Invalid request ID');
            await requestsRepo.approveRequest(requestId, currentUser, adminNote);
            await loadRequests();
            setError(null);
        } catch (err) {
            console.error('Error approving request:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const rejectRequest = async (requestOrId, adminNote = '') => {
        try {
            setLoading(true);
            // รองรับทั้ง object และ string ID
            const requestId = typeof requestOrId === 'string' ? requestOrId : requestOrId?.id;
            if (!requestId) throw new Error('Invalid request ID');
            await requestsRepo.rejectRequest(requestId, currentUser, adminNote);
            await loadRequests();
            setError(null);
        } catch (err) {
            console.error('Error rejecting request:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const getSummary = () => {
        const pending = requests.filter(r => r.status === 'pending').length;
        const approved = requests.filter(r => r.status === 'approved').length;
        const rejected = requests.filter(r => r.status === 'rejected').length;

        return {
            total: requests.length,
            pending,
            approved,
            rejected
        };
    };

    return {
        requests,
        loading,
        error,
        reload: loadRequests,
        approveRequest,
        rejectRequest,
        getSummary
    };
}
