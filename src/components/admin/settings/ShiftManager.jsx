import React, { useState } from 'react';
import { Plus, PencilSimple, Trash, X } from '@phosphor-icons/react';
import { useDialog } from '../../../contexts/DialogContext';

export default function ShiftManager({ shifts = [], onChange }) {
    const dialog = useDialog();
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [shiftForm, setShiftForm] = useState({ id: null, name: '', startTime: '09:00', endTime: '18:00', color: 'blue', note: '' });

    // Tailwind Colors for Shifts
    const SHIFT_COLORS = [
        { id: 'blue', bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-600', ring: 'ring-blue-500' },
        { id: 'emerald', bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-600', ring: 'ring-emerald-500' },
        { id: 'orange', bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-600', ring: 'ring-orange-500' },
        { id: 'purple', bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-600', ring: 'ring-purple-500' },
        { id: 'rose', bg: 'bg-rose-500', border: 'border-rose-500', text: 'text-rose-600', ring: 'ring-rose-500' },
        { id: 'slate', bg: 'bg-slate-500', border: 'border-slate-500', text: 'text-slate-600', ring: 'ring-slate-500' },
    ];

    // Helper: Sorting
    const sortShifts = (items) => [...items].sort((a, b) => a.startTime.localeCompare(b.startTime));

    const openShiftModal = (shift = null) => {
        if (shift) {
            setShiftForm({ ...shift, color: shift.color || 'blue', note: shift.note || '' });
        } else {
            setShiftForm({ id: null, name: '', startTime: '09:00', endTime: '18:00', color: 'blue', note: '' });
        }
        setIsShiftModalOpen(true);
    };

    const handleSaveShift = () => {
        if (!shiftForm.name) return dialog.showAlert("กรุณาระบุชื่อกะงาน", "ข้อมูลไม่ครบ", "error");

        let updatedShifts;
        if (shiftForm.id) {
            // Edit
            updatedShifts = shifts.map(s => s.id === shiftForm.id ? shiftForm : s);
        } else {
            // Create
            const newShiftItem = { ...shiftForm, id: `shift_${Date.now()}` };
            updatedShifts = [...shifts, newShiftItem];
        }

        onChange(sortShifts(updatedShifts));
        setIsShiftModalOpen(false);
    };

    const handleDeleteShift = async (id) => {
        const isConfirmed = await dialog.showConfirm("คุณต้องการลบกะงานนี้ใช่หรือไม่?", "ยืนยันการลบ");
        if (isConfirmed) {
            const updatedShifts = shifts.filter(s => s.id !== id);
            onChange(updatedShifts);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">กะทำงาน (Shifts)</h3>
                <button onClick={() => openShiftModal()} className="text-[10px] font-bold text-white bg-indigo-600 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm active:scale-95 transition">
                    <Plus weight="bold" /> เพิ่มกะ
                </button>
            </div>

            <div className="modern-card overflow-hidden">
                {(!shifts || shifts.length === 0) && <div className="p-4 text-center text-xs text-slate-400">ยังไม่มีกะงาน</div>}
                {shifts.map((shift, index) => {
                    const colorObj = SHIFT_COLORS.find(c => c.id === (shift.color || 'blue')) || SHIFT_COLORS[0];
                    return (
                        <div key={index} className="p-4 border-b border-slate-50 last:border-0 flex justify-between items-center hover:bg-slate-50 transition group">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-10 rounded-full ${colorObj.bg}`}></div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-slate-800">{shift.name}</p>
                                        {shift.note && <span className="text-[9px] text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded-full truncate max-w-[100px]">{shift.note}</span>}
                                    </div>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5 bg-slate-100 px-2 py-0.5 rounded inline-block">{shift.startTime} - {shift.endTime} น.</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => openShiftModal(shift)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition">
                                    <PencilSimple weight="bold" />
                                </button>
                                <button onClick={() => handleDeleteShift(shift.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition">
                                    <Trash weight="fill" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MODAL */}
            {isShiftModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsShiftModalOpen(false)}></div>
                    <div className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl relative z-10 animate-zoom-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">{shiftForm.id ? 'แก้ไขกะงาน' : 'เพิ่มกะงานใหม่'}</h3>
                            <button onClick={() => setIsShiftModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800">
                                <X weight="bold" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 mb-1 block">ชื่อย่อ (สูงสุด 4 ตัว)</label>
                                <input type="text" maxLength={4} placeholder="เช่น D08" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none uppercase"
                                    value={shiftForm.name} onChange={e => setShiftForm({ ...shiftForm, name: e.target.value.toUpperCase() })}
                                />
                            </div>

                            {/* Color Picker */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 mb-2 block">สีสัญลักษณ์</label>
                                <div className="flex justify-between gap-1">
                                    {SHIFT_COLORS.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => setShiftForm({ ...shiftForm, color: c.id })}
                                            className={`w-8 h-8 rounded-full ${c.bg} transition-all duration-200 flex items-center justify-center ${shiftForm.color === c.id ? `ring-2 ring-offset-2 ${c.ring} scale-110` : 'opacity-40 hover:opacity-100 hover:scale-105'}`}
                                        >
                                            {shiftForm.color === c.id && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-slate-400 mb-1 block">เวลาเข้า</label>
                                    <input type="time" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm font-bold outline-none"
                                        value={shiftForm.startTime} onChange={e => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-slate-400 mb-1 block">เวลาออก</label>
                                    <input type="time" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm font-bold outline-none"
                                        value={shiftForm.endTime} onChange={e => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 mb-1 block">หมายเหตุ (Optional)</label>
                                <textarea rows="2" placeholder="เช่น กะเช้าปกติ" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none"
                                    value={shiftForm.note} onChange={e => setShiftForm({ ...shiftForm, note: e.target.value })}
                                />
                            </div>

                            <button onClick={handleSaveShift} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg mt-2 hover:bg-indigo-700 active:scale-95 transition">
                                บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
