import { useState, useEffect } from 'react';
import { requestsRepo } from './requests.repo';

/**
 * Hook for managing requests (admin perspective)
 * @param {string} companyId 
 * @param {string} filterStatus - 'pending', 'approved', 'rejected', or 'all'
 * @returns {Object}
 */
export function useRequestsAdmin(companyId, filterStatus = 'pending') {
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
            setRequests(data);
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
            await requestsRepo.updateRequestStatus(requestId, 'approved', adminNote);
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
            await requestsRepo.updateRequestStatus(requestId, 'rejected', adminNote);
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
