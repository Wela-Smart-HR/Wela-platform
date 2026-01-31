import { getDistanceFromLatLonInMeters } from '@/shared/utils/geo';

/**
 * Attendance Business Rules
 * Pure functions for attendance validation and calculations
 */

/**
 * Check if user is within allowed radius
 * @param {number} userLat - User latitude
 * @param {number} userLng - User longitude
 * @param {number} companyLat - Company latitude
 * @param {number} companyLng - Company longitude
 * @param {number} radius - Allowed radius in meters
 * @returns {boolean}
 */
export function isWithinRadius(userLat, userLng, companyLat, companyLng, radius) {
    const distance = getDistanceFromLatLonInMeters(userLat, userLng, companyLat, companyLng);
    return distance <= radius;
}

/**
 * Calculate late minutes
 * @param {Date} clockInTime - Actual clock in time
 * @param {Date} scheduleStartTime - Scheduled start time
 * @param {number} gracePeriod - Grace period in minutes (default 0)
 * @returns {number} Late minutes
 */
export function calculateLateMinutes(clockInTime, scheduleStartTime, gracePeriod = 0) {
    const diff = Math.floor((clockInTime - scheduleStartTime) / 1000 / 60);
    const lateMinutes = Math.max(0, diff - gracePeriod);
    return lateMinutes;
}

/**
 * Calculate late deduction
 * @param {number} lateMinutes - Number of late minutes
 * @param {number} deductionPerMinute - Deduction amount per minute
 * @param {number} maxDeduction - Maximum deduction allowed
 * @returns {number} Deduction amount
 */
export function calculateLateDeduction(lateMinutes, deductionPerMinute, maxDeduction = Infinity) {
    const deduction = lateMinutes * deductionPerMinute;
    return Math.min(deduction, maxDeduction);
}

/**
 * Check if clock in is late
 * @param {Date} clockInTime 
 * @param {Date} scheduleStartTime 
 * @param {number} gracePeriod 
 * @returns {boolean}
 */
export function isLate(clockInTime, scheduleStartTime, gracePeriod = 0) {
    return calculateLateMinutes(clockInTime, scheduleStartTime, gracePeriod) > 0;
}

/**
 * Calculate work hours
 * @param {Date} clockInTime 
 * @param {Date} clockOutTime 
 * @returns {number} Hours worked
 */
export function calculateWorkHours(clockInTime, clockOutTime) {
    if (!clockInTime || !clockOutTime) return 0;
    const diff = clockOutTime - clockInTime;
    return Math.max(0, diff / 1000 / 60 / 60); // Convert to hours
}

/**
 * Validate clock in/out data
 * @param {Object} data 
 * @returns {Object} { valid: boolean, error: string }
 */
export function validateAttendanceData(data) {
    if (!data.userId) {
        return { valid: false, error: 'User ID is required' };
    }

    if (!data.companyId) {
        return { valid: false, error: 'Company ID is required' };
    }

    if (!data.location || !data.location.lat || !data.location.lng) {
        return { valid: false, error: 'Location is required' };
    }

    return { valid: true };
}
