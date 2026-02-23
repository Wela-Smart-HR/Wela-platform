/**
 * @typedef {Object} PayrollCycle
 * @property {string} id - Unique ID (e.g., "2026-02-full")
 * @property {string} month - YYYY-MM format
 * @property {'first' | 'second' | 'full'} period - Payment period
 * @property {string} status - 'draft' | 'locked' | 'completed'
 * @property {Object} summary - Cached totals
 * @property {number} summary.totalNet
 * @property {number} summary.totalPaid
 * @property {number} summary.count
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} PayrollPayslip
 * @property {string} id - Unique ID (empId_cycleId)
 * @property {string} cycleId - Reference to cycle
 * @property {string} employeeId - Reference to user
 * @property {Object} employeeSnapshot - Frozen user data at creation time
 * @property {string} employeeSnapshot.name
 * @property {string} employeeSnapshot.role
 * @property {string} employeeSnapshot.department
 * @property {number} employeeSnapshot.baseSalary
 * @property {Object} financials - Calculated values (kept as numbers for Firestore, handled as Decimal in code)
 * @property {number} financials.salary
 * @property {number} financials.ot
 * @property {number} financials.incentive
 * @property {number} financials.deductions
 * @property {number} financials.sso
 * @property {number} financials.tax
 * @property {number} financials.net
 * @property {Array<{id: string, label: string, amount: number, type: 'income'|'deduct'}>} customItems
 * @property {Array<EmployeePayment>} payments
 * @property {string} paymentStatus - 'pending' | 'partial' | 'paid'
 */

/**
 * @typedef {Object} EmployeePayment
 * @property {string} id
 * @property {number} amount
 * @property {string} date - ISO Date string
 * @property {string} note
 * @property {string} method - 'cash' | 'transfer'
 */

export const PayrollTypes = {};
