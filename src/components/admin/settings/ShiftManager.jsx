import React, { useState } from 'react';
import { Plus, PencilSimple, Trash, X } from '@phosphor-icons/react';
import { useDialog } from '../../../contexts/DialogContext';

export default function ShiftManager({ shifts = [], onChange }) {
    const dialog = useDialog();
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [shiftForm, setShiftForm] = useState({ id: null, name: '', startTime: '09:00', endTime: '18:00' });

    // Helper: Sorting
    const sortShifts = (items) => [...items].sort((a, b) => a.startTime.localeCompare(b.startTime));

    const openShiftModal = (shift = null) => {
        if (shift) {
            setShiftForm({ ...shift });
        } else {
            setShiftForm({ id: null, name: '', startTime: '09:00', endTime: '18:00' });
        }
        setIsShiftModalOpen(true);
    };

    const handleSaveShift = () => {
        if (!shiftForm.name) return dialog.showAlert("กรุณาระบุชื่อกะงานให้ครบถ้วน", "ข้อมูลไม่ครบ", "error");

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
                {shifts.map((shift, index) => (
                    <div key={index} className="p-4 border-b border-slate-50 last:border-0 flex justify-between items-center hover:bg-slate-50 transition group">
                        <div>
                            <p className="text-sm font-bold text-slate-800">{shift.name}</p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5 bg-slate-100 px-2 py-0.5 rounded inline-block">{shift.startTime} - {shift.endTime} น.</p>
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
                ))}
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
                                <label className="text-[10px] font-bold text-slate-400 mb-1 block">ชื่อกะงาน</label>
                                <input type="text" placeholder="เช่น กะเช้า" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none"
                                    value={shiftForm.name} onChange={e => setShiftForm({ ...shiftForm, name: e.target.value })}
                                />
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
