/**
 * People Business Rules
 * Pure functions for employee validation
 */

/**
 * Validate employee data
 * @param {Object} employeeData 
 * @returns {Object} { valid: boolean, error: string }
 */
export function validateEmployeeData(employeeData) {
    const { name, email, position, salary, salaryType } = employeeData;

    if (!name || name.trim().length < 2) {
        return { valid: false, error: 'Name must be at least 2 characters' };
    }

    if (!email || !isValidEmail(email)) {
        return { valid: false, error: 'Invalid email address' };
    }

    if (!position || position.trim().length === 0) {
        return { valid: false, error: 'Position is required' };
    }

    if (salary === undefined || salary === null || salary < 0) {
        return { valid: false, error: 'Salary must be a positive number' };
    }

    if (!salaryType || !['monthly', 'daily'].includes(salaryType)) {
        return { valid: false, error: 'Salary type must be "monthly" or "daily"' };
    }

    return { valid: true };
}

/**
 * Validate email format
 * @param {string} email 
 * @returns {boolean}
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Check if employee can be deleted
 * @param {Object} employee 
 * @returns {boolean}
 */
export function canDeleteEmployee(employee) {
    // Owner cannot be deleted
    if (employee.role === 'owner') {
        return false;
    }

    return true;
}

/**
 * Filter active employees
 * @param {Array} employees 
 * @returns {Array}
 */
export function filterActiveEmployees(employees) {
    return employees.filter(emp => emp.active !== false);
}

/**
 * Sort employees by name
 * @param {Array} employees 
 * @returns {Array}
 */
export function sortEmployeesByName(employees) {
    return [...employees].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'th')
    );
}
