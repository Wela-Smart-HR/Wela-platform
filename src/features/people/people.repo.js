import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, limit, startAfter } from 'firebase/firestore';
import { db } from '@/shared/lib/firebase';

/**
 * People Repository - Firestore operations for employee management
 */
export const peopleRepo = {
    /**
     * Get all employees by company
     * @param {string} companyId 
     * @returns {Promise<Array>}
     */
    async getEmployeesByCompany(companyId) {
        try {
            const q = query(
                collection(db, 'users'),
                where('companyId', '==', companyId)
            );

            const snap = await getDocs(q);
            return snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting employees:', error);
            throw error;
        }
    },

    /**
     * Get employees with pagination (Load More)
     * @param {string} companyId 
     * @param {number} limitSize 
     * @param {Object|null} lastDoc 
     * @returns {Promise<{employees: Array, lastDoc: Object|null}>}
     */
    async getEmployeesPaginated(companyId, limitSize = 20, lastDoc = null) {
        try {
            let constraints = [
                where('companyId', '==', companyId),
                // orderBy('name'), // Requires Index, skipping for now to keep it Zero-Cost/Simple
                limit(limitSize)
            ];

            if (lastDoc) {
                constraints.push(startAfter(lastDoc));
            }

            const q = query(collection(db, 'users'), ...constraints);
            const snap = await getDocs(q);

            const employees = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            return {
                employees,
                lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null
            };
        } catch (error) {
            console.error('Error getting employees paginated:', error);
            throw error;
        }
    },

    /**
     * Get employee by ID
     * @param {string} employeeId 
     * @returns {Promise<Object|null>}
     */
    async getEmployeeById(employeeId) {
        try {
            const docRef = doc(db, 'users', employeeId);
            const snap = await getDoc(docRef);

            if (!snap.exists()) return null;

            return {
                id: snap.id,
                ...snap.data()
            };
        } catch (error) {
            console.error('Error getting employee:', error);
            throw error;
        }
    },

    /**
     * Update employee profile
     * @param {string} employeeId 
     * @param {Object} updates 
     * @returns {Promise<void>}
     */
    async updateEmployee(employeeId, updates) {
        try {
            await updateDoc(doc(db, 'users', employeeId), {
                ...updates,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating employee:', error);
            throw error;
        }
    },

    /**
     * Delete employee (soft delete by setting active: false)
     * @param {string} employeeId 
     * @returns {Promise<void>}
     */
    async deleteEmployee(employeeId) {
        try {
            await updateDoc(doc(db, 'users', employeeId), {
                active: false,
                deletedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error deleting employee:', error);
            throw error;
        }
    },

    /**
     * Get employees by role
     * @param {string} companyId 
     * @param {string} role - 'owner' or 'employee'
     * @returns {Promise<Array>}
     */
    async getEmployeesByRole(companyId, role) {
        try {
            const q = query(
                collection(db, 'users'),
                where('companyId', '==', companyId),
                where('role', '==', role)
            );

            const snap = await getDocs(q);
            return snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting employees by role:', error);
            throw error;
        }
    }
};
