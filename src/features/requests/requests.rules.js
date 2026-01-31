/**
 * Requests Business Rules
 * Pure functions for request validation
 */

/**
 * Validate leave request
 * @param {Object} requestData 
 * @returns {Object} { valid: boolean, error: string }
 */
export function validateLeaveRequest(requestData) {
    const { type, startDate, endDate, reason } = requestData;

    if (!type) {
        return { valid: false, error: 'Request type is required' };
    }

    if (!startDate || !endDate) {
        return { valid: false, error: 'Start date and end date are required' };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
        return { valid: false, error: 'End date must be after start date' };
    }

    if (!reason || reason.trim().length < 10) {
        return { valid: false, error: 'Reason must be at least 10 characters' };
    }

    return { valid: true };
}

/**
 * Validate attendance adjustment request
 * @param {Object} requestData 
 * @returns {Object} { valid: boolean, error: string }
 */
export function validateAttendanceAdjustment(requestData) {
    const { date, timeIn, timeOut, reason } = requestData;

    if (!date) {
        return { valid: false, error: 'Date is required' };
    }

    if (!timeIn && !timeOut) {
        return { valid: false, error: 'At least one time (in or out) is required' };
    }

    if (!reason || reason.trim().length < 10) {
        return { valid: false, error: 'Reason must be at least 10 characters' };
    }

    return { valid: true };
}

/**
 * Calculate leave days
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {number} Number of days
 */
export function calculateLeaveDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end date

    return diffDays;
}

/**
 * Check if request can be deleted
 * @param {Object} request 
 * @returns {boolean}
 */
export function canDeleteRequest(request) {
    return request.status === 'pending';
}

/**
 * Check if request can be edited
 * @param {Object} request 
 * @returns {boolean}
 */
export function canEditRequest(request) {
    return request.status === 'pending';
}
