import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { auth, firebaseConfig } from '@/shared/lib/firebase';
import { authRepo } from './auth.repo';

/**
 * Auth Service - High-level authentication operations
 */
export const authService = {
    /**
     * Signup owner (company owner)
     * @param {string} email 
     * @param {string} password 
     * @param {string} name 
     * @param {string} companyName 
     * @returns {Promise<Object>} User object
     */
    async signupOwner(email, password, name, companyName) {
        try {
            // Create auth user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create company
            const companyId = await authRepo.createCompany({
                name: companyName,
                ownerId: user.uid
            });

            // Create user profile
            await authRepo.createUserProfile(user.uid, {
                email,
                name,
                role: 'owner',
                companyId
            });

            return user;
        } catch (error) {
            console.error('Error signing up owner:', error);
            throw error;
        }
    },

    /**
     * Create employee (by owner)
     * @param {Object} formData - Employee data
     * @param {string} password - Employee password
     * @param {Object} currentUser - Current user (must be owner)
     * @returns {Promise<Object>} New employee user
     */
    async createEmployee(formData, password, currentUser) {
        if (!currentUser || currentUser.role !== 'owner') {
            throw new Error('Access Denied: Only owners can create employees');
        }

        try {
            // Create secondary app to avoid logging out current user
            const secondaryApp = initializeApp(firebaseConfig, `Secondary-${Date.now()}`);
            const secondaryAuth = getAuth(secondaryApp);

            try {
                // Create employee auth user
                const userCredential = await createUserWithEmailAndPassword(
                    secondaryAuth,
                    formData.email,
                    password
                );

                // Create employee profile
                await authRepo.createUserProfile(userCredential.user.uid, {
                    ...formData,
                    role: 'employee',
                    companyId: currentUser.companyId
                });

                // Sign out from secondary auth
                await signOut(secondaryAuth);

                // Clean up secondary app (ใช้ deleteApp แทน .delete())
                const { deleteApp } = await import('firebase/app');
                await deleteApp(secondaryApp);

                return userCredential.user;
            } catch (error) {
                // Clean up on error
                try {
                    const { deleteApp } = await import('firebase/app');
                    await deleteApp(secondaryApp);
                } catch (cleanupError) {
                    console.error('Error cleaning up secondary app:', cleanupError);
                }
                throw error;
            }
        } catch (error) {
            console.error('Error creating employee:', error);
            throw error;
        }
    },

    /**
     * Login
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<Object>} { user, role }
     */
    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const profile = await authRepo.getUserProfile(userCredential.user.uid);
            return { user: userCredential.user, role: profile.role };
        } catch (error) {
            console.error('Error logging in:', error);
            throw error;
        }
    },

    /**
     * Logout
     * @returns {Promise<void>}
     */
    async logout() {
        try {
            return await signOut(auth);
        } catch (error) {
            console.error('Error logging out:', error);
            throw error;
        }
    },

    /**
     * Change password
     * @param {string} email - User email
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<void>}
     */
    async changePassword(email, currentPassword, newPassword) {
        try {
            // Reauthenticate
            const user = auth.currentUser;
            if (!user) throw new Error('No user logged in');

            const credential = EmailAuthProvider.credential(email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Change password
            await updatePassword(user, newPassword);

            // Update lastPasswordChange in Firestore
            await authRepo.updateUserProfile(user.uid, {
                lastPasswordChange: new Date()
            });
        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    }
};
