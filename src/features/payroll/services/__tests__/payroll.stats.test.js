import { describe, test, expect } from 'vitest';

// Simulate Stats Calculation from usePayrollSystem
const calculateStats = (employees, cycles = []) => {
    // Current Cycle Stats
    const totalNet = employees.reduce((sum, e) => sum + (e.financials?.net || 0), 0);
    const totalPaid = employees.reduce((sum, e) => sum + (e.paidAmount || 0), 0);

    // YTD Stats
    const ytdTotal = cycles.reduce((sum, c) => sum + (c.summary?.totalNet || 0), 0);

    return {
        totalNet,
        totalPaid,
        totalRemaining: totalNet - totalPaid,
        count: employees.length,
        ytdTotal
    };
};

describe('Payroll Statistics Calculation', () => {

    const mockEmployees = [
        { id: 1, financials: { net: 15000 }, paidAmount: 15000 }, // Paid Full
        { id: 2, financials: { net: 20000 }, paidAmount: 10000 }, // Partial
        { id: 3, financials: { net: 12000 }, paidAmount: 0 },     // Unpaid
    ];

    const mockCycles = [
        { id: 'c1', summary: { totalNet: 50000 } },
        { id: 'c2', summary: { totalNet: 60000 } }
    ];

    test('should calculate correct totals for current cycle', () => {
        const stats = calculateStats(mockEmployees, []);

        // Total Net: 15k + 20k + 12k = 47,000
        expect(stats.totalNet).toBe(47000);

        // Total Paid: 15k + 10k + 0 = 25,000
        expect(stats.totalPaid).toBe(25000);

        // Remaining: 47k - 25k = 22,000
        expect(stats.totalRemaining).toBe(22000);

        expect(stats.count).toBe(3);
    });

    test('should calculate YTD correctly from past cycles', () => {
        const stats = calculateStats([], mockCycles);

        // YTD: 50k + 60k = 110,000
        expect(stats.ytdTotal).toBe(110000);
    });

    test('should handle empty data gracefully', () => {
        const stats = calculateStats([], []);

        expect(stats.totalNet).toBe(0);
        expect(stats.totalPaid).toBe(0);
        expect(stats.totalRemaining).toBe(0);
        expect(stats.ytdTotal).toBe(0);
    });
});
