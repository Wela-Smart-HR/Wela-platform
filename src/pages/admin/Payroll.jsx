import React from 'react';
import { usePayrollSystem } from '../../features/payroll/hooks/usePayrollSystem';
import { PayrollLayout } from '../../components/admin/payroll/PayrollLayout';
import { CycleList } from '../../components/admin/payroll/CycleList';
import { EmployeeList } from '../../components/admin/payroll/EmployeeList';
import { NewCycleModal } from '../../components/admin/payroll/Modals/NewCycleModal';
import { PaymentModal } from '../../components/admin/payroll/Modals/PaymentModal';
import { EmployeeDetailSheet } from '../../components/admin/payroll/Sheets/EmployeeDetailSheet';

// Main Page Entry Point
export default function Payroll() {
    const {
        view, cycles, activeCycle, employees, isLoading, stats,
        isNewCycleOpen, setIsNewCycleOpen,
        isPaymentOpen, setIsPaymentOpen,
        activeEmp, setActiveEmp,

        // Actions
        loadCycles, handleCreateCycle, handleSelectCycle, handleDeleteCycle,
        handleOpenEmp, handleUpdateEmp, handleSaveEmpSheet,
        handleLockCycle, handleConfirmPayment, handleRemovePayment,
        handleBatchPayment,
        goBack
    } = usePayrollSystem();

    return (
        <PayrollLayout>

            {/* View Switcher */}
            {view === 'cycles' && (
                <div className="relative">

                    <CycleList
                        cycles={cycles}
                        totals={stats} // stats: { totalNet, totalPaid, count }
                        onCreateCycle={() => setIsNewCycleOpen(true)}
                        onSelectCycle={handleSelectCycle}
                        isLoading={isLoading}
                    />
                </div>
            )}

            {view === 'list' && (
                <EmployeeList
                    activeCycle={activeCycle}
                    employees={employees}
                    totals={stats}
                    onBack={goBack}
                    onSelectEmployee={handleOpenEmp}
                    onDeleteCycle={handleDeleteCycle}
                    onLockCycle={handleLockCycle}
                    onBatchPayment={handleBatchPayment} // Added onBatchPayment
                    isLoading={isLoading}
                />
            )}

            {/* Modals & Sheets */}
            <NewCycleModal
                isOpen={isNewCycleOpen}
                onClose={() => setIsNewCycleOpen(false)}
                onCreate={handleCreateCycle}
            />

            <EmployeeDetailSheet
                emp={activeEmp}
                activeCycle={activeCycle}
                isOpen={!!activeEmp}
                onClose={() => setActiveEmp(null)}
                // Use handleUpdateEmp for field changes (Real-time Calc)
                onUpdate={handleUpdateEmp}
                onSave={handleSaveEmpSheet}
                onPay={() => setIsPaymentOpen(true)}
                onRemovePayment={handleRemovePayment}
            />

            <PaymentModal
                isOpen={isPaymentOpen}
                remaining={(activeEmp?.financials?.net || 0) - (activeEmp?.paidAmount || 0)}
                onClose={() => setIsPaymentOpen(false)}
                onConfirm={handleConfirmPayment}
            />

        </PayrollLayout>
    );
}