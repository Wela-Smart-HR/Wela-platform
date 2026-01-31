import { useState, useEffect } from 'react';
import { attendanceRepo } from './attendance.repo';
import { isWithinRadius, calculateLateMinutes, validateAttendanceData } from './attendance.rules';

/**
 * Custom hook for employee attendance
 * @param {string} userId - Employee user ID
 * @param {Object} companyConfig - Company configuration (location, radius, etc.)
 * @returns {Object} Attendance state and methods
 */
export function useMyAttendance(userId, companyConfig) {
    const [todayRecord, setTodayRecord] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load today's record on mount
    useEffect(() => {
        if (userId) {
            loadTodayRecord();
        }
    }, [userId]);

    /**
     * Load today's attendance record
     */
    const loadTodayRecord = async () => {
        try {
            setLoading(true);
            const record = await attendanceRepo.getTodayRecord(userId);
            setTodayRecord(record);
            setError(null);
        } catch (err) {
            console.error('Error loading today record:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Clock in or clock out
     * @param {string} type - 'clock-in' or 'clock-out'
     * @param {Object} location - User location { lat, lng }
     * @param {Object} scheduleData - Schedule data (optional, for late calculation)
     * @returns {Promise<void>}
     */
    const clockAction = async (type, location, scheduleData = null) => {
        try {
            setLoading(true);
            setError(null);

            // Validate data
            const data = {
                userId,
                companyId: companyConfig.companyId,
                location,
                type
            };

            const validation = validateAttendanceData(data);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Validate location (GPS range check)
            if (!companyConfig.location) {
                throw new Error('Company location not configured');
            }

            const inRange = isWithinRadius(
                location.lat,
                location.lng,
                companyConfig.location.lat,
                companyConfig.location.lng,
                companyConfig.radius || 100
            );

            if (!inRange) {
                throw new Error('You are not within the allowed location range');
            }

            // Calculate late status (for clock-in only)
            let status = 'on-time';
            let lateMinutes = 0;

            if (type === 'clock-in' && scheduleData?.startTime) {
                const clockInTime = new Date();
                const scheduleStartTime = new Date(scheduleData.startTime);
                lateMinutes = calculateLateMinutes(
                    clockInTime,
                    scheduleStartTime,
                    companyConfig.gracePeriod || 0
                );

                if (lateMinutes > 0) {
                    status = 'late';
                }
            }

            // Save to Firestore
            const recordData = {
                ...data,
                status,
                lateMinutes: type === 'clock-in' ? lateMinutes : 0,
                timestamp: new Date()
            };

            if (type === 'clock-in') {
                await attendanceRepo.clockIn(recordData);
            } else {
                await attendanceRepo.clockOut(recordData);
            }

            // Reload today's record
            await loadTodayRecord();
        } catch (err) {
            console.error(`Error during ${type}:`, err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Get attendance history
     * @param {Date} startDate 
     * @param {Date} endDate 
     * @returns {Promise<Array>}
     */
    const getHistory = async (startDate, endDate) => {
        try {
            setLoading(true);
            const records = await attendanceRepo.getRecordsByUser(userId, startDate, endDate);
            setError(null);
            return records;
        } catch (err) {
            console.error('Error getting attendance history:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        todayRecord,
        loading,
        error,
        clockAction,
        getHistory,
        reload: loadTodayRecord
    };
}
