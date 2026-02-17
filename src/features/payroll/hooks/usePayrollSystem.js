import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { PayrollRepo } from '../services/payroll.repo';
import { PayrollCalculator } from '../services/payroll.calculator';

export const usePayrollSystem = () => {
    const { currentUser } = useAuth();
    const companyId = currentUser?.companyId;

    // View State
    const [view, setView] = useState('cycles'); // 'cycles', 'list'
    const [activeCycle, setActiveCycle] = useState(null);
    const [employees, setEmployees] = useState([]); // List for active cycle
    const [cycles, setCycles] = useState([]);

    // UI State
    const [isNewCycleOpen, setIsNewCycleOpen] = useState(false);
    const [activeEmp, setActiveEmp] = useState(null); // Selected for sheet
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);

    // Data Fetching
    useEffect(() => {
        if (!companyId) return;
        loadCycles();
    }, [companyId]);

    const loadCycles = async () => {
        try {
            const data = await PayrollRepo.getCycles(companyId);
            setCycles(data);
        } catch (error) {
            console.error("Load Cycles Error:", error);
            alert("Failed to load cycles");
        }
    };

    // Actions
    const handleCreateCycle = async (formData) => {
        try {
            await PayrollRepo.createCycle(companyId, formData);
            await loadCycles(); // Refresh list
            // Optionally auto-select the new cycle (logic to find new ID needed)
        } catch (error) {
            console.error("Create Cycle Error:", error);
            alert("Create failed: " + error.message);
        }
    };

    const handleSelectCycle = async (cycle) => {
        setActiveCycle(cycle);

        // Mocking employee fetch for now since we haven't implemented full batch creation yet.
        // In real flow, createCycle would generate payslips, here we'd fetch them based on cycleId.
        // For prototype visualization, let's use some dummy data if empty.
        // TODO: Implement `PayrollRepo.getPayslips(cycle.id)`

        // TEMPORARY: Dummy Data for UI Check
        setEmployees([
            { id: '1', employeeSnapshot: { name: 'สมชาย', role: 'Manager', type: 'monthly', department: 'IT' }, financials: { net: 25000 }, paidAmount: 0, paymentStatus: 'pending', payments: [] },
            { id: '2', employeeSnapshot: { name: 'สมหญิง', role: 'Staff', type: 'daily', department: 'Sales' }, financials: { net: 15000 }, paidAmount: 5000, paymentStatus: 'partial', payments: [{ id: 1, amount: 5000, date: '2026-02-17' }] },
        ]);

        setView('list');
    };

    const handleSaveEmp = async (updatedForm) => {
        if (!activeEmp) return;

        // 1. Recalculate Net
        const newNet = PayrollCalculator.calculateNet(updatedForm);

        // 2. Merge changes
        const updatedEmp = {
            ...activeEmp,
            financials: { ...activeEmp.financials, ...updatedForm, net: newNet },
            customItems: [...updatedForm.customIncomes.map(i => ({ ...i, type: 'income' })), ...updatedForm.customDeducts.map(d => ({ ...d, type: 'deduct' }))]
        };

        // 3. Update Local State (Optimistic)
        setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
        setActiveEmp(updatedEmp);

        // 4. Save to DB
        // await PayrollRepo.savePayslip(updatedEmp); -- TODO: Connect
    };

    const handleConfirmPayment = async (amount) => {
        if (!activeEmp) return;

        const payment = {
            amount,
            date: new Date().toISOString(),
            method: 'transfer',
            note: 'จ่ายเพิ่ม'
        };

        try {
            // await PayrollRepo.addPayment(activeEmp.id, payment); -- TODO: Connect

            // Local Update
            const newPaid = (activeEmp.paidAmount || 0) + amount;
            const newStatus = newPaid >= activeEmp.financials.net ? 'paid' : 'partial';
            const updatedEmp = {
                ...activeEmp,
                paidAmount: newPaid,
                paymentStatus: newStatus,
                payments: [...(activeEmp.payments || []), payment]
            };

            setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
            setActiveEmp(updatedEmp);

        } catch (error) {
            alert(error.message);
        }
    };

    const handleRemovePayment = async (idx) => {
        // Logic to remove...
        // For now just alert
        if (!confirm("ลบการจ่ายเงินนี้?")) return;

        const newPayments = [...activeEmp.payments];
        const removed = newPayments.splice(idx, 1)[0];
        const newPaid = (activeEmp.paidAmount || 0) - removed.amount;

        const updatedEmp = { ...activeEmp, payments: newPayments, paidAmount: newPaid };
        setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
        setActiveEmp(updatedEmp);
    };

    // Computed Totals
    const totals = {
        ytdTotal: cycles.reduce((acc, c) => acc + (c.summary?.totalPaid || 0), 0),
        staffCount: employees.length || 0,
        totalNet: employees.reduce((acc, e) => acc + (e.financials?.net || 0), 0),
        totalRemaining: employees.reduce((acc, e) => acc + ((e.financials?.net || 0) - (e.paidAmount || 0)), 0),
        totalPaid: employees.reduce((acc, e) => acc + (e.paidAmount || 0), 0),
    };

    return {
        state: { view, activeCycle, employees, cycles, totals, isNewCycleOpen, activeEmp, isPaymentOpen },
        actions: {
            setView,
            setIsNewCycleOpen,
            handleCreateCycle,
            handleSelectCycle,
            setActiveEmp,
            setIsPaymentOpen,
            handleSaveEmp,
            handleConfirmPayment,
            handleRemovePayment
        }
    };
};
