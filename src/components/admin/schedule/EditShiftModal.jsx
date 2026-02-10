import React from 'react';
import {
    X, Briefcase, AirplaneTilt, Moon, ArrowDown, Coins, Gift
} from '@phosphor-icons/react';

export default function EditShiftModal({
    isOpen, editingShift, setEditingShift, saveShiftEdit,
    setIsEditModalOpen, companyShifts, otTypes, handlePresetChange, loading
}) {
    if (!isOpen || !editingShift) return null;

    /* Logic for handlePresetChange can be passed from parent or defined here if simple,
       But since it modifies editingShift, we can keep it here or pass a handler.
       To keep it simple, we'll re-implement or pass the logic.  
       The hook provided handlePresetChange logic inside setEditingShift wrapper? 
       Actually, the hook exposes setEditingShift. We might need to implement handlePresetChange inside the component 
       OR pass it from the hook.
       
       Let's implement a local handlePresetChange that calls setEditingShift.
    */

    const onPresetChange = (e) => {
        const shiftId = e.target.value;
        const preset = companyShifts.find(s => s.id === shiftId);
        if (preset) {
            setEditingShift(prev => ({
                ...prev,
                selectedPreset: shiftId,
                startTime: preset.startTime,
                endTime: preset.endTime
            }));
        }
    };


    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:px-4 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}></div>
            <div className="bg-white w-full max-w-sm sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl relative z-10 animate-zoom-in">
                <div className="flex justify-between items-center mb-6"><div><h3 className="text-lg font-bold text-slate-800">แก้ไขตารางงาน</h3><p className="text-xs text-slate-500">สำหรับ: {editingShift.name}</p></div><button onClick={() => setIsEditModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800"><X weight="bold" /></button></div>

                <div className="bg-slate-100 p-1 rounded-xl flex mb-6">
                    <button onClick={() => setEditingShift({ ...editingShift, type: 'work' })} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${editingShift.type === 'work' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><Briefcase weight="fill" /> ทำงาน</button>
                    <button onClick={() => setEditingShift({ ...editingShift, type: 'leave', hasOT: false, incentive: 0 })} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${editingShift.type === 'leave' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}><AirplaneTilt weight="fill" /> ลา</button>
                    <button onClick={() => setEditingShift({ ...editingShift, type: 'off', hasOT: false, incentive: 0 })} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${editingShift.type === 'off' ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-400'}`}><Moon weight="fill" /> หยุด</button>
                </div>

                {editingShift.type === 'work' && (
                    <div className="space-y-4 animate-fade-in">

                        {/* 1. SHIFT PRESET SELECTOR */}
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">เลือกกะงาน (Shift Preset)</label>
                            <div className="relative">
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 outline-none appearance-none focus:border-blue-500"
                                    onChange={onPresetChange}
                                    value={editingShift.selectedPreset || ''}
                                >
                                    <option value="">-- กำหนดเอง (Manual) --</option>
                                    {companyShifts.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-3 text-slate-400 pointer-events-none"><ArrowDown size={14} weight="bold" /></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-[10px] font-bold text-slate-400 mb-1">เวลาเข้า</label><input type="time" value={editingShift.startTime} onChange={(e) => setEditingShift({ ...editingShift, startTime: e.target.value, selectedPreset: '' })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500" /></div>
                            <div><label className="block text-[10px] font-bold text-slate-400 mb-1">เวลาออก</label><input type="time" value={editingShift.endTime} onChange={(e) => setEditingShift({ ...editingShift, endTime: e.target.value, selectedPreset: '' })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500" /></div>
                        </div>

                        {/* OT Section */}
                        <div className="pt-4 border-t border-slate-100">
                            <div className="flex justify-between items-center mb-3"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Coins weight="fill" className={editingShift.hasOT ? "text-emerald-500" : "text-slate-300"} /> เพิ่ม OT</label><div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in"><input type="checkbox" checked={editingShift.hasOT} onChange={(e) => setEditingShift({ ...editingShift, hasOT: e.target.checked })} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-300 checked:border-emerald-500" /><label onClick={() => setEditingShift({ ...editingShift, hasOT: !editingShift.hasOT })} className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${editingShift.hasOT ? 'bg-emerald-500' : 'bg-slate-300'}`}></label></div></div>
                            {editingShift.hasOT && (
                                <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100 space-y-3 animate-fade-in">
                                    <div>
                                        <label className="block text-[10px] font-bold text-emerald-600 mb-1">ประเภท OT</label>
                                        <select value={editingShift.otType} onChange={(e) => setEditingShift({ ...editingShift, otType: e.target.value })} className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none">
                                            {otTypes.length > 0 ? otTypes.map(ot => (<option key={ot.id} value={ot.id}>{ot.name} (x{ot.rate})</option>)) : <option value="">ไม่พบการตั้งค่า OT</option>}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-emerald-600 mb-1">จำนวนชั่วโมง</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number" step="0.1" min="0"
                                                value={editingShift.otHours}
                                                onChange={(e) => setEditingShift({ ...editingShift, otHours: e.target.value })}
                                                className="w-20 bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 outline-none text-center"
                                            />
                                            <span className="text-xs text-emerald-600 font-bold">ชม.</span>
                                            <span className="text-[10px] text-slate-400 ml-1">
                                                ({(Number(editingShift.otHours) * 60).toFixed(0)} นาที)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-slate-100 animate-fade-in">
                            <div className="flex justify-between items-center mb-2"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Gift weight="fill" className="text-yellow-500" /> เงินพิเศษ (Incentive)</label></div>
                            <div className="flex items-center gap-2"><div className="relative flex-1"><input type="number" min="0" placeholder="0" value={editingShift.incentive} onChange={(e) => setEditingShift({ ...editingShift, incentive: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-yellow-400" /><span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">THB</span></div></div>
                        </div>
                    </div>
                )}
                <button onClick={saveShiftEdit} disabled={loading} className="w-full mt-6 bg-slate-900 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition active:scale-95 disabled:opacity-50">บันทึก</button>
            </div>
        </div>
    );
}
