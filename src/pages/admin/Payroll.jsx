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
    const { state, actions } = usePayrollSystem();

    return (
        <PayrollLayout>

            {/* View Switcher */}
            {state.view === 'cycles' && (
                <div className="relative">
                    <button
                        onClick={() => {
                            if (confirm("Cleanup duplicates?")) {
                                import('../../features/people/services/cleanup.service').then(({ UserCleanupService }) => {
                                    UserCleanupService.cleanupDuplicates(state.cycles[0]?.companyId || 'comp_1704954200820').then(res => alert(`Fixed ${res.count} items`));
                                });
                            }
                        }}
                        className="absolute top-0 right-0 z-50 text-[10px] text-gray-300 hover:text-red-500 underline"
                        style={{ marginTop: '-20px' }}
                    >
                        Fix DB
                    </button>
                    <CycleList
                        cycles={state.cycles}
                        totals={state.totals}
                        onCreateCycle={() => actions.setIsNewCycleOpen(true)}
                        onSelectCycle={actions.handleSelectCycle}
                        isLoading={state.isLoading}
                    />
                </div>
            )}

            {state.view === 'list' && (
                <EmployeeList
                    activeCycle={state.activeCycle}
                    employees={state.employees}
                    totals={state.totals}
                    onBack={() => actions.setView('cycles')}
                    onSelectEmployee={actions.setActiveEmp}
                    onDeleteCycle={actions.handleDeleteCycle}
                    isLoading={state.isLoading}
                />
            )}

            {/* Modals & Sheets */}
            <NewCycleModal
                isOpen={state.isNewCycleOpen}
                onClose={() => actions.setIsNewCycleOpen(false)}
                onCreate={actions.handleCreateCycle}
            />

            <EmployeeDetailSheet
                emp={state.activeEmp}
                isOpen={!!state.activeEmp}
                onClose={() => actions.setActiveEmp(null)}
                onSave={actions.handleSaveEmp}
                onPay={() => actions.setIsPaymentOpen(true)}
                onRemovePayment={actions.handleRemovePayment}
            />

            <PaymentModal
                isOpen={state.isPaymentOpen}
                remaining={(state.activeEmp?.financials?.net || 0) - (state.activeEmp?.paidAmount || 0)}
                onClose={() => actions.setIsPaymentOpen(false)}
                onConfirm={actions.handleConfirmPayment}
            />

        </PayrollLayout>
    );
}