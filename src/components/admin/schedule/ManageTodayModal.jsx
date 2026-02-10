import React from 'react';
import {
    X, Gift, Coins, Storefront
} from '@phosphor-icons/react';

// --- Safe Internal Helpers to Prevent Import Crashes ---
const calculateOTMinutes = (hours) => {
    const h = Number(hours) || 0;
    return (h * 60).toFixed(0);
};

const calculateHourlyRate = (salary, dailyWage) => {
    if (dailyWage > 0) return dailyWage / 8;
    if (salary > 0) return (salary / 30) / 8;
    return 62.5; // Fallback
};

const calculateOTCost = (hourlyRate, otRate, otHours) => {
    const hours = Number(otHours) || 0;
    return hourlyRate * (Number(otRate) || 1.5) * hours;
};

const formatMoney = (amount) => {
    return (Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

export default function ManageTodayModal({
    isOpen, currentDate, setIsManageTodayOpen,
    manageTodayTab, setManageTodayTab,
    bulkForm, setBulkForm,
    executeBulkAction, otTypes,
    workingStaff
}) {
    if (!isOpen) return null;

    // Safe Data Handling
    const safeWorkingStaff = Array.isArray(workingStaff) ? workingStaff : [];
    const safeOtTypes = Array.isArray(otTypes) ? otTypes : [];

    // Calculate Estimated Cost
    const totalEstimatedCost = safeWorkingStaff.reduce((total, staff) => {
        if (!staff) return total; // Skip invalid staff
        const hourlyRate = calculateHourlyRate(staff.salary, staff.dailyWage);
        const selectedOT = safeOtTypes.find(t => t.id === bulkForm.otType);
        const otRate = selectedOT?.rate || 1.5;
        return total + calculateOTCost(hourlyRate, otRate, bulkForm.otHours);
    }, 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:px-4 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsManageTodayOpen(false)}></div>
            <div className="bg-white w-full max-w-sm sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl relative z-10 animate-zoom-in">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">แก้ไขวันนี้</h3>
                        <p className="text-xs text-slate-500">วันที่: {currentDate.toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => setIsManageTodayOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800">
                        <X weight="bold" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="bg-slate-100 p-1 rounded-xl flex mb-6">
                    <button onClick={() => setManageTodayTab('bonus')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${manageTodayTab === 'bonus' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Incentive / OT</button>
                    <button onClick={() => setManageTodayTab('close')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${manageTodayTab === 'close' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>ปิดร้าน</button>
                </div>

                {/* Content */}
                {/* Content */}
                {manageTodayTab === 'bonus' ? (
                    <div className="space-y-4 animate-fade-in">
                        {/* Incentive Input */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-yellow-50 to-transparent -mr-4 -mt-4 rounded-full opacity-50 pointer-events-none group-hover:scale-110 transition-transform"></div>
                            <label className="text-xs font-bold text-slate-700 mb-2 block flex items-center justify-between">
                                <span>เบี้ยขยัน / เงินพิเศษ</span>
                                <span className="text-[10px] text-slate-400 font-normal">Incentive</span>
                            </label>
                            <div className="relative z-10">
                                <input
                                    type="number"
                                    placeholder="เช่น 200"
                                    value={bulkForm.incentive}
                                    onChange={e => setBulkForm({ ...bulkForm, incentive: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm font-bold text-slate-800 outline-none focus:border-yellow-400 focus:bg-white transition-all"
                                />
                                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">THB</span>
                            </div>
                        </div>

                        {/* OT Input */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-emerald-50 to-transparent -mr-4 -mt-4 rounded-full opacity-50 pointer-events-none group-hover:scale-110 transition-transform"></div>
                            <label className="text-xs font-bold text-slate-700 mb-2 block flex items-center justify-between">
                                <span>ค่าล่วงเวลา (OT)</span>
                                <span className="text-[10px] text-slate-400 font-normal">Overtime</span>
                            </label>
                            <div className="relative z-10">
                                <select
                                    value={bulkForm.otType}
                                    onChange={e => setBulkForm({ ...bulkForm, otType: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none mb-3 focus:border-emerald-500 focus:bg-white transition-all appearance-none"
                                >
                                    <option value="">-- ไม่มีการทำโอที --</option>
                                    {safeOtTypes.map(ot => (
                                        <option key={ot.id} value={ot.id}>{ot.name} (x{ot.rate})</option>
                                    ))}
                                </select>

                                {bulkForm.otType && (
                                    <div className="animate-fade-in bg-slate-50 rounded-lg p-3 border border-slate-100">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={bulkForm.otHours}
                                                    onChange={e => setBulkForm({ ...bulkForm, otHours: e.target.value })}
                                                    className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-800 outline-none text-center focus:border-emerald-500 transition-colors"
                                                />
                                                <span className="text-xs text-slate-500 font-bold">ชม.</span>
                                            </div>

                                            <div className="text-right flex flex-col justify-center">
                                                <span className="text-[10px] text-slate-400">
                                                    คิดเป็น {calculateOTMinutes(bulkForm.otHours)} นาที
                                                </span>
                                                {safeWorkingStaff.length > 0 && (
                                                    <span className="text-xs font-bold text-emerald-600">
                                                        ≈ {formatMoney(totalEstimatedCost)} บาท
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {safeWorkingStaff.length > 0 && (
                                            <p className="text-[9px] text-slate-400 text-right mt-1 opacity-70">
                                                *คำนวณจากพนักงาน {safeWorkingStaff.length} คน
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button onClick={executeBulkAction} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition active:scale-95 flex items-center justify-center gap-2">
                            <span>บันทึกการเปลี่ยนแปลง</span>
                        </button>
                    </div>
                ) : (
                    <div className="text-center py-4 animate-fade-in">
                        <Storefront size={48} className="text-rose-200 mx-auto mb-3" weight="duotone" />
                        <h4 className="font-bold text-rose-600">ต้องการปิดร้านวันนี้?</h4>
                        <p className="text-xs text-slate-500 mb-6">พนักงานทุกคนจะถูกเปลี่ยนสถานะเป็น "วันหยุด (Holiday)" และล้างค่า OT ทั้งหมด</p>
                        <button onClick={executeBulkAction} className="w-full bg-rose-500 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-rose-600 transition active:scale-95">
                            ยืนยันปิดร้าน
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
