/**
 * Calculate Minutes from Hours (supports decimals)
 * @param {number|string} hours
 * @returns {string} Minutes (rounded)
 */
export const calculateOTMinutes = (hours) => {
    const h = Number(hours) || 0;
    return (h * 60).toFixed(0);
};

/**
 * Calculate Hourly Rate from Salary or Daily Wage
 * @param {number} salary 
 * @param {number} dailyWage 
 * @returns {number} Hourly Rate
 */
export const calculateHourlyRate = (salary, dailyWage) => {
    if (dailyWage > 0) return dailyWage / 8;
    if (salary > 0) return (salary / 30) / 8;
    return 62.5; // Fallback (500/8)
};

/**
 * Calculate Single OT Cost
 * @param {number} hourlyRate 
 * @param {number} otRate 
 * @param {number} otHours 
 * @returns {number} Cost
 */
export const calculateOTCost = (hourlyRate, otRate, otHours) => {
    const hours = Number(otHours) || 0;
    return hourlyRate * (otRate || 1.5) * hours;
};

/**
 * Format Currency
 * @param {number} amount 
 * @returns {string} Formatted string (e.g. "1,200")
 */
export const formatMoney = (amount) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};
