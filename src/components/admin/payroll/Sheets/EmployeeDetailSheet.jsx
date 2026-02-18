import React, { useState } from 'react';
import { Calculator, ListDashes } from '@phosphor-icons/react';
import { PayrollTab } from './PayrollTab';
import { LogsTab } from './LogsTab';

export const EmployeeDetailSheet = ({
    emp,
    isOpen,
    onClose,
    onSave, // Function to save edits
    onUpdate, // Function for real-time updates
    onPay,  // Function to open payment modal
    onRemovePayment
}) => {
    const [tab, setTab] = useState('payroll');

    if (!isOpen || !emp) return null;

    const fmt = n => (n || 0).toLocaleString();
    const remaining = (emp.financials?.net || 0) - (emp.paidAmount || 0);

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4 animate-fade-in">
            <div className="absolute inset-0" onClick={onClose}></div>

            <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-6 pb-10 shadow-2xl relative h-[90vh] flex flex-col animate-slide-up">
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6 shrink-0"></div>

                {/* Header */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center gap-4 mb-4 shrink-0">
                        <img
                            src={emp.employeeSnapshot?.avatar || `https://ui-avatars.com/api/?name=${emp.employeeSnapshot?.name}`}
                            className="w-16 h-16 rounded-full border-4 border-gray-50 shadow-sm object-cover"
                        />
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{emp.employeeSnapshot?.name}</h2>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                <span>{emp.employeeSnapshot?.role}</span> • <span>{emp.employeeSnapshot?.department}</span>
                            </p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold mt-1 inline-block">
                                {emp.employeeSnapshot?.type === 'monthly' ? 'รายเดือน' : 'รายวัน'}
                            </span>
                        </div>
                        <div className="ml-auto text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">REMAINING</p>
                            <p className={`text-2xl font-bold ${remaining > 0 ? 'text-blue-600' : 'text-green-500'}`}>
                                ฿{fmt(remaining)}
                            </p>
                        </div>
                    </div>

                    {/* Tab Switcher */}
                    <div className="bg-gray-100 p-1 rounded-xl flex mb-6 shrink-0">
                        <button
                            onClick={() => setTab('payroll')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${tab === 'payroll' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Calculator weight="bold" /> รายละเอียด (Payroll)
                        </button>
                        <button
                            onClick={() => setTab('logs')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${tab === 'logs' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <ListDashes weight="bold" /> บันทึกรายวัน (Logs)
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto no-scrollbar px-1 pb-10">
                        {tab === 'payroll' ? (
                            <PayrollTab
                                emp={emp}
                                onSave={onSave}
                                onUpdate={onUpdate}
                                onPay={onPay}
                                onRemovePayment={onRemovePayment}
                            />
                        ) : (
                            <LogsTab logs={emp.logsSnapshot || []} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
