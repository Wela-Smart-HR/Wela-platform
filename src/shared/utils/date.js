/**
 * Date utility functions
 */

/**
 * Format date for input[type="date"]
 * @param {Date} date 
 * @returns {string} YYYY-MM-DD format
 */
export function formatDateForInput(date) {
    if (!date?.getFullYear) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get month ID for database queries
 * @param {Date} date 
 * @returns {string} YYYY-MM format
 */
export function getMonthId(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Get month range (start and end dates)
 * @param {Date} date 
 * @returns {Object} { start, end, startStr, endStr }
 */
export function getMonthRange(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    return {
        start,
        end,
        startStr: formatDateForInput(start),
        endStr: formatDateForInput(end)
    };
}

/**
 * Format date to Thai locale string
 * @param {Date} date 
 * @returns {string}
 */
export function formatDateThai(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Parse date string safely
 * @param {string|Date} dateInput 
 * @returns {Date|null}
 */
export function parseDate(dateInput) {
    if (!dateInput) return null;
    if (dateInput instanceof Date) return dateInput;

    const parsed = new Date(dateInput);
    return isNaN(parsed.getTime()) ? null : parsed;
}
