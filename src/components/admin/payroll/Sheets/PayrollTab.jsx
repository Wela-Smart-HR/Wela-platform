import React, { useMemo } from 'react';
import { Wallet, ArrowCounterClockwise, FloppyDisk } from '@phosphor-icons/react';
import { usePayrollForm } from '../../../../features/payroll/hooks/usePayrollForm.jsx';
import { IncomeSection } from './sections/IncomeSection';
import { DeductionSection } from './sections/DeductionSection';
import { PaymentHistory } from './sections/PaymentHistory';

export const PayrollTab = ({ emp, onSave, onUpdate, onPay, onRemovePayment }) => {

    // 1. Use Hook for all Logic
    const {
        form, config, currentNet, totalStatutory,
        handleInputChange, handleConfigChange, handleProfileChange,
        addItem, removeItem, resetToProfile,
        customIncomeUpdate, customDeductUpdate
    } = usePayrollForm(emp, onUpdate);

    const fmt = n => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    return (
        <div className="space-y-6 animate-fade-in text-sm pb-24">

            {/* Sticky Net Total */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 rounded-2xl shadow-lg flex justify-between items-center relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-[10px] uppercase font-bold opacity-80">NET PAYABLE</p>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        ฿{fmt(currentNet)}
                    </h2>
                </div>
                <div className="flex items-center gap-2 relative z-10">
                    <button onClick={resetToProfile} className="text-white/50 hover:text-white transition" title="Restore Default Settings">
                        <ArrowCounterClockwise weight="bold" className="text-xl" />
                    </button>
                </div>
                <Wallet className="text-4xl opacity-20 absolute right-4 bottom-[-10px] rotate-12" weight="fill" />
            </div>

            {/* Income Section */}
            <IncomeSection
                form={form}
                handleInputChange={handleInputChange}
                addItem={addItem}
                removeItem={removeItem}
                customIncomeUpdate={customIncomeUpdate}
            />

            {/* Deduction Section */}
            <DeductionSection
                form={form}
                config={config}
                totalStatutory={totalStatutory}
                handleInputChange={handleInputChange}
                handleConfigChange={handleConfigChange}
                handleProfileChange={handleProfileChange}
                addItem={addItem}
                removeItem={removeItem}
                customDeductUpdate={customDeductUpdate}
            />

            {/* Payment History */}
            <PaymentHistory
                emp={emp}
                currentNet={currentNet}
                onPay={onPay}
                onRemovePayment={onRemovePayment}
            />

            {/* Sticky Save Button */}
            <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-6 pointer-events-none">
                <button
                    onClick={onSave}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-2xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2 pointer-events-auto"
                >
                    <FloppyDisk size={18} weight="bold" />
                    บันทึกการแก้ไข
                </button>
            </div>

        </div>
    );
};
