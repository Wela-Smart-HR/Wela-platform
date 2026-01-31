import { useState, useEffect } from 'react';
import { scheduleRepo } from './schedule.repo';

/**
 * Hook for viewing own schedule (employee perspective)
 * @param {string} userId 
 * @returns {Object}
 */
export function useMySchedule(userId) {
    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (userId) {
            loadSchedule();
        }
    }, [userId]);

    const loadSchedule = async () => {
        try {
            setLoading(true);
            const data = await scheduleRepo.getScheduleByUser(userId);
            setSchedule(data);
            setError(null);
        } catch (err) {
            console.error('Error loading schedule:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return {
        schedule,
        loading,
        error,
        reload: loadSchedule
    };
}
