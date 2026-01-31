import { roundMoney } from '@/shared/utils/money';

/**
 * Payroll Calculation Functions
 * Pure functions for salary and deduction calculations
 */

/**
 * Calculate gross salary
 * @param {Object} employee - Employee data
 * @param {number} workDays - Number of working days
 * @param {number} totalDays - Total days in month
 * @returns {number} Gross salary
 */
export function calculateGrossSalary(employee, workDays, totalDays) {
    const { salary, salaryType } = employee;

    if (salaryType === 'monthly') {
        return salary;
    } else if (salaryType === 'daily') {
        return salary * workDays;
    }

    return salary;
}

/**
 * Calculate late deductions
 * @param {number} totalLateMinutes - Total late minutes in the month
 * @param {Object} deductionConfig - Deduction configuration
 * @returns {number} Total deduction
 */
export function calculateLateDeduction(totalLateMinutes, deductionConfig) {
    const { deductionPerMinute = 0, maxDeduction = Infinity } = deductionConfig;
    const deduction = totalLateMinutes * deductionPerMinute;
    return roundMoney(Math.min(deduction, maxDeduction));
}

/**
 * Calculate social security deduction (ประกันสังคม)
 * @param {number} grossSalary 
 * @param {number} rate - Default 5% (0.05)
 * @param {number} max - Maximum deduction (default 750)
 * @returns {number}
 */
export function calculateSocialSecurity(grossSalary, rate = 0.05, max = 750) {
    const deduction = grossSalary * rate;
    return roundMoney(Math.min(deduction, max));
}

/**
 * Calculate provident fund (กองทุนสำรองเลี้ยงชีพ)
 * @param {number} grossSalary 
 * @param {number} rate - Contribution rate (e.g., 0.03 for 3%)
 * @returns {number}
 */
export function calculateProvidentFund(grossSalary, rate = 0) {
    return roundMoney(grossSalary * rate);
}

/**
 * Calculate tax withholding (ภาษีหัก ณ ที่จ่าย)
 * @param {number} grossSalary 
 * @param {Object} taxConfig - Tax configuration
 * @returns {number}
 */
export function calculateTaxWithholding(grossSalary, taxConfig = {}) {
    const { rate = 0, method = 'percentage' } = taxConfig;

    if (method === 'fixed') {
        return roundMoney(rate);
    } else if (method === 'percentage') {
        return roundMoney(grossSalary * rate);
    }

    return 0;
}

/**
 * Calculate total deductions
 * @param {Object} deductions - All deduction amounts
 * @returns {number}
 */
export function calculateTotalDeductions(deductions) {
    const {
        lateDeduction = 0,
        socialSecurity = 0,
        providentFund = 0,
        taxWithholding = 0,
        otherDeductions = 0
    } = deductions;

    const total = lateDeduction + socialSecurity + providentFund + taxWithholding + otherDeductions;
    return roundMoney(total);
}

/**
 * Calculate net salary
 * @param {number} grossSalary 
 * @param {number} totalDeductions 
 * @returns {number}
 */
export function calculateNetSalary(grossSalary, totalDeductions) {
    return roundMoney(Math.max(0, grossSalary - totalDeductions));
}

/**
 * Generate complete payslip calculation
 * @param {Object} employee - Employee data
 * @param {Object} attendance - Attendance summary
 * @param {Object} config - Company/employee config
 * @returns {Object} Complete payslip data
 */
export function generatePayslip(employee, attendance, config) {
    const {
        workDays = 0,
        totalDays = 30,
        totalLateMinutes = 0
    } = attendance;

    const {
        deductionProfile = 'none',
        deductionConfig = {},
        socialSecurityRate = 0.05,
        providentFundRate = 0,
        taxConfig = {}
    } = config;

    // Calculate gross salary
    const grossSalary = calculateGrossSalary(employee, workDays, totalDays);

    // Calculate deductions
    const deductions = {
        lateDeduction: 0,
        socialSecurity: 0,
        providentFund: 0,
        taxWithholding: 0,
        otherDeductions: 0
    };

    // Late deduction
    if (deductionProfile !== 'none') {
        deductions.lateDeduction = calculateLateDeduction(totalLateMinutes, deductionConfig);
    }

    // Social security (only if salary <= 15000)
    if (grossSalary <= 15000) {
        deductions.socialSecurity = calculateSocialSecurity(grossSalary, socialSecurityRate);
    }

    // Provident fund
    if (providentFundRate > 0) {
        deductions.providentFund = calculateProvidentFund(grossSalary, providentFundRate);
    }

    // Tax withholding
    deductions.taxWithholding = calculateTaxWithholding(grossSalary, taxConfig);

    // Calculate totals
    const totalDeductions = calculateTotalDeductions(deductions);
    const netSalary = calculateNetSalary(grossSalary, totalDeductions);

    return {
        grossSalary,
        deductions,
        totalDeductions,
        netSalary,
        workDays,
        totalDays,
        totalLateMinutes
    };
}
