import { useState, useEffect } from 'react';
import { settingsRepo } from './settings.repo';
import {
    validateLocation,
    validateAttendanceConfig,
    validatePayrollConfig,
    getDefaultSettings
} from './settings.rules';

/**
 * Hook for managing company settings (admin/owner only)
 * @param {string} companyId 
 * @returns {Object}
 */
export function useSettings(companyId) {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (companyId) {
            loadSettings();
        }
    }, [companyId]);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await settingsRepo.getCompanySettings(companyId);

            // Merge with defaults if some settings are missing
            const defaults = getDefaultSettings();
            const mergedSettings = {
                ...defaults,
                ...data,
                location: { ...defaults.location, ...(data?.location || {}) },
                attendanceConfig: { ...defaults.attendanceConfig, ...(data?.attendanceConfig || {}) },
                payrollConfig: { ...defaults.payrollConfig, ...(data?.payrollConfig || {}) }
            };

            setSettings(mergedSettings);
            setError(null);
        } catch (err) {
            console.error('Error loading settings:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateLocation = async (location) => {
        try {
            setLoading(true);
            setError(null);

            const validation = validateLocation(location);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            await settingsRepo.updateCompanyLocation(companyId, location);
            await loadSettings();
        } catch (err) {
            console.error('Error updating location:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateAttendanceConfig = async (config) => {
        try {
            setLoading(true);
            setError(null);

            const validation = validateAttendanceConfig(config);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            await settingsRepo.updateAttendanceConfig(companyId, config);
            await loadSettings();
        } catch (err) {
            console.error('Error updating attendance config:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updatePayrollConfig = async (config) => {
        try {
            setLoading(true);
            setError(null);

            const validation = validatePayrollConfig(config);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            await settingsRepo.updatePayrollConfig(companyId, config);
            await loadSettings();
        } catch (err) {
            console.error('Error updating payroll config:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateAllSettings = async (newSettings) => {
        try {
            setLoading(true);
            setError(null);

            // Validate all sections
            if (newSettings.location) {
                const validation = validateLocation(newSettings.location);
                if (!validation.valid) throw new Error(validation.error);
            }

            if (newSettings.attendanceConfig) {
                const validation = validateAttendanceConfig(newSettings.attendanceConfig);
                if (!validation.valid) throw new Error(validation.error);
            }

            if (newSettings.payrollConfig) {
                const validation = validatePayrollConfig(newSettings.payrollConfig);
                if (!validation.valid) throw new Error(validation.error);
            }

            await settingsRepo.updateCompanySettings(companyId, newSettings);
            await loadSettings();
        } catch (err) {
            console.error('Error updating settings:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };
    /**
     * Save all settings to 3 collections (for Settings.jsx handleSave)
     * @param {Object} storeConfig - Full config from Settings page state
     */
    const saveAll = async (storeConfig) => {
        try {
            setLoading(true);
            setError(null);
            await settingsRepo.saveAllSettings(companyId, storeConfig);
            await loadSettings();
        } catch (err) {
            console.error('Error saving all settings:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        settings,
        loading,
        error,
        reload: loadSettings,
        updateLocation,
        updateAttendanceConfig,
        updatePayrollConfig,
        updateAllSettings,
        saveAll
    };
}
