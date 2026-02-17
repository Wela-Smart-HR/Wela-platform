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
    const [isLoading, setIsLoading] = useState(false);

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
        setIsLoading(true);
        try {
            const data = await PayrollRepo.getCycles(companyId);
            setCycles(data);
        } catch (error) {
            console.error("Load Cycles Error:", error);
        } finally {
            setIsLoading(false);
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
        setIsLoading(true);
        try {
            const data = await PayrollRepo.getPayslips(cycle.id);
            setEmployees(data);
            setView('list');
        } catch (error) {
            console.error("Load Payslips Error:", error);
            alert("Failed to load payslips");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteCycle = async () => {
        if (!activeCycle) return;
        if (!confirm(`ลบรอบ "${activeCycle.title || activeCycle.id}" และ Payslip ทั้งหมด?\n\n⚠️ การกระทำนี้ไม่สามารถย้อนกลับได้!`)) return;

        try {
            await PayrollRepo.deleteCycle(activeCycle.id);
            setActiveCycle(null);
            setEmployees([]);
            setView('cycles');
            await loadCycles();
            alert('ลบรอบบัญชีเรียบร้อยแล้ว!');
        } catch (error) {
            console.error("Delete Cycle Error:", error);
            alert("ลบไม่สำเร็จ: " + error.message);
        }
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

    // Data Fetching
    useEffect(() => {
        if (!companyId) return;
        loadCycles();
        loadStaffCount();
    }, [companyId]);

    const loadStaffCount = async () => {
        try {
            const snap = await PayrollRepo.getStaffCount(companyId);
            setStaffCount(snap);
        } catch (e) {
            console.error(e);
        }
    };

    // ... inside usePayrollSystem
    const [staffCount, setStaffCount] = useState(0);

    // ... inside computed totals
    const totals = {
        ytdTotal: cycles.reduce((acc, c) => acc + (c.summary?.totalPaid || 0), 0),
        staffCount: staffCount, // Use real count
        // ...
    };

    return {
        state: { view, activeCycle, employees, cycles, totals, isNewCycleOpen, activeEmp, isPaymentOpen, isLoading },
        actions: {
            setView,
            setIsNewCycleOpen,
            handleCreateCycle,
            handleSelectCycle,
            handleDeleteCycle,
            setActiveEmp,
            setIsPaymentOpen,
            handleSaveEmp,
            handleConfirmPayment,
            handleRemovePayment
        }
    };
};
