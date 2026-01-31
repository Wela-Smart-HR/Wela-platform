import { payrollRepo } from './payroll.repo';
import { generatePayslip } from './payroll.calc';
import { attendanceRepo } from '../attendance/attendance.repo';
import { getMonthRange, getMonthId } from '@/shared/utils/date';

/**
 * Payroll Use Cases
 * Orchestrates complex payroll operations
 */

/**
 * Generate payslips for all employees in a company
 * @param {string} companyId 
 * @param {Array} employees - List of employees
 * @param {Date} month - Month to generate payslips for
 * @param {Object} companyConfig - Company configuration
 * @returns {Promise<Array>} Generated payslips
 */
export async function generatePayslipsForMonth(companyId, employees, month, companyConfig) {
    try {
        const monthId = getMonthId(month);
        const { start, end } = getMonthRange(month);
        const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

        const payslips = [];

        for (const employee of employees) {
            // Get attendance records for this employee
            const attendanceRecords = await attendanceRepo.getRecordsByUser(
                employee.uid,
                start,
                end
            );

            // Calculate work days and late minutes
            const workDays = calculateWorkDays(attendanceRecords);
            const totalLateMinutes = calculateTotalLateMinutes(attendanceRecords);

            // Generate payslip
            const payslipData = generatePayslip(
                employee,
                { workDays, totalDays, totalLateMinutes },
                {
                    deductionProfile: employee.deductionProfile || 'none',
                    deductionConfig: companyConfig.deductionConfig || {},
                    socialSecurityRate: companyConfig.socialSecurityRate || 0.05,
                    providentFundRate: employee.providentFundRate || 0,
                    taxConfig: employee.taxConfig || {}
                }
            );

            // Save to Firestore
            const docRef = await payrollRepo.createPayslip({
                userId: employee.uid,
                companyId,
                monthId,
                employeeName: employee.name,
                position: employee.position || '',
                ...payslipData
            });

            payslips.push({ id: docRef.id, ...payslipData });
        }

        return payslips;
    } catch (error) {
        console.error('Error generating payslips:', error);
        throw error;
    }
}

/**
 * Calculate work days from attendance records
 * @param {Array} attendanceRecords 
 * @returns {number}
 */
function calculateWorkDays(attendanceRecords) {
    // Count unique dates with clock-in
    const uniqueDates = new Set();

    attendanceRecords.forEach(record => {
        if (record.type === 'clock-in' && record.createdAt) {
            const date = new Date(record.createdAt.seconds * 1000);
            const dateStr = date.toISOString().split('T')[0];
            uniqueDates.add(dateStr);
        }
    });

    return uniqueDates.size;
}

/**
 * Calculate total late minutes from attendance records
 * @param {Array} attendanceRecords 
 * @returns {number}
 */
function calculateTotalLateMinutes(attendanceRecords) {
    return attendanceRecords.reduce((total, record) => {
        if (record.type === 'clock-in' && record.lateMinutes) {
            return total + record.lateMinutes;
        }
        return total;
    }, 0);
}

/**
 * Recalculate payslip (e.g., after attendance adjustment)
 * @param {string} payslipId 
 * @param {Object} employee 
 * @param {Date} month 
 * @param {Object} companyConfig 
 * @returns {Promise<Object>}
 */
export async function recalculatePayslip(payslipId, employee, month, companyConfig) {
    try {
        const { start, end } = getMonthRange(month);
        const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

        // Get fresh attendance data
        const attendanceRecords = await attendanceRepo.getRecordsByUser(
            employee.uid,
            start,
            end
        );

        const workDays = calculateWorkDays(attendanceRecords);
        const totalLateMinutes = calculateTotalLateMinutes(attendanceRecords);

        // Recalculate
        const payslipData = generatePayslip(
            employee,
            { workDays, totalDays, totalLateMinutes },
            {
                deductionProfile: employee.deductionProfile || 'none',
                deductionConfig: companyConfig.deductionConfig || {},
                socialSecurityRate: companyConfig.socialSecurityRate || 0.05,
                providentFundRate: employee.providentFundRate || 0,
                taxConfig: employee.taxConfig || {}
            }
        );

        // Update in Firestore
        await payrollRepo.updatePayslip(payslipId, payslipData);

        return payslipData;
    } catch (error) {
        console.error('Error recalculating payslip:', error);
        throw error;
    }
}
