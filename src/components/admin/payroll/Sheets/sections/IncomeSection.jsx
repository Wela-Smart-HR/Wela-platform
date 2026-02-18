import React from 'react';
import { PlusCircle, Plus, MinusCircle } from '@phosphor-icons/react';

export const IncomeSection = ({
    form,
    handleInputChange,
    addItem,
    removeItem,
    customIncomeUpdate
}) => {
    return (
        <div>
            <h3 className="text-xs font-bold text-gray-400 ml-1 mb-2 flex items-center gap-1">
                <PlusCircle className="text-green-500" weight="fill" /> รายได้ (INCOME)
            </h3>
            <div className="bg-white border border-gray-100 rounded-xl p-1 shadow-sm">

                {/* Salary */}
                <div className="flex justify-between items-center p-3 border-b border-gray-50 bg-blue-50/30">
                    <label className="text-sm font-bold text-gray-700">เงินเดือน</label>
                    <input
                        type="text"
                        value={form.salary}
                        onChange={e => handleInputChange('salary', e.target.value)}
                        className="text-right font-bold text-gray-900 w-32 outline-none bg-transparent"
                        placeholder="0"
                    />
                </div>

                {/* OT */}
                <div className="flex justify-between items-center p-3 border-b border-gray-50">
                    <label className="text-sm font-medium text-gray-600">OT</label>
                    <input
                        type="text"
                        value={form.ot}
                        onChange={e => handleInputChange('ot', e.target.value)}
                        className="text-right font-bold text-gray-900 w-32 outline-none bg-transparent"
                        placeholder="0"
                    />
                </div>

                {/* Incentive */}
                <div className="flex justify-between items-center p-3 border-b border-gray-50">
                    <label className="text-sm font-medium text-gray-600">Incentive</label>
                    <input
                        type="text"
                        value={form.incentive}
                        onChange={e => handleInputChange('incentive', e.target.value)}
                        className="text-right font-bold text-gray-900 w-32 outline-none bg-transparent"
                        placeholder="0"
                    />
                </div>

                {/* Custom Items */}
                {form.customIncomes.map((item, idx) => (
                    <div key={item.id} className="flex items-center p-3 border-b border-gray-50 gap-2">
                        <input
                            type="text"
                            value={item.label}
                            onChange={e => customIncomeUpdate(idx, 'label', e.target.value)}
                            placeholder="ชื่อรายการ"
                            className="flex-1 text-sm text-gray-600 outline-none bg-transparent border-b border-dashed"
                        />
                        <input
                            type="number"
                            value={item.amount}
                            onChange={e => customIncomeUpdate(idx, 'amount', e.target.value)}
                            className="text-right font-bold text-gray-900 w-24 outline-none bg-transparent"
                        />
                        <button onClick={() => removeItem('income', idx)} className="text-gray-300 hover:text-red-500">
                            <MinusCircle weight="bold" />
                        </button>
                    </div>
                ))}

                <button onClick={() => addItem('income')} className="w-full py-2 text-[10px] font-bold text-blue-600 flex items-center justify-center gap-1 hover:bg-blue-50 rounded-b-xl">
                    <Plus weight="bold" /> เพิ่มรายการ
                </button>
            </div>
        </div>
    );
};
