import React from 'react';
import { createPortal } from 'react-dom';
import { SignOut, X, CheckCircle, Crosshair } from '@phosphor-icons/react';

export default function CloseShiftModal({
    isOpen,
    onClose,
    form,
    setForm,
    onSubmit,
    isSubmitting
}) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[65] flex items-end justify-center sm:items-center font-sans">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity" onClick={onClose}></div>
            <div className="bg-white w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] shadow-2xl relative z-10 flex flex-col p-6 animate-slide-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><SignOut weight="duotone" className="text-rose-500" /> Close Shift</h2>
                    <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 flex items-center justify-center"><X weight="bold" /></button>
                </div>
                <div className="space-y-4 mb-6">
                    <div><label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">Date</label><input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                    <div><label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">Actual Clock Out Time</label><input type="time" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800" value={form.outTime} onChange={(e) => setForm({ ...form, outTime: e.target.value })} /></div>
                    <div><label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">Reason</label><textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 h-20 resize-none" placeholder="ทำไมถึงลืมตอกบัตรออก?" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}></textarea></div>
                </div>
                <button onClick={onSubmit} disabled={isSubmitting} className="w-full bg-rose-500 text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-rose-500/20 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSubmitting ? <Crosshair className="animate-spin" /> : <CheckCircle weight="bold" />} Confirm Close Shift
                </button>
            </div>
        </div>, document.body
    );
}
