import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/shared/lib/firebase';
import { authRepo } from './auth.repo';
import { authService } from './auth.service';

/**
 * Custom hook for authentication
 * @returns {Object} Auth state and methods
 */
export function useAuth() {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // Get user profile from Firestore
                    const profile = await authRepo.getUserProfile(user.uid);
                    setCurrentUser({ ...user, ...profile });
                } catch (error) {
                    console.error('Error loading user profile:', error);
                    setCurrentUser(null);
                }
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return {
        currentUser,
        loading,
        signupOwner: authService.signupOwner,
        createEmployee: (formData, password) =>
            authService.createEmployee(formData, password, currentUser),
        login: authService.login,
        logout: authService.logout
    };
}
