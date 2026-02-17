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
                <CycleList
                    cycles={state.cycles}
                    totals={state.totals}
                    onCreateCycle={() => actions.setIsNewCycleOpen(true)}
                    onSelectCycle={actions.handleSelectCycle}
                />
            )}

            {state.view === 'list' && (
                <EmployeeList
                    activeCycle={state.activeCycle}
                    employees={state.employees}
                    totals={state.totals}
                    onBack={() => actions.setView('cycles')}
                    onSelectEmployee={actions.setActiveEmp}
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