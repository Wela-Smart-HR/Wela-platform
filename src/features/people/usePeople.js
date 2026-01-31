import { useState, useEffect } from 'react';
import { peopleRepo } from './people.repo';
import { validateEmployeeData, filterActiveEmployees } from './people.rules';
import { authService } from '../auth/auth.service';

/**
 * Hook for managing employees (admin perspective)
 * @param {string} companyId 
 * @param {Object} currentUser - Current logged-in user
 * @returns {Object}
 */
export function usePeople(companyId, currentUser) {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (companyId) {
            loadEmployees();
        }
    }, [companyId]);

    const loadEmployees = async () => {
        try {
            setLoading(true);
            const data = await peopleRepo.getEmployeesByCompany(companyId);
            const activeEmployees = filterActiveEmployees(data);
            setEmployees(activeEmployees);
            setError(null);
        } catch (err) {
            console.error('Error loading employees:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const createEmployee = async (employeeData, password) => {
        try {
            setLoading(true);
            setError(null);

            // Validate
            const validation = validateEmployeeData(employeeData);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Create using auth service
            await authService.createEmployee(employeeData, password, currentUser);

            await loadEmployees();
        } catch (err) {
            console.error('Error creating employee:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateEmployee = async (employeeId, updates) => {
        try {
            setLoading(true);

            // Validate updates
            const validation = validateEmployeeData({ ...employees.find(e => e.id === employeeId), ...updates });
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            await peopleRepo.updateEmployee(employeeId, updates);
            await loadEmployees();
            setError(null);
        } catch (err) {
            console.error('Error updating employee:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteEmployee = async (employeeId) => {
        try {
            setLoading(true);
            await peopleRepo.deleteEmployee(employeeId);
            await loadEmployees();
            setError(null);
        } catch (err) {
            console.error('Error deleting employee:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const getEmployeeCount = () => {
        return {
            total: employees.length,
            owners: employees.filter(e => e.role === 'owner').length,
            employees: employees.filter(e => e.role === 'employee').length
        };
    };

    return {
        employees,
        loading,
        error,
        reload: loadEmployees,
        createEmployee,
        updateEmployee,
        deleteEmployee,
        getEmployeeCount
    };
}
