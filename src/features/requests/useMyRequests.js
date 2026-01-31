import { useState, useEffect } from 'react';
import { requestsRepo } from './requests.repo';
import { validateLeaveRequest, validateAttendanceAdjustment } from './requests.rules';

/**
 * Hook for managing own requests (employee perspective)
 * @param {string} userId 
 * @returns {Object}
 */
export function useMyRequests(userId) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (userId) {
            loadRequests();
        }
    }, [userId]);

    const loadRequests = async () => {
        try {
            setLoading(true);
            const data = await requestsRepo.getRequestsByUser(userId);
            setRequests(data);
            setError(null);
        } catch (err) {
            console.error('Error loading requests:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const createRequest = async (requestData) => {
        try {
            setLoading(true);
            setError(null);

            // Validate based on request type
            let validation;
            if (requestData.type === 'leave') {
                validation = validateLeaveRequest(requestData);
            } else if (requestData.type === 'attendance-adjustment') {
                validation = validateAttendanceAdjustment(requestData);
            } else {
                validation = { valid: false, error: 'Invalid request type' };
            }

            if (!validation.valid) {
                throw new Error(validation.error);
            }

            await requestsRepo.createRequest({
                ...requestData,
                userId
            });

            await loadRequests();
        } catch (err) {
            console.error('Error creating request:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteRequest = async (requestId) => {
        try {
            setLoading(true);
            await requestsRepo.deleteRequest(requestId);
            await loadRequests();
            setError(null);
        } catch (err) {
            console.error('Error deleting request:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        requests,
        loading,
        error,
        reload: loadRequests,
        createRequest,
        deleteRequest
    };
}
