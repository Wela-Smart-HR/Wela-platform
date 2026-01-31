/**
 * Settings Business Rules
 * Pure functions for settings validation
 */

/**
 * Validate company location
 * @param {Object} location - { lat, lng, address }
 * @returns {Object} { valid: boolean, error: string }
 */
export function validateLocation(location) {
    const { lat, lng, address } = location;

    if (lat === undefined || lng === undefined) {
        return { valid: false, error: 'Latitude and longitude are required' };
    }

    if (lat < -90 || lat > 90) {
        return { valid: false, error: 'Invalid latitude (must be between -90 and 90)' };
    }

    if (lng < -180 || lng > 180) {
        return { valid: false, error: 'Invalid longitude (must be between -180 and 180)' };
    }

    if (!address || address.trim().length < 5) {
        return { valid: false, error: 'Address must be at least 5 characters' };
    }

    return { valid: true };
}

/**
 * Validate attendance config
 * @param {Object} config - { radius, gracePeriod, greeting }
 * @returns {Object} { valid: boolean, error: string }
 */
export function validateAttendanceConfig(config) {
    const { radius, gracePeriod, greeting } = config;

    if (radius !== undefined && (radius < 10 || radius > 10000)) {
        return { valid: false, error: 'Radius must be between 10 and 10000 meters' };
    }

    if (gracePeriod !== undefined && (gracePeriod < 0 || gracePeriod > 60)) {
        return { valid: false, error: 'Grace period must be between 0 and 60 minutes' };
    }

    if (greeting && (!greeting.onTime || !greeting.late)) {
        return { valid: false, error: 'Greeting messages are required for both on-time and late' };
    }

    return { valid: true };
}

/**
 * Validate payroll config
 * @param {Object} config 
 * @returns {Object} { valid: boolean, error: string }
 */
export function validatePayrollConfig(config) {
    const {
        deductionPerMinute,
        maxDeduction,
        socialSecurityRate,
        providentFundRate
    } = config;

    if (deductionPerMinute !== undefined && deductionPerMinute < 0) {
        return { valid: false, error: 'Deduction per minute cannot be negative' };
    }

    if (maxDeduction !== undefined && maxDeduction < 0) {
        return { valid: false, error: 'Max deduction cannot be negative' };
    }

    if (socialSecurityRate !== undefined && (socialSecurityRate < 0 || socialSecurityRate > 1)) {
        return { valid: false, error: 'Social security rate must be between 0 and 1 (0-100%)' };
    }

    if (providentFundRate !== undefined && (providentFundRate < 0 || providentFundRate > 1)) {
        return { valid: false, error: 'Provident fund rate must be between 0 and 1 (0-100%)' };
    }

    return { valid: true };
}

/**
 * Get default settings
 * @returns {Object}
 */
export function getDefaultSettings() {
    return {
        location: {
            lat: 13.7563,
            lng: 100.5018,
            address: 'Bangkok, Thailand'
        },
        attendanceConfig: {
            radius: 100,
            gracePeriod: 5,
            greeting: {
                onTime: 'สวัสดีครับ',
                late: 'สายแล้วนะ'
            }
        },
        payrollConfig: {
            deductionPerMinute: 10,
            maxDeduction: 300,
            socialSecurityRate: 0.05,
            providentFundRate: 0
        }
    };
}
