import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { PayrollRepo } from '../services/payroll.repo';
import { PayrollCalculator } from '../services/payroll.calculator';

export const usePayrollSystem = () => {
    const { currentUser } = useAuth();
    const companyId = currentUser?.companyId;

    // --- State ---
    const [view, setView] = useState('cycles'); // 'cycles' | 'list'
    const [cycles, setCycles] = useState([]);
    const [activeCycle, setActiveCycle] = useState(null);
    const [employees, setEmployees] = useState([]); // Employee list (Payslips) for active cycle
    const [isLoading, setIsLoading] = useState(false);

    // --- UI Triggers ---
    const [isNewCycleOpen, setIsNewCycleOpen] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [activeEmp, setActiveEmp] = useState(null); // Payslip ที่กำลังเปิด Sheet ("The Brain" integration point)

    // --- 1. Load Cycles (Dashboard) ---
    const loadCycles = async () => {
        if (!companyId) return;
        setIsLoading(true);
        try {
            const data = await PayrollRepo.getCycles(companyId);
            setCycles(data);
        } catch (error) {
            console.error("Load Cycles Failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-load on mount
    useEffect(() => { loadCycles(); }, [companyId]);

    // --- 2. Cycle Actions ---
    const handleCreateCycle = async (formData) => {
        try {
            await PayrollRepo.createCycle(companyId, formData);
            await loadCycles(); // Refresh List
            setIsNewCycleOpen(false);
        } catch (error) {
            alert("สร้างรอบบัญชีไม่สำเร็จ: " + error.message);
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
            console.error("Load Payslips Failed:", error);
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

    // --- 3. Employee/Payslip Actions (The Brain Integration) ---

    // เปิด Sheet พนักงาน
    const handleOpenEmp = (emp) => {
        // Deep copy เพื่อป้องกันการแก้ state โดยตรง
        setActiveEmp(JSON.parse(JSON.stringify(emp)));
    };

    // บันทึกการแก้ไข (Recalculate logic อยู่ที่นี่)
    const handleUpdateEmp = async (field, value) => {
        if (!activeEmp) return;

        // 1. Update Local Active Emp State
        const updatedEmp = { ...activeEmp };

        // Helper ในการเข้าถึง nested object (เช่น 'financials.salary')
        if (field.includes('.')) {
            const [parent, key] = field.split('.');
            updatedEmp[parent] = { ...updatedEmp[parent], [key]: Number(value) };
        } else {
            updatedEmp[field] = value;
        }

        // 2. 🧠 Recalculate Net using The Brain
        // ดึงค่าทั้งหมดมารวมกันเพื่อคำนวณใหม่
        const calcItems = {
            salary: updatedEmp.financials.salary,
            ot: updatedEmp.financials.ot,
            incentive: updatedEmp.financials.incentive,
            deductions: updatedEmp.financials.deductions, // late/absent
            sso: updatedEmp.financials.sso,
            tax: updatedEmp.financials.tax,
            customIncomes: updatedEmp.customIncomes || [],
            customDeducts: updatedEmp.customDeducts || []
        };

        const newNet = PayrollCalculator.calculateNet(calcItems);
        updatedEmp.financials.net = newNet;
        // Sync multiple net totals if they exist in schema, but mainly 'net' inside financials
        // updatedEmp.financials.netTotal = newNet; // Sync naming if needed

        // 3. Update Active Emp (Immediate UI Feedback)
        setActiveEmp(updatedEmp);

        // 4. Update List (Background - Optimistic UI)
        setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
    };

    // กด Save จริงๆ (บันทึกลง DB)
    const handleSaveEmpSheet = async () => {
        if (!activeEmp) return;
        try {
            // Using alias 'updatePayslip' for clarity, but mapped to savePayslip
            if (PayrollRepo.updatePayslip) {
                await PayrollRepo.updatePayslip(activeEmp.id, activeEmp);
            } else {
                await PayrollRepo.savePayslip(activeEmp);
            }
            // alert("บันทึกเรียบร้อย"); // Optional
        } catch (error) {
            alert("Save Failed: " + error.message);
        }
    };

    // --- 4. Payment Actions (The Guard Integration) ---
    const handleConfirmPayment = async (amount) => {
        if (!activeEmp) return;
        try {
            // เรียก Repo Transaction
            await PayrollRepo.addPayment(activeEmp.id, {
                amount: Number(amount),
                date: new Date().toISOString(),
                method: 'transfer', // Default
                note: 'Manual Payment'
            });

            // Refresh ข้อมูลพนักงานคนนั้นใหม่ (เพื่อให้ได้สถานะล่าสุดจาก DB)
            // หรือจะคำนวณ Local State ก็ได้ แต่การ Fetch ใหม่ชัวร์กว่าเรื่อง Status
            if (activeCycle) {
                const freshPayslips = await PayrollRepo.getPayslips(activeCycle.id);
                setEmployees(freshPayslips);

                // Update Active Emp ถ้ายังเปิดอยู่
                const freshEmp = freshPayslips.find(e => e.id === activeEmp.id);
                if (freshEmp) setActiveEmp(freshEmp);
            }

            setIsPaymentOpen(false);
        } catch (error) {
            alert(error.message); // แสดง Error จาก Transaction (เช่น จ่ายเกิน)
        }
    };

    // --- 5. Computed Stats (Dashboard) ---
    const stats = useMemo(() => {
        const totalNet = employees.reduce((sum, e) => sum + (e.financials?.net || 0), 0);
        const totalPaid = employees.reduce((sum, e) => sum + (e.paidAmount || 0), 0);
        return {
            totalNet,
            totalPaid,
            totalRemaining: totalNet - totalPaid,
            count: employees.length
        };
    }, [employees]);

    return {
        // State
        view,
        cycles,
        activeCycle,
        employees,
        isLoading,
        stats,
        // Modals State
        isNewCycleOpen, setIsNewCycleOpen,
        isPaymentOpen, setIsPaymentOpen,
        activeEmp,

        // Actions
        loadCycles,
        handleCreateCycle,
        handleSelectCycle,
        handleDeleteCycle,
        handleOpenEmp,
        handleUpdateEmp,
        handleSaveEmpSheet,
        handleConfirmPayment,

        // Navigation
        goBack: () => setView('cycles')
    };
};
