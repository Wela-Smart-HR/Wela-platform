/**
 * Money/Currency utility functions
 */

/**
 * Format number as money (Thai Baht)
 * @param {number} amount 
 * @returns {string} Formatted amount with 2 decimals
 */
export function formatMoney(amount) {
    if (amount === null || amount === undefined) return '0.00';
    return Number(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Parse money string to number
 * @param {string} moneyStr 
 * @returns {number}
 */
export function parseMoney(moneyStr) {
    if (!moneyStr) return 0;
    return parseFloat(String(moneyStr).replace(/,/g, '')) || 0;
}

/**
 * Round money to 2 decimal places
 * @param {number} amount 
 * @returns {number}
 */
export function roundMoney(amount) {
    return Math.round(amount * 100) / 100;
}
