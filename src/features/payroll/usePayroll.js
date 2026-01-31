import { useState, useEffect } from 'react';
import { payrollRepo } from './payroll.repo';
import { generatePayslipsForMonth } from './payroll.usecase';
import { getMonthId } from '@/shared/utils/date';

/**
 * Hook for payroll management (admin perspective)
 * @param {string} companyId 
 * @param {Date} selectedMonth 
 * @returns {Object}
 */
export function usePayroll(companyId, selectedMonth = new Date()) {
    const [payslips, setPayslips] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (companyId) {
            loadPayslips();
        }
    }, [companyId, selectedMonth]);

    const loadPayslips = async () => {
        try {
            setLoading(true);
            const monthId = getMonthId(selectedMonth);
            const data = await payrollRepo.getPayslipsByMonth(companyId, monthId);
            setPayslips(data);
            setError(null);
        } catch (err) {
            console.error('Error loading payslips:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const generatePayslips = async (employees, companyConfig) => {
        try {
            setLoading(true);
            const generated = await generatePayslipsForMonth(
                companyId,
                employees,
                selectedMonth,
                companyConfig
            );
            setPayslips(generated);
            setError(null);
            return generated;
        } catch (err) {
            console.error('Error generating payslips:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const getSummary = () => {
        const totalGross = payslips.reduce((sum, p) => sum + (p.grossSalary || 0), 0);
        const totalNet = payslips.reduce((sum, p) => sum + (p.netSalary || 0), 0);
        const totalDeductions = payslips.reduce((sum, p) => sum + (p.totalDeductions || 0), 0);

        return {
            count: payslips.length,
            totalGross,
            totalNet,
            totalDeductions
        };
    };

    return {
        payslips,
        loading,
        error,
        reload: loadPayslips,
        generatePayslips,
        getSummary
    };
}
