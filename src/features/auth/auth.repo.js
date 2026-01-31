import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/shared/lib/firebase';

/**
 * Auth Repository - Firebase operations for authentication
 */
export const authRepo = {
    /**
     * Get user profile from Firestore
     * @param {string} uid - User ID
     * @returns {Promise<Object|null>}
     */
    async getUserProfile(uid) {
        try {
            const docRef = doc(db, 'users', uid);
            const snap = await getDoc(docRef);
            return snap.exists() ? snap.data() : null;
        } catch (error) {
            console.error('Error getting user profile:', error);
            throw error;
        }
    },

    /**
     * Create user profile in Firestore
     * @param {string} uid - User ID
     * @param {Object} data - User data
     * @returns {Promise<void>}
     */
    async createUserProfile(uid, data) {
        try {
            await setDoc(doc(db, 'users', uid), {
                ...data,
                uid,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error creating user profile:', error);
            throw error;
        }
    },

    /**
     * Create company document
     * @param {Object} companyData - Company data
     * @returns {Promise<string>} Company ID
     */
    async createCompany(companyData) {
        try {
            const companyId = `COMP-${Date.now()}`;
            await setDoc(doc(db, 'companies', companyId), {
                ...companyData,
                createdAt: serverTimestamp()
            });
            return companyId;
        } catch (error) {
            console.error('Error creating company:', error);
            throw error;
        }
    },

    /**
     * Update user profile
     * @param {string} uid - User ID
     * @param {Object} data - Data to update
     * @returns {Promise<void>}
     */
    async updateUserProfile(uid, data) {
        try {
            await updateDoc(doc(db, 'users', uid), {
                ...data,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }
};
