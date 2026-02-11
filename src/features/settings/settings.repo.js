import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/shared/lib/firebase';

/**
 * Settings Repository - Firestore operations for company settings
 * 
 * ⚠️ Architecture Decision: ทุกค่าถูก flatten ลง company doc เดียว
 *    เพื่อให้ ConfigContext (onSnapshot) อ่านได้ครบทุกค่า
 *    ไม่แยกเก็บใน sub-docs อีก (greeting/deduction)
 */
export const settingsRepo = {
    /**
     * Get company settings
     * อ่านจาก company doc หลัก + backward compat สำหรับ legacy sub-docs
     * @param {string} companyId 
     * @returns {Promise<Object|null>}
     */
    async getCompanySettings(companyId) {
        try {
            const docRef = doc(db, 'companies', companyId);
            const snap = await getDoc(docRef);

            if (!snap.exists()) return null;

            const data = snap.data();

            // ✅ Backward Compat: ถ้ายังไม่มี greeting/deduction ใน main doc
            //    → ลองอ่านจาก legacy sub-docs (migration path)
            let greeting = data.greeting || null;
            let deduction = data.deduction || null;

            if (!greeting) {
                try {
                    const greetingSnap = await getDoc(doc(db, 'companies', companyId, 'settings', 'greeting'));
                    if (greetingSnap.exists()) {
                        greeting = greetingSnap.data();
                    }
                } catch { /* ignore - sub-doc may not exist */ }
            }

            if (!deduction) {
                try {
                    const deductionSnap = await getDoc(doc(db, 'companies', companyId, 'settings', 'deduction'));
                    if (deductionSnap.exists()) {
                        deduction = deductionSnap.data();
                    }
                } catch { /* ignore - sub-doc may not exist */ }
            }

            return {
                id: snap.id,
                ...data,
                greeting: greeting || {},
                deduction: deduction || {}
            };
        } catch (error) {
            console.error('Error getting company settings:', error);
            throw error;
        }
    },

    /**
     * Update company settings (partial update)
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
     * Save ALL settings into the main company doc (single document write)
     * 
     * ⚠️ ทุกค่าถูกบันทึกลง companies/{companyId} เท่านั้น
     *    ConfigContext (onSnapshot) จะได้รับค่าทั้งหมดทันที
     * 
     * @param {string} companyId 
     * @param {Object} storeConfig - Full config from Settings page
     * @returns {Promise<void>}
     */
    async saveAllSettings(companyId, storeConfig) {
        try {
            await setDoc(doc(db, 'companies', companyId), {
                // === ข้อมูลหลักบริษัท ===
                name: storeConfig.name || '',
                taxId: storeConfig.taxId || '',

                // === GPS & Location ===
                settings: {
                    location: storeConfig.location || null,
                    radius: Number(storeConfig.radius) || 350,
                    gpsEnabled: storeConfig.gpsEnabled ?? true
                },

                // === กะทำงาน & OT ===
                shifts: storeConfig.shifts || [],
                otTypes: storeConfig.otTypes || [],

                // === ✅ ข้อความทักทาย (เดิมอยู่ sub-doc → ย้ายมา main doc) ===
                greeting: {
                    onTimeMessage: storeConfig.onTimeMessage || '',
                    lateMessage: storeConfig.lateMessage || ''
                },

                // === ✅ กฎหักเงิน (เดิมอยู่ sub-doc → ย้ายมา main doc) ===
                deduction: {
                    gracePeriod: Number(storeConfig.gracePeriod) || 0,
                    deductionPerMinute: Number(storeConfig.deductionPerMinute) || 0,
                    maxDeduction: Number(storeConfig.maxDeduction) || 0
                },

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
                'settings.location': location,
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
