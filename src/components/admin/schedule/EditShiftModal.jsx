import React from 'react';
import {
    X, ArrowDown
} from '@phosphor-icons/react';

// Inline helpers for safety and consistency (Standardization)
const calculateOTMinutes = (hours) => {
    const h = Number(hours) || 0;
    return (h * 60).toFixed(0);
};

// ✅ ARCHITECTURE FIX: ป้องกันบั๊กคำนวณจาก String
const calculateHourlyRate = (salary, dailyWage) => {
    const numDaily = Number(dailyWage) || 0;
    const numSalary = Number(salary) || 0;
    
    if (numDaily > 0) return numDaily / 8;
    if (numSalary > 0) return (numSalary / 30) / 8;
    return 62.5; // Fallback
};

const calculateOTCost = (hourlyRate, otRate, otHours) => {
    const hours = Number(otHours) || 0;
    return hourlyRate * (Number(otRate) || 1.5) * hours;
};

// Safe formatting
const formatMoney = (amount) => {
    return (Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};


export default function EditShiftModal({
    isOpen, editingShift, setEditingShift, saveShiftEdit,
    setIsEditModalOpen, companyShifts, otTypes, loading,
    activeEmployees
}) {
    if (!isOpen || !editingShift) return null;

    // ✅ ARCHITECTURE FIX: ดักจับทั้ง userId และ employeeId
    const targetId = editingShift.userId || editingShift.employeeId;
    
    // ลองหาด้วย id ก่อน ถ้าไม่เจอให้ลองหาด้วย name
    let employee = (activeEmployees || []).find(e => e.id === targetId || e.userId === targetId);
    
    if (!employee && editingShift.employeeName) {
        employee = (activeEmployees || []).find(e => 
            e.name?.trim().toLowerCase() === editingShift.employeeName?.trim().toLowerCase()
        );
    }
    
    const hourlyRate = calculateHourlyRate(employee.salary, employee.dailyWage);

    const onPresetChange = (e) => {
        const shiftId = e.target.value;
        const preset = companyShifts.find(s => s.id === shiftId);
        if (preset) {
            setEditingShift(prev => ({
                ...prev,
                selectedPreset: shiftId,
                startTime: preset.startTime,
                endTime: preset.endTime,
                shiftCode: preset.name,
                color: preset.color,
                note: preset.note
            }));
        }
    };

    // Calculate current Cost
    const currentOTCost = editingShift.hasOT ? calculateOTCost(
        hourlyRate,
        (otTypes || []).find(t => t.id === editingShift.otType)?.rate,
        editingShift.otHours
    ) : 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:px-4 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}></div>
            <div className="bg-white w-full max-w-sm sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl relative z-10 animate-zoom-in">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">แก้ไขตารางงาน</h3>
                        <p className="text-xs text-slate-500">พนักงาน: {editingShift.name}</p>
                    </div>
                    <button onClick={() => setIsEditModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors">
                        <X weight="bold" />
                    </button>
                </div>

                {/* Type Selector (Segmented Control) */}
                <div className="bg-slate-100 p-1 rounded-xl flex mb-6">
                    <button onClick={() => setEditingShift({ ...editingShift, type: 'work' })} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${editingShift.type === 'work' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>ทำงาน</button>
                    <button onClick={() => setEditingShift({ ...editingShift, type: 'leave', hasOT: false, incentive: 0 })} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${editingShift.type === 'leave' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>ลางาน</button>
                    <button onClick={() => setEditingShift({ ...editingShift, type: 'off', hasOT: false, incentive: 0 })} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${editingShift.type === 'off' ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>หยุด</button>
                </div>

                {editingShift.type === 'work' && (
                    <div className="space-y-4 animate-fade-in">

                        {/* Shift Preset & Times */}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">กะงาน (Shift Pattern)</label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 outline-none appearance-none focus:border-slate-400 transition-colors"
                                        onChange={onPresetChange}
                                        value={editingShift.selectedPreset || ''}
                                    >
                                        <option value="">-- กำหนดเอง (Manual) --</option>
                                        {(companyShifts || []).map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-3 text-slate-400 pointer-events-none"><ArrowDown size={14} weight="bold" /></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">เวลาเข้า</label>
                                    <input
                                        type="time"
                                        value={editingShift.startTime}
                                        onChange={(e) => setEditingShift({ ...editingShift, startTime: e.target.value, selectedPreset: '' })}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-slate-400 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">เวลาออก</label>
                                    <input
                                        type="time"
                                        value={editingShift.endTime}
                                        onChange={(e) => setEditingShift({ ...editingShift, endTime: e.target.value, selectedPreset: '' })}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-slate-400 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Incentive Input (Clean Card Style) */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-yellow-50 to-transparent -mr-4 -mt-4 rounded-full opacity-50 pointer-events-none group-hover:scale-110 transition-transform"></div>
                            <label className="text-xs font-bold text-slate-700 mb-2 block flex items-center justify-between">
                                <span>เบี้ยขยัน / เงินพิเศษ</span>
                                <span className="text-[10px] text-slate-400 font-normal">Incentive</span>
                            </label>
                            <div className="relative z-10">
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={editingShift.incentive}
                                    onChange={(e) => setEditingShift({ ...editingShift, incentive: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm font-bold text-slate-800 outline-none focus:border-yellow-400 focus:bg-white transition-all"
                                />
                                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">THB</span>
                            </div>
                        </div>

                        {/* OT Input (Clean Card Style) */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-emerald-50 to-transparent -mr-4 -mt-4 rounded-full opacity-50 pointer-events-none group-hover:scale-110 transition-transform"></div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-slate-700 block">ค่าล่วงเวลา (OT)</label>
                                <div className="relative inline-block w-8 align-middle select-none transition duration-200 ease-in">
                                    <input type="checkbox" checked={editingShift.hasOT} onChange={(e) => setEditingShift({ ...editingShift, hasOT: e.target.checked })} className="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-300 checked:border-emerald-500" />
                                    <label onClick={() => setEditingShift({ ...editingShift, hasOT: !editingShift.hasOT })} className={`toggle-label block overflow-hidden h-4 rounded-full cursor-pointer ${editingShift.hasOT ? 'bg-emerald-500' : 'bg-slate-300'}`}></label>
                                </div>
                            </div>

                            {editingShift.hasOT ? (
                                <div className="animate-fade-in relative z-10">
                                    <select
                                        value={editingShift.otType}
                                        onChange={(e) => setEditingShift({ ...editingShift, otType: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none mb-3 focus:border-emerald-500 focus:bg-white transition-all appearance-none"
                                    >
                                        {(otTypes || []).length > 0 ? (otTypes || []).map(ot => (<option key={ot.id} value={ot.id}>{ot.name} (x{ot.rate})</option>)) : <option value="">ไม่พบการตั้งค่า OT</option>}
                                    </select>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number" step="0.1" min="0"
                                            value={editingShift.otHours}
                                            onChange={(e) => setEditingShift({ ...editingShift, otHours: e.target.value })}
                                            className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-800 outline-none text-center focus:border-emerald-500 transition-colors"
                                        />
                                        <span className="text-xs text-slate-500 font-bold">ชม.</span>
                                        <div className="flex flex-col items-end ml-auto">
                                            <span className="text-[10px] text-slate-400">
                                                ({calculateOTMinutes(editingShift.otHours)} นาที)
                                            </span>
                                            {currentOTCost > 0 && (
                                                <span className="text-xs font-bold text-emerald-600">
                                                    ≈ {formatMoney(currentOTCost)} บาท
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[10px] text-slate-400">ปิดการใช้งาน OT ในกะนี้</p>
                            )}
                        </div>

                    </div>
                )}

                {editingShift.type !== 'work' && (
                    <div className="py-8 text-center text-slate-400 text-xs animate-fade-in">
                        {editingShift.type === 'leave' ? 'พนักงานลางาน (Leave)' : 'พนักงานหยุดงาน (Day Off)'}
                    </div>
                )}

                <button onClick={saveShiftEdit} disabled={loading} className="w-full mt-6 bg-slate-900 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                    <span>บันทึกข้อมูล</span>
                </button>
            </div>
        </div>
    );
}
