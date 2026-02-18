import React, { useState } from 'react';
import { MinusCircle, Plus, CaretUp, PencilSimple, IdentificationCard } from '@phosphor-icons/react';
import { DEDUCTION_PROFILES } from '../../../../../features/payroll/hooks/usePayrollForm.jsx';

export const DeductionSection = ({
    form,
    config,
    totalStatutory,
    handleInputChange,
    handleConfigChange,
    handleProfileChange,
    addItem,
    removeItem,
    customDeductUpdate
}) => {
    const [isTaxExpanded, setIsTaxExpanded] = useState(false);
    const fmt = n => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    return (
        <div>
            <h3 className="text-xs font-bold text-gray-400 ml-1 mb-2 flex items-center gap-1">
                <MinusCircle className="text-red-500" weight="fill" /> รายหัก (DEDUCTIONS)
            </h3>
            <div className="bg-white border border-gray-100 rounded-xl p-1 shadow-sm">

                {/* 🌟 Easy Mode: Tax & SSO Summary Row */}
                <div className={`p-3 border-b border-gray-50 transition-colors ${isTaxExpanded ? 'bg-slate-50' : 'bg-white'}`}>
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsTaxExpanded(!isTaxExpanded)}>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${totalStatutory > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                                <IdentificationCard weight="fill" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-700">ภาษีและประกันสังคม</p>
                                <p className="text-[10px] text-gray-400">
                                    {config.profileId === 'standard' ? 'พนักงานประจำ (SSO+PND1)' :
                                        config.profileId === 'contract' ? 'หัก 3%' :
                                            config.profileId === 'none' ? 'ไม่หักภาษี' : 'กำหนดเอง (Custom)'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`font-bold ${totalStatutory > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                                {totalStatutory > 0 ? `-${fmt(totalStatutory)}` : '฿0'}
                            </span>
                            {isTaxExpanded ? <CaretUp className="text-gray-400" /> : <PencilSimple className="text-gray-300 hover:text-blue-500" />}
                        </div>
                    </div>

                    {/* 🌟 Expanded: Advanced Settings */}
                    {isTaxExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-200 animate-fade-in-down">

                            {/* Profile Selector */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {DEDUCTION_PROFILES.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={(e) => { e.stopPropagation(); handleProfileChange(p.id); }}
                                        className={`text-[10px] py-2 px-1 rounded-lg border flex flex-col items-center gap-1 transition-all
                                            ${config.profileId === p.id
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <div className="text-lg">{p.icon}</div>
                                        <span className="text-center leading-tight">{p.label.split('(')[0]}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Granular Controls */}
                            <div className="space-y-2 pl-2 border-l-2 border-slate-200 ml-1">
                                {/* SSO */}
                                <div className="flex justify-between items-center">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={config.enableSSO}
                                            onChange={e => handleConfigChange('enableSSO', e.target.checked)}
                                            className="w-3 h-3 rounded text-blue-600"
                                        />
                                        <span className="text-xs text-gray-600">ประกันสังคม {config.enableSSO && <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded">5%</span>}</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.sso}
                                        onChange={e => handleInputChange('sso', e.target.value)}
                                        disabled={!config.enableSSO}
                                        className={`text-right text-xs font-bold w-20 outline-none bg-transparent ${config.enableSSO ? 'text-red-500' : 'text-gray-300'}`}
                                    />
                                </div>
                                {/* Tax */}
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-gray-600">ภาษี</span>
                                        <select
                                            value={config.taxMode}
                                            onChange={e => handleConfigChange('taxMode', e.target.value)}
                                            className="text-[10px] border-none bg-transparent font-bold text-blue-600 cursor-pointer p-0 focus:ring-0"
                                        >
                                            <option value="progressive">ภ.ง.ด.1</option>
                                            <option value="flat3">3%</option>
                                            <option value="none">ไม่หัก</option>
                                        </select>
                                    </div>
                                    <input
                                        type="text"
                                        value={form.tax}
                                        onChange={e => handleInputChange('tax', e.target.value)}
                                        disabled={config.taxMode === 'none'}
                                        className={`text-right text-xs font-bold w-20 outline-none bg-transparent ${config.taxMode !== 'none' ? 'text-red-500' : 'text-gray-300'}`}
                                    />
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* Late/Absent */}
                <div className="flex justify-between items-center p-3 border-b border-gray-50">
                    <label className="text-sm font-medium text-gray-600">สาย/ขาด</label>
                    <input
                        type="text"
                        value={form.deductions}
                        onChange={e => handleInputChange('deductions', e.target.value)}
                        className="text-right font-bold text-red-500 w-32 outline-none bg-transparent"
                        placeholder="0"
                    />
                </div>
                {form.customDeducts.map((item, idx) => (
                    <div key={item.id} className="flex items-center p-3 border-b border-gray-50 gap-2">
                        <input
                            type="text"
                            value={item.label}
                            onChange={e => customDeductUpdate(idx, 'label', e.target.value)}
                            placeholder="ชื่อรายการ"
                            className="flex-1 text-sm text-gray-600 outline-none bg-transparent border-b border-dashed"
                        />
                        <input
                            type="number"
                            value={item.amount}
                            onChange={e => customDeductUpdate(idx, 'amount', e.target.value)}
                            className="text-right font-bold text-red-500 w-24 outline-none bg-transparent"
                        />
                        <button onClick={() => removeItem('deduct', idx)} className="text-gray-300 hover:text-red-500">
                            <MinusCircle weight="bold" />
                        </button>
                    </div>
                ))}
                <button onClick={() => addItem('deduct')} className="w-full py-2 text-[10px] font-bold text-red-500 flex items-center justify-center gap-1 hover:bg-red-50 rounded-b-xl">
                    <Plus weight="bold" /> เพิ่มรายการ
                </button>
            </div>
        </div>
    );
};
