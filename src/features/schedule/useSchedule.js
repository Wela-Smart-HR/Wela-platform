import { useState, useEffect } from 'react';
import { scheduleRepo } from './schedule.repo';

/**
 * Hook for schedule management (admin perspective)
 * @param {string} companyId 
 * @returns {Object}
 */
export function useSchedule(companyId) {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (companyId) {
            loadSchedules();
        }
    }, [companyId]);

    const loadSchedules = async () => {
        try {
            setLoading(true);
            const data = await scheduleRepo.getSchedulesByCompany(companyId);
            setSchedules(data);
            setError(null);
        } catch (err) {
            console.error('Error loading schedules:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const createSchedule = async (scheduleData) => {
        try {
            setLoading(true);
            const docRef = await scheduleRepo.createSchedule({
                ...scheduleData,
                companyId
            });
            await loadSchedules();
            setError(null);
            return docRef;
        } catch (err) {
            console.error('Error creating schedule:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateSchedule = async (scheduleId, updates) => {
        try {
            setLoading(true);
            await scheduleRepo.updateSchedule(scheduleId, updates);
            await loadSchedules();
            setError(null);
        } catch (err) {
            console.error('Error updating schedule:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteSchedule = async (scheduleId) => {
        try {
            setLoading(true);
            await scheduleRepo.deleteSchedule(scheduleId);
            await loadSchedules();
            setError(null);
        } catch (err) {
            console.error('Error deleting schedule:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        schedules,
        loading,
        error,
        reload: loadSchedules,
        createSchedule,
        updateSchedule,
        deleteSchedule
    };
}
