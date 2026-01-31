import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/shared/lib/firebase';

/**
 * Settings Repository - Firestore operations for company settings
 */
export const settingsRepo = {
    /**
     * Get company settings
     * @param {string} companyId 
     * @returns {Promise<Object|null>}
     */
    async getCompanySettings(companyId) {
        try {
            const docRef = doc(db, 'companies', companyId);
            const snap = await getDoc(docRef);

            if (!snap.exists()) return null;

            return {
                id: snap.id,
                ...snap.data()
            };
        } catch (error) {
            console.error('Error getting company settings:', error);
            throw error;
        }
    },

    /**
     * Update company settings
     * @param {string} companyId 
     * @param {Object} settings 
     * @returns {Promise<void>}
     */
    async updateCompanySettings(companyId, settings) {
        try {
            await updateDoc(doc(db, 'companies', companyId), {
                ...settings,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating company settings:', error);
            throw error;
        }
    },

    /**
     * Update company location
     * @param {string} companyId 
     * @param {Object} location - { lat, lng, address }
     * @returns {Promise<void>}
     */
    async updateCompanyLocation(companyId, location) {
        try {
            await updateDoc(doc(db, 'companies', companyId), {
                location,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating company location:', error);
            throw error;
        }
    },

    /**
     * Update attendance config
     * @param {string} companyId 
     * @param {Object} config - { radius, gracePeriod, greeting }
     * @returns {Promise<void>}
     */
    async updateAttendanceConfig(companyId, config) {
        try {
            await updateDoc(doc(db, 'companies', companyId), {
                attendanceConfig: config,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating attendance config:', error);
            throw error;
        }
    },

    /**
     * Update payroll config
     * @param {string} companyId 
     * @param {Object} config - deduction, tax, social security settings
     * @returns {Promise<void>}
     */
    async updatePayrollConfig(companyId, config) {
        try {
            await updateDoc(doc(db, 'companies', companyId), {
                payrollConfig: config,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating payroll config:', error);
            throw error;
        }
    }
};
