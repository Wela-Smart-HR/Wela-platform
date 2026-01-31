import { useState, useEffect } from 'react';
import { payrollRepo } from './payroll.repo';
import { getMonthId } from '@/shared/utils/date';

/**
 * Hook for viewing payslip (employee perspective)
 * @param {string} userId 
 * @param {Date} selectedMonth 
 * @returns {Object}
 */
export function usePayslip(userId, selectedMonth = new Date()) {
    const [payslip, setPayslip] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (userId) {
            loadPayslip();
        }
    }, [userId, selectedMonth]);

    const loadPayslip = async () => {
        try {
            setLoading(true);
            const monthId = getMonthId(selectedMonth);
            const data = await payrollRepo.getPayslipByUserMonth(userId, monthId);
            setPayslip(data);
            setError(null);
        } catch (err) {
            console.error('Error loading payslip:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getHistory = async (limit = 12) => {
        try {
            setLoading(true);
            const history = await payrollRepo.getPayslipHistory(userId, limit);
            setError(null);
            return history;
        } catch (err) {
            console.error('Error loading payslip history:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        payslip,
        loading,
        error,
        reload: loadPayslip,
        getHistory
    };
}
