import { describe, test, expect } from 'vitest';

// Extract logic from EmployeeList for testing integrity
// Since the logic is inside the component, we simulate it here to ensure the logic itself is correct.

const applyFilter = (employees, filterStatus) => {
    return employees.filter(emp => {
        if (filterStatus === 'remaining') return emp.paymentStatus !== 'paid';
        if (filterStatus === 'paid') return emp.paymentStatus === 'paid';
        return true;
    });
};

const applyGrouping = (employees, groupBy) => {
    if (groupBy === 'none') {
        return [{ title: null, items: employees }];
    }

    const groups = {};
    employees.forEach(emp => {
        const key = groupBy === 'type' ? (emp.employeeSnapshot?.type || 'monthly') : (emp.employeeSnapshot?.department || 'Other');

        if (!groups[key]) groups[key] = { title: key, items: [] };
        groups[key].items.push(emp);
    });

    return Object.values(groups);
};

describe('Employee List Filter & Group Logic', () => {

    const mockEmployees = [
        { id: 1, paymentStatus: 'paid', employeeSnapshot: { type: 'monthly', department: 'HR' } },
        { id: 2, paymentStatus: 'pending', employeeSnapshot: { type: 'daily', department: 'IT' } },
        { id: 3, paymentStatus: 'partial', employeeSnapshot: { type: 'monthly', department: 'IT' } },
        { id: 4, paymentStatus: 'paid', employeeSnapshot: { type: 'daily', department: 'HR' } }
    ];

    // ----------------------------------------------------
    // 1. Filter Logic
    // ----------------------------------------------------
    describe('Filtering', () => {
        test('Status: all', () => {
            const result = applyFilter(mockEmployees, 'all');
            expect(result.length).toBe(4);
        });

        test('Status: paid', () => {
            const result = applyFilter(mockEmployees, 'paid');
            expect(result.length).toBe(2); // ID 1, 4
            expect(result.every(e => e.paymentStatus === 'paid')).toBe(true);
        });

        test('Status: remaining (pending + partial)', () => {
            const result = applyFilter(mockEmployees, 'remaining');
            expect(result.length).toBe(2); // ID 2, 3
            expect(result.find(e => e.id === 2)).toBeDefined();
            expect(result.find(e => e.id === 3)).toBeDefined();
        });
    });

    // ----------------------------------------------------
    // 2. Grouping Logic
    // ----------------------------------------------------
    describe('Grouping', () => {
        test('Group By: type (monthly/daily)', () => {
            const result = applyGrouping(mockEmployees, 'type');

            // Should have 2 groups: monthly, daily
            expect(result.length).toBe(2);

            const monthlyGroup = result.find(g => g.title === 'monthly');
            expect(monthlyGroup.items.length).toBe(2); // ID 1, 3
        });

        test('Group By: department', () => {
            const result = applyGrouping(mockEmployees, 'department');

            // HR, IT
            expect(result.length).toBe(2);

            const itGroup = result.find(g => g.title === 'IT');
            expect(itGroup.items.length).toBe(2); // ID 2, 3
        });

        test('Group By: none', () => {
            const result = applyGrouping(mockEmployees, 'none');
            expect(result.length).toBe(1);
            expect(result[0].items.length).toBe(4);
        });
    });
});
