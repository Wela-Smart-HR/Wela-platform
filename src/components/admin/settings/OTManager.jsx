import React, { useState } from 'react';
import { Plus, PencilSimple, Trash, X, Coins } from '@phosphor-icons/react';
import { useDialog } from '../../../contexts/DialogContext';

export default function OTManager({ otTypes = [], onChange }) {
    const dialog = useDialog();
    const [isOTModalOpen, setIsOTModalOpen] = useState(false);
    const [otForm, setOtForm] = useState({ id: null, name: '', rate: 1.5, enabled: true });

    // Helper: Sorting
    const sortOTs = (items) => [...items].sort((a, b) => a.rate - b.rate);

    const openOTModal = (ot = null) => {
        if (ot) {
            setOtForm({ ...ot });
        } else {
            setOtForm({ id: null, name: '', rate: 1.5, enabled: true });
        }
        setIsOTModalOpen(true);
    };

    const handleSaveOT = () => {
        if (!otForm.name || !otForm.rate) return dialog.showAlert("กรุณากรอกข้อมูลให้ครบถ้วน", "ข้อมูลไม่ครบ", "error");

        let updatedOTs;
        if (otForm.id) {
            updatedOTs = otTypes.map(ot => ot.id === otForm.id ? otForm : ot);
        } else {
            const newOTItem = { ...otForm, id: `ot_${Date.now()}` };
            updatedOTs = [...otTypes, newOTItem];
        }

        onChange(sortOTs(updatedOTs));
        setIsOTModalOpen(false);
    };

    const handleDeleteOT = async (id) => {
        const isConfirmed = await dialog.showConfirm("คุณต้องการลบประเภท OT นี้ใช่หรือไม่?", "ยืนยันการลบ");
        if (isConfirmed) {
            const updatedOTs = otTypes.filter(ot => ot.id !== id);
            onChange(updatedOTs);
        }
    };

    const toggleOT = (index) => {
        const newOTs = [...otTypes];
        newOTs[index].enabled = !newOTs[index].enabled;
        onChange(newOTs);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">ประเภท OT</h3>
                <button onClick={() => openOTModal()} className="text-[10px] font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm active:scale-95 transition">
                    <Plus weight="bold" /> เพิ่ม OT
                </button>
            </div>
            <div className="modern-card overflow-hidden">
                {(!otTypes || otTypes.length === 0) && <div className="p-4 text-center text-xs text-slate-400">ยังไม่มีประเภท OT</div>}
                {otTypes.map((ot, index) => (
                    <div key={index} className="p-4 border-b border-slate-50 last:border-0 flex justify-between items-center hover:bg-slate-50 transition">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Coins weight="fill" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">{ot.name}</p>
                                <p className="text-[10px] text-slate-500">ตัวคูณ: x{ot.rate}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                                <input type="checkbox" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-300 checked:border-emerald-500"
                                    checked={ot.enabled}
                                    onChange={() => toggleOT(index)}
                                />
                                <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${ot.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}></label>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => openOTModal(ot)} className="text-slate-300 hover:text-blue-500 p-1">
                                    <PencilSimple weight="bold" size={16} />
                                </button>
                                <button onClick={() => handleDeleteOT(ot.id)} className="text-slate-300 hover:text-rose-500 p-1">
                                    <Trash weight="bold" size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL */}
            {isOTModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsOTModalOpen(false)}></div>
                    <div className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl relative z-10 animate-zoom-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">{otForm.id ? 'แก้ไขประเภท OT' : 'เพิ่มประเภท OT'}</h3>
                            <button onClick={() => setIsOTModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800">
                                <X weight="bold" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 mb-1 block">ชื่อ OT</label>
                                <input type="text" placeholder="เช่น OT พิเศษ" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none"
                                    value={otForm.name} onChange={e => setOtForm({ ...otForm, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 mb-1 block">อัตราคูณ (Rate)</label>
                                <input type="number" step="0.1" placeholder="1.5" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none text-center"
                                    value={otForm.rate} onChange={e => setOtForm({ ...otForm, rate: Number(e.target.value) })}
                                />
                            </div>
                            <button onClick={handleSaveOT} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg mt-2 hover:bg-emerald-700 active:scale-95 transition">
                                บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
