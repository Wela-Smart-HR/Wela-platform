import React from 'react';
import { createPortal } from 'react-dom';
import { Timer, X } from '@phosphor-icons/react';

export default function RetroRequestModal({
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
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Timer weight="duotone" className="text-blue-500" /> Request Adjustment</h2>
                    <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 flex items-center justify-center"><X weight="bold" /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
                    <div className="flex gap-4">
                        <div className="flex-1"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">Time In</label><input type="time" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" value={form.timeIn} onChange={(e) => setForm({ ...form, timeIn: e.target.value })} /></div>
                        <div className="flex-1"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">Time Out</label><input type="time" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" value={form.timeOut} onChange={(e) => setForm({ ...form, timeOut: e.target.value })} /></div>
                    </div>
                    <div><label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">Date</label><input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                    <div><label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">Reason</label><textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-800 outline-none resize-none h-24 focus:ring-2 focus:ring-blue-100" placeholder="Why are you adjusting?" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}></textarea></div>
                    <div className="pt-4 pb-4"><button onClick={onSubmit} disabled={isSubmitting} className="w-full bg-[#007AFF] text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-blue-500/20 active:scale-95 transition">Send Request</button></div>
                </div>
            </div>
        </div>, document.body
    );
}
