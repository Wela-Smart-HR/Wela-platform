import React from 'react';
import { createPortal } from 'react-dom';
import { Briefcase, X, WarningCircle, CheckCircle, Crosshair } from '@phosphor-icons/react';

export default function UnscheduledWorkModal({
    isOpen,
    onClose,
    form,
    setForm,
    onSubmit,
    isSubmitting
}) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center font-sans">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl relative z-10 flex flex-col max-h-[90vh] animate-slide-up overflow-hidden">
                <div className="px-6 pt-6 pb-4 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Briefcase weight="duotone" className="text-amber-500" /> ขอรับรองวันทำงาน</h2>
                    <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 flex items-center justify-center"><X weight="bold" /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
                        <WarningCircle weight="fill" size={20} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 leading-relaxed">คุณไม่มีกะงานสำหรับวันนี้ กรุณากรอกเวลาที่ทำงานจริง แล้วส่งคำขอให้ Admin อนุมัติ</p>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">วันที่ <span className="text-red-400">*</span></label>
                        <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-100" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">เวลาเข้างาน <span className="text-red-400">*</span></label>
                            <input type="time" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-100" value={form.timeIn} onChange={(e) => setForm({ ...form, timeIn: e.target.value })} />
                        </div>
                        <div className="flex-1">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">เวลาออกงาน <span className="text-red-400">*</span></label>
                            <input type="time" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-100" value={form.timeOut} onChange={(e) => setForm({ ...form, timeOut: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">เหตุผล</label>
                        <textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-800 outline-none resize-none h-24 focus:ring-2 focus:ring-amber-100" placeholder="เช่น มาทำงานด่วน" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}></textarea>
                    </div>
                    <div className="pt-4 pb-4">
                        <button onClick={onSubmit} disabled={isSubmitting} className="w-full bg-amber-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2">
                            {isSubmitting ? <Crosshair className="animate-spin" size={18} /> : <CheckCircle weight="bold" size={18} />} ส่งคำขออนุมัติ
                        </button>
                    </div>
                </div>
            </div>
        </div>, document.body
    );
}
