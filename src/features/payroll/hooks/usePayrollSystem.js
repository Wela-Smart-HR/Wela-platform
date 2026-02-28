import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { PayrollRepo } from '../services/payroll.repo';
import { PayrollCalculator } from '../services/payroll.calculator';
import Swal from 'sweetalert2';

export const usePayrollSystem = () => {
    const { currentUser } = useAuth();
    const companyId = currentUser?.companyId;

    // --- State ---
    const [view, setView] = useState('cycles'); // 'cycles' | 'list'
    const [cycles, setCycles] = useState([]);
    const [activeCycle, setActiveCycle] = useState(null);
    const [employees, setEmployees] = useState([]); // Employee list (Payslips) for active cycle
    const [isLoading, setIsLoading] = useState(false);
    const [staffCount, setStaffCount] = useState(0);

    // --- UI Triggers ---
    const [isNewCycleOpen, setIsNewCycleOpen] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [activeEmp, setActiveEmp] = useState(null); // Payslip ที่กำลังเปิด Sheet ("The Brain" integration point)

    // --- 1. Load Cycles (Dashboard) ---
    const loadCycles = async () => {
        if (!companyId) return;
        setIsLoading(true);
        try {
            const [data, count] = await Promise.all([
                PayrollRepo.getCycles(companyId),
                PayrollRepo.getStaffCount(companyId)
            ]);
            setCycles(data);
            setStaffCount(count);
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

        const result = await Swal.fire({
            title: `ลบรอบ "${activeCycle.title || activeCycle.id}"?`,
            text: "ข้อมูล Payslip ทั้งหมดในรอบนี้จะถูกลบและกู้คืนไม่ได้!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33', // Red for delete
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ลบข้อมูล',
            cancelButtonText: 'ยกเลิก',
            customClass: {
                popup: 'rounded-2xl',
                confirmButton: 'rounded-xl',
                cancelButton: 'rounded-xl'
            }
        });

        if (!result.isConfirmed) return;

        try {
            await PayrollRepo.deleteCycle(activeCycle.id);
            setActiveCycle(null);
            setEmployees([]);
            setView('cycles');
            await loadCycles();

            Swal.fire({
                icon: 'success',
                title: 'ลบเรียบร้อย',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error) {
            console.error("Delete Cycle Error:", error);
            Swal.fire({
                icon: 'error',
                title: 'ลบไม่สำเร็จ',
                text: error.message
            });
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
        let updatedEmp = { ...activeEmp };

        // 🚨 ARCHITECTURE FIX: รองรับการ Update แบบ Batch ป้องกันตอ Race Condition 
        if (field === 'batch_update') {
            updatedEmp = {
                ...updatedEmp,
                financials: { ...(updatedEmp.financials || {}), ...value.financials },
                customItems: value.customItems
            };
        }
        // Helper ในการเข้าถึง nested object (เช่น 'financials.salary')
        else if (field.includes('.')) {
            const [parent, key] = field.split('.');
            updatedEmp[parent] = { ...updatedEmp[parent], [key]: Number(value) };
        }
        // Handle object merge (Safe Partial Update e.g. 'financials')
        else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            updatedEmp[field] = { ...(updatedEmp[field] || {}), ...value };
        }
        // Handle direct value replacement
        else {
            updatedEmp[field] = value;
        }

        // 2. 🧠 Recalculate Net using The Brain
        // ดึงค่าทั้งหมดมารวมกันเพื่อคำนวณใหม่ โดยอ่านจาก customItems ตาม Schema ของ DB อย่างถูกต้อง
        const calcItems = {
            salary: updatedEmp.financials.salary,
            ot: updatedEmp.financials.ot,
            incentive: updatedEmp.financials.incentive,
            deductions: updatedEmp.financials.deductions, // late/absent
            sso: updatedEmp.financials.sso,
            tax: updatedEmp.financials.tax,
            customIncomes: (updatedEmp.customItems || []).filter(i => i.type === 'income'),
            customDeducts: (updatedEmp.customItems || []).filter(i => i.type === 'deduct')
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
            if (PayrollRepo.updatePayslip) {
                await PayrollRepo.updatePayslip(activeEmp.id, activeEmp);
            } else {
                await PayrollRepo.savePayslip(activeEmp);
            }
            Swal.fire({
                icon: 'success',
                title: 'บันทึกเรียบร้อย!',
                timer: 1500,
                showConfirmButton: false,
                customClass: { popup: 'rounded-2xl' }
            });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: error.message, confirmButtonColor: '#2563EB' });
        }
    };

    // ปิดรอบเงินเดือน (Lock Cycle)
    const handleLockCycle = async () => {
        if (!activeCycle) return;

        const result = await Swal.fire({
            title: `ยืนยันปิดรอบ "${activeCycle.title || activeCycle.id}"?`,
            html: `<div class="text-sm text-left space-y-1">
                <p>• ข้อมูลจะถูก<strong>ล็อก</strong>และแก้ไขไม่ได้</p>
                <p>• สถานะจะเปลี่ยนเป็น '<strong>ปิดงวด</strong>'</p>
            </div>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#2563EB',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'ยืนยันปิดงวด',
            cancelButtonText: 'ยกเลิก',
            customClass: {
                popup: 'rounded-3xl',
                confirmButton: 'rounded-xl px-6 py-2.5',
                cancelButton: 'rounded-xl px-6 py-2.5'
            }
        });

        if (!result.isConfirmed) return;

        try {
            await PayrollRepo.lockCycle(activeCycle.id);
            // Refresh cycles list
            await loadCycles();
            setView('cycles');

            Swal.fire({
                icon: 'success',
                title: 'ปิดงวดเรียบร้อย!',
                text: 'ข้อมูลถูกล็อกแล้ว 🔒',
                confirmButtonColor: '#2563EB',
                timer: 2000,
                showConfirmButton: false,
                customClass: { popup: 'rounded-2xl' }
            });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error.message, confirmButtonColor: '#2563EB' });
        }
    };

    // --- Batch Payment Actions (ยืนยันการจ่ายทั้งรอบ) ---
    const handleBatchPayment = async (cycleId) => {
        try {
            await PayrollRepo.batchApprovePayments(cycleId);

            // Refresh data
            if (activeCycle && activeCycle.id === cycleId) {
                const freshPayslips = await PayrollRepo.getPayslips(cycleId);
                setEmployees(freshPayslips);
            }
        } catch (error) {
            throw error;
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

    // --- Remove Payment (ลบการจ่ายเงิน) ---
    const handleRemovePayment = async (paymentId) => {
        if (!activeEmp) return;
        try {
            const updatedPayments = (activeEmp.payments || []).filter(p => p.id !== paymentId);
            const newPaidTotal = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
            const net = activeEmp.financials?.net || 0;
            const newStatus = newPaidTotal >= net ? 'paid' : newPaidTotal > 0 ? 'partial' : 'pending';

            const updatedEmp = {
                ...activeEmp,
                payments: updatedPayments,
                paidAmount: newPaidTotal,
                paymentStatus: newStatus
            };

            // Save to DB
            await PayrollRepo.savePayslip(updatedEmp);

            // Update UI
            setActiveEmp(updatedEmp);
            setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
        } catch (error) {
            alert("ลบรายการจ่ายไม่สำเร็จ: " + error.message);
        }
    };

    // --- Rebuild Cycle (Safe Rebuild with Lock Check) ---
    const handleRebuildCycle = async () => {
        if (!activeCycle) return;

        const result = await Swal.fire({
            title: 'Rebuild Payroll Cycle?',
            html: `<div class="text-sm text-left space-y-2">
                <p>• This will <strong>delete all current payslips</strong> and recreate them</p>
                <p>• Attendance data will be reprocessed from scratch</p>
                <p>• <strong class="text-red-600">Cannot be undone</strong></p>
                <p class="text-xs text-gray-500">Cycle: ${activeCycle.title || activeCycle.id}</p>
            </div>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Rebuild Cycle',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'rounded-2xl',
                confirmButton: 'rounded-xl px-6 py-2.5',
                cancelButton: 'rounded-xl px-6 py-2.5'
            }
        });

        if (!result.isConfirmed) return;

        try {
            setIsLoading(true);

            // Call the safe rebuild function
            await PayrollRepo.rebuildCycle(activeCycle.id);

            // Refresh the cycle data
            await handleSelectCycle(activeCycle);

            Swal.fire({
                icon: 'success',
                title: 'Cycle Rebuilt Successfully!',
                html: `<div class="text-sm">
                    <p>All payslips have been recreated with fresh attendance data.</p>
                    <p class="text-xs text-gray-500 mt-2">Please review the data before processing payments.</p>
                </div>`,
                confirmButtonColor: '#2563EB',
                customClass: { popup: 'rounded-2xl' }
            });
        } catch (error) {
            console.error('Rebuild Cycle Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Rebuild Failed',
                html: `<div class="text-sm">
                    <p>${error.message}</p>
                    <p class="text-xs text-gray-500 mt-2">Please contact support if this persists.</p>
                </div>`,
                confirmButtonColor: '#dc2626'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // --- Validate Cycle Data ---
    const handleValidateCycle = async () => {
        if (!activeCycle) return;

        try {
            setIsLoading(true);
            const validation = await PayrollRepo.validateCycleData(activeCycle.id);

            if (validation.isValid) {
                Swal.fire({
                    icon: 'success',
                    title: 'Data Validation Passed!',
                    html: `<div class="text-sm">
                        <p>All ${validation.totalEmployees} employees have complete attendance data.</p>
                        <p class="text-xs text-gray-500 mt-2">Expected: ${validation.summary.totalExpectedDays} days per employee</p>
                    </div>`,
                    confirmButtonColor: '#16a34a'
                });
            } else {
                const issueSummary = validation.issues.slice(0, 3).map(issue =>
                    `<li>${issue.employee}: ${issue.missingDays.length} missing days (${issue.completionRate})</li>`
                ).join('');

                Swal.fire({
                    icon: 'warning',
                    title: 'Data Validation Issues Found',
                    html: `<div class="text-sm text-left">
                        <p><strong>${validation.issuesCount}</strong> employees have incomplete data:</p>
                        <ul class="mt-2 space-y-1">${issueSummary}</ul>
                        ${validation.issues.length > 3 ? `<p class="text-xs text-gray-500 mt-2">... and ${validation.issues.length - 3} more</p>` : ''}
                        <p class="text-xs text-gray-500 mt-3">Consider rebuilding this cycle to fix missing data.</p>
                    </div>`,
                    confirmButtonColor: '#f59e0b',
                    showCancelButton: true,
                    confirmButtonText: 'Rebuild Cycle',
                    cancelButtonText: 'Close',
                    customClass: { popup: 'rounded-2xl' }
                }).then((result) => {
                    if (result.isConfirmed) {
                        handleRebuildCycle();
                    }
                });
            }
        } catch (error) {
            console.error('Validation Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Validation Failed',
                text: error.message,
                confirmButtonColor: '#dc2626'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // --- 5. Computed Stats (Dashboard + Cycle Detail) ---
    const stats = useMemo(() => {
        // Stats for the employee list view (active cycle)
        const totalNet = employees.reduce((sum, e) => sum + (e.financials?.net || 0), 0);
        const totalPaid = employees.reduce((sum, e) => sum + (e.paidAmount || 0), 0);

        // YTD: Sum of all cycles' totalPaid (for dashboard overview)
        const ytdTotal = cycles.reduce((sum, c) => sum + (c.summary?.totalNet || 0), 0);

        return {
            totalNet,
            totalPaid,
            totalRemaining: totalNet - totalPaid,
            count: employees.length,
            // Dashboard-level stats
            ytdTotal,
            staffCount
        };
    }, [employees, cycles, staffCount]);

    // ✅ 1. เพิ่มฟังก์ชัน goBack ที่หายไป เพื่อแก้ไข Error ขาว
    const goBack = () => {
        setView('cycles');
        setActiveCycle(null);
        setEmployees([]);
    };

    return {
        view, cycles, activeCycle, employees, isLoading, stats,
        isNewCycleOpen, setIsNewCycleOpen,
        isPaymentOpen, setIsPaymentOpen,
        activeEmp, setActiveEmp,

        // Actions
        loadCycles, handleCreateCycle, handleSelectCycle, handleDeleteCycle,
        handleOpenEmp, handleUpdateEmp, handleSaveEmpSheet,
        handleLockCycle, handleConfirmPayment, handleRemovePayment,
        handleBatchPayment,
        handleRebuildCycle,  // ✅ เพิ่มกลับเข้ามา
        handleValidateCycle, // ✅ เพิ่มกลับเข้ามา
        goBack               // ✅ เพิ่มกลับเข้ามา
    };
};