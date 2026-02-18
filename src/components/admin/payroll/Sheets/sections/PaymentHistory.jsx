import React from 'react';
import { ClockCounterClockwise, Trash, Plus, CheckCircle } from '@phosphor-icons/react';

export const PaymentHistory = ({ 
    emp, 
    currentNet, 
    onPay, 
    onRemovePayment 
}) => {
    
    const fmt = n => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const paidAmount = emp.paidAmount || 0;
    const remaining = currentNet - paidAmount;

    return (
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <ClockCounterClockwise className="text-orange-500" weight="fill" /> HISTORY
                </h3>
                <div className="text-[10px] font-bold text-gray-400">
                    Paid: ฿{fmt(paidAmount)}
                </div>
            </div>
             
             <div className="space-y-3 mb-4">
                {emp.payments?.length > 0 ? emp.payments.map((pay, idx) => (
                    <div key={pay.id || idx} className="bg-white p-3 rounded-xl flex justify-between items-center shadow-sm border border-gray-100">
                        <div>
                            <p className="text-sm font-bold text-gray-900">฿{fmt(pay.amount)}</p>
                            <p className="text-[10px] text-gray-500">{pay.note || 'จ่ายเพิ่ม'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-medium text-gray-400">
                                {new Date(pay.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                            </span>
                            <button onClick={() => onRemovePayment(idx)} className="text-gray-300 hover:text-red-500 transition">
                                <Trash weight="bold" />
                            </button>
                        </div>
                    </div>
                )) : (
                    <p className="text-center text-xs text-gray-400 py-2 italic">ไม่มีประวัติการจ่ายเงิน</p>
                )}
            </div>

            {remaining > 0 ? (
                <button
                    onClick={onPay}
                    className="w-full py-3 bg-black text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                    <Plus weight="bold" /> จ่ายยอดค้าง (฿{fmt(remaining)})
                </button>
            ) : (
                <div className="text-center py-2">
                    <span className="text-green-500 text-xs font-bold flex items-center justify-center gap-1">
                        <CheckCircle weight="fill" /> จ่ายครบแล้ว
                    </span>
                </div>
            )}
        </div>
    );
};
