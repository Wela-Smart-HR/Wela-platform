import { useState, useEffect } from 'react';
import { attendanceRepo } from './attendance.repo';
import { getMonthRange } from '@/shared/utils/date';

/**
 * Custom hook for admin attendance management
 * @param {string} companyId - Company ID
 * @param {Date} selectedMonth - Selected month
 * @returns {Object} Attendance state and methods
 */
export function useAttendance(companyId, selectedMonth = new Date()) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load records when company or month changes
    useEffect(() => {
        if (companyId) {
            loadRecords();
        }
    }, [companyId, selectedMonth]);

    /**
     * Load attendance records for the selected month
     */
    const loadRecords = async () => {
        try {
            setLoading(true);
            const { start, end } = getMonthRange(selectedMonth);
            const data = await attendanceRepo.getRecordsByCompany(companyId, start, end);
            setRecords(data);
            setError(null);
        } catch (err) {
            console.error('Error loading attendance records:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Get records by user
     * @param {string} userId 
     * @returns {Array} Filtered records
     */
    const getRecordsByUser = (userId) => {
        return records.filter(r => r.userId === userId);
    };

    /**
     * Get summary statistics
     * @returns {Object} Summary data
     */
    const getSummary = () => {
        const totalRecords = records.length;
        const uniqueUsers = [...new Set(records.map(r => r.userId))].length;
        const lateCount = records.filter(r => r.status === 'late').length;

        return {
            totalRecords,
            uniqueUsers,
            lateCount,
            onTimeCount: totalRecords - lateCount
        };
    };

    return {
        records,
        loading,
        error,
        reload: loadRecords,
        getRecordsByUser,
        getSummary
    };
}
