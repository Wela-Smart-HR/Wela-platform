import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/shared/lib/firebase';

/**
 * Payroll Repository - Firestore operations for payroll
 */
export const payrollRepo = {
    /**
     * Create payslip
     * @param {Object} payslipData - Payslip data
     * @returns {Promise<Object>} Document reference
     */
    async createPayslip(payslipData) {
        try {
            return await addDoc(collection(db, 'payslips'), {
                ...payslipData,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error creating payslip:', error);
            throw error;
        }
    },

    /**
     * Get payslips by company and month
     * @param {string} companyId 
     * @param {string} monthId - Format: YYYY-MM
     * @returns {Promise<Array>} Payslips
     */
    async getPayslipsByMonth(companyId, monthId) {
        try {
            const q = query(
                collection(db, 'payslips'),
                where('companyId', '==', companyId),
                where('monthId', '==', monthId)
            );

            const snap = await getDocs(q);
            return snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting payslips:', error);
            throw error;
        }
    },

    /**
     * Get payslip by user and month
     * @param {string} userId 
     * @param {string} monthId 
     * @returns {Promise<Object|null>}
     */
    async getPayslipByUserMonth(userId, monthId) {
        try {
            const q = query(
                collection(db, 'payslips'),
                where('employeeId', '==', userId)
            );

            const snap = await getDocs(q);
            if (snap.empty) return null;

            // Filter in JS since month is embedded in cycleId: "company_YYYY-MM_period"
            const payslips = snap.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(p => p.cycleId && p.cycleId.includes(`_${monthId}_`));

            if (payslips.length === 0) return null;

            // Sort so the latest update comes first
            payslips.sort((a, b) => b.updatedAt?.toMillis() - a.updatedAt?.toMillis());

            return payslips[0];
        } catch (error) {
            console.error('Error getting user payslip:', error);
            throw error;
        }
    },

    /**
     * Update payslip
     * @param {string} payslipId 
     * @param {Object} updates 
     * @returns {Promise<void>}
     */
    async updatePayslip(payslipId, updates) {
        try {
            await updateDoc(doc(db, 'payslips', payslipId), {
                ...updates,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating payslip:', error);
            throw error;
        }
    },

    /**
     * Get payslip history for a user
     * @param {string} userId 
     * @param {number} limit 
     * @returns {Promise<Array>}
     */
    async getPayslipHistory(userId, limit = 12) {
        try {
            const q = query(
                collection(db, 'payslips'),
                where('employeeId', '==', userId)
            );

            const snap = await getDocs(q);
            const payslips = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sort by cycleId or createdAt descending
            return payslips.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)).slice(0, limit);
        } catch (error) {
            console.error('Error getting payslip history:', error);
            throw error;
        }
    }
};
