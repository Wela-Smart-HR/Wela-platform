/**
 * Schedule Business Rules
 * Pure functions for schedule validation
 */

/**
 * Validate schedule times
 * @param {string} startTime - Format: HH:MM
 * @param {string} endTime - Format: HH:MM
 * @returns {Object} { valid: boolean, error: string }
 */
export function validateScheduleTimes(startTime, endTime) {
    if (!startTime || !endTime) {
        return { valid: false, error: 'Start time and end time are required' };
    }

    const start = parseTime(startTime);
    const end = parseTime(endTime);

    if (!start || !end) {
        return { valid: false, error: 'Invalid time format. Use HH:MM' };
    }

    if (start >= end) {
        return { valid: false, error: 'End time must be after start time' };
    }

    return { valid: true };
}

/**
 * Parse time string to minutes since midnight
 * @param {string} timeStr - Format: HH:MM
 * @returns {number|null}
 */
function parseTime(timeStr) {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return null;
    }

    return hours * 60 + minutes;
}

/**
 * Check if time is within schedule
 * @param {Date} checkTime 
 * @param {string} scheduleStart - HH:MM
 * @param {string} scheduleEnd - HH:MM
 * @returns {boolean}
 */
export function isWithinSchedule(checkTime, scheduleStart, scheduleEnd) {
    const hours = checkTime.getHours();
    const minutes = checkTime.getMinutes();
    const checkMinutes = hours * 60 + minutes;

    const startMinutes = parseTime(scheduleStart);
    const endMinutes = parseTime(scheduleEnd);

    if (startMinutes === null || endMinutes === null) return false;

    return checkMinutes >= startMinutes && checkMinutes <= endMinutes;
}

/**
 * Format time for display
 * @param {string} timeStr - HH:MM (24-hour)
 * @returns {string} Formatted time
 */
export function formatScheduleTime(timeStr) {
    if (!timeStr) return '';
    return timeStr; // Can be customized for Thai format or 12-hour format
}
