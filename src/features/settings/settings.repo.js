import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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

            // Also fetch greeting and deduction subcollections
            const greetingSnap = await getDoc(doc(db, 'companies', companyId, 'settings', 'greeting'));
            const deductionSnap = await getDoc(doc(db, 'companies', companyId, 'settings', 'deduction'));

            return {
                id: snap.id,
                ...snap.data(),
                greeting: greetingSnap.exists() ? greetingSnap.data() : {},
                deduction: deductionSnap.exists() ? deductionSnap.data() : {}
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
     * Save all settings to 3 collections at once
     * @param {string} companyId 
     * @param {Object} storeConfig - Full config from Settings page
     * @returns {Promise<void>}
     */
    async saveAllSettings(companyId, storeConfig) {
        try {
            // 1. Save main company data
            await setDoc(doc(db, 'companies', companyId), {
                name: storeConfig.name,
                taxId: storeConfig.taxId,
                settings: {
                    location: storeConfig.location,
                    radius: Number(storeConfig.radius),
                    gpsEnabled: storeConfig.gpsEnabled
                },
                shifts: storeConfig.shifts,
                otTypes: storeConfig.otTypes,
                updatedAt: serverTimestamp()
            }, { merge: true });

            // 2. Save greeting settings
            await setDoc(doc(db, 'companies', companyId, 'settings', 'greeting'), {
                onTimeMessage: storeConfig.onTimeMessage || '',
                lateMessage: storeConfig.lateMessage || '',
                updatedAt: serverTimestamp()
            }, { merge: true });

            // 3. Save deduction settings
            await setDoc(doc(db, 'companies', companyId, 'settings', 'deduction'), {
                gracePeriod: Number(storeConfig.gracePeriod) || 0,
                deductionPerMinute: Number(storeConfig.deductionPerMinute) || 0,
                maxDeduction: Number(storeConfig.maxDeduction) || 0,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Error saving all settings:', error);
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
