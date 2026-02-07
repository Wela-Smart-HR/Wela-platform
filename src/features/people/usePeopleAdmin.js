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
export function usePeopleAdmin(companyId, currentUser) {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Pagination State
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const LIMIT = 20;

    useEffect(() => {
        if (companyId) {
            loadFirstPage();
        }
    }, [companyId]);

    const loadFirstPage = async () => {
        try {
            setLoading(true);
            const { employees: newEmployees, lastDoc: newLast } = await peopleRepo.getEmployeesPaginated(companyId, LIMIT, null);
            // Client-side filter for active (soft-delete check)
            const activeEmployees = filterActiveEmployees(newEmployees);

            setEmployees(activeEmployees);
            setLastDoc(newLast);
            setHasMore(newEmployees.length === LIMIT); // If we got less than limit, no more data
            setError(null);
        } catch (err) {
            console.error('Error loading employees:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = async () => {
        if (!hasMore || loading) return;
        try {
            setLoading(true);
            const { employees: newEmployees, lastDoc: newLast } = await peopleRepo.getEmployeesPaginated(companyId, LIMIT, lastDoc);
            const activeEmployees = filterActiveEmployees(newEmployees);

            setEmployees(prev => [...prev, ...activeEmployees]);
            setLastDoc(newLast);

            if (newEmployees.length < LIMIT) {
                setHasMore(false);
            }
        } catch (err) {
            console.error('Error loading more employees:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const createEmployee = async (employeeData, password) => {
        try {
            setLoading(true);
            setError(null);

            // --- DATA MAPPING (Fix for Calculator) ---
            const formattedData = { ...employeeData };
            const salaryNum = Number(employeeData.salary) || 0;

            if (employeeData.type === 'รายวัน') {
                formattedData.dailyWage = salaryNum;
                formattedData.baseSalary = 0;
            } else {
                // Default to Monthly
                formattedData.baseSalary = salaryNum;
                formattedData.dailyWage = 0;
            }

            // Validate
            const validation = validateEmployeeData(formattedData);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Create using auth service
            await authService.createEmployee(formattedData, password, currentUser);

            await loadFirstPage();
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

            // --- DATA MAPPING (Fix for Calculator) ---
            const formattedUpdates = { ...updates };

            // If type or salary is being updated, re-map
            if (updates.type || updates.salary !== undefined) {
                const salaryNum = Number(updates.salary) || 0;

                // If type is not in updates, we might need to know existing type... 
                // But from People.jsx, we send the whole formData, so type should be there.
                // Safest to rely on what's passed or fallback to 'รายเดือน' if creating from scratch but here it's update.
                // However, People.jsx sends the FULL state of the form in handleSaveEmployee.

                if (updates.type === 'รายวัน') {
                    formattedUpdates.dailyWage = salaryNum;
                    formattedUpdates.baseSalary = 0;
                } else if (updates.type === 'รายเดือน') {
                    formattedUpdates.baseSalary = salaryNum;
                    formattedUpdates.dailyWage = 0;
                }
            }

            // Merge existing employee data with updates, pass isUpdate=true
            const existingEmployee = employees.find(e => e.id === employeeId);
            const validation = validateEmployeeData({ ...existingEmployee, ...formattedUpdates }, true);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            await peopleRepo.updateEmployee(employeeId, formattedUpdates);
            // Optimistic update
            setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, ...formattedUpdates } : e));
            // await loadEmployees(); // Don't reload, preserves pagination
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
            await loadFirstPage();
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
        hasMore,
        loadMore,
        reload: loadFirstPage,
        createEmployee,
        updateEmployee,
        deleteEmployee,
        getEmployeeCount
    };
}
