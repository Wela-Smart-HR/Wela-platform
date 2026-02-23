import React from 'react';
import { createPortal } from 'react-dom';
import { Briefcase, X, WarningCircle, CheckCircle, Crosshair } from '@phosphor-icons/react';

export default function ShiftSelectionModal({
    isOpen,
    onClose,
    masterShifts,
    selectedShiftId,
    setSelectedShiftId,
    onSubmit,
    isSubmitting
}) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center font-sans">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl relative z-10 flex flex-col max-h-[90vh] animate-slide-up overflow-hidden">
                <div className="px-6 pt-6 pb-4 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Briefcase weight="duotone" className="text-amber-500" /> เลือกกะการทำงาน
                    </h2>
                    <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 flex items-center justify-center"><X weight="bold" /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
                        <WarningCircle weight="fill" size={20} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 leading-relaxed">คุณกำลังจะเข้างานนอกตาราง กรุณาเลือกกะการทำงานที่ได้รับมอบหมาย เพื่อส่งให้ Admin อนุมัติ</p>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3 block">เลือกกะ <span className="text-red-400">*</span></label>
                        <div className="space-y-2">
                            {masterShifts.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-xs"><Briefcase size={32} className="mx-auto mb-2 opacity-50" /><p>ไม่พบข้อมูลกะงาน กรุณาติดต่อ Admin</p></div>
                            ) : (
                                masterShifts.map((shift) => (
                                    <button key={shift.id} onClick={() => setSelectedShiftId(shift.id)} className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selectedShiftId === shift.id ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-10 rounded-full bg-slate-500"></div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{shift.name}</p>
                                                    <p className="text-xs text-slate-500 font-mono mt-0.5">{shift.startTime} - {shift.endTime} น.</p>
                                                </div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 transition-all ${selectedShiftId === shift.id ? 'border-amber-500 bg-amber-500' : 'border-slate-300'}`}>
                                                {selectedShiftId === shift.id && <div className="w-full h-full rounded-full bg-white scale-50"></div>}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="pt-4 pb-4">
                        <button onClick={() => onSubmit(selectedShiftId)} disabled={isSubmitting || !selectedShiftId} className="w-full bg-amber-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2">
                            {isSubmitting ? <Crosshair className="animate-spin" size={18} /> : <CheckCircle weight="bold" size={18} />} ยืนยันเข้างาน
                        </button>
                    </div>
                </div>
            </div>
        </div>, document.body
    );
}
