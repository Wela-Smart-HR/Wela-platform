import React, { createContext, useState, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from './AuthContext';
import { useDialog } from './DialogContext';
import { useMyRequests } from '../features/requests/useMyRequests';
import { X, AirplaneTilt, Timer } from '@phosphor-icons/react';

const RequestModalContext = createContext();

export function RequestModalProvider({ children }) {
    const { currentUser } = useAuth();
    const dialog = useDialog();
    const { submitLeaveRequest, submitAdjustmentRequest } = useMyRequests(currentUser);

    // Modal States
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);

    // Form States
    const [leaveForm, setLeaveForm] = useState({
        type: 'Sick Leave',
        reason: '',
        startDate: '',
        endDate: ''
    });

    const [adjustForm, setAdjustForm] = useState({
        timeIn: '',
        timeOut: '',
        reason: '',
        date: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // API: Open Modals
    const openLeaveModal = () => setShowLeaveModal(true);
    const openAdjustModal = () => setShowAdjustModal(true);

    // Handlers
    const handleLeaveSubmit = async () => {
        if (!leaveForm.reason || !leaveForm.startDate || !leaveForm.endDate) {
            return dialog.showAlert("กรุณากรอกข้อมูลให้ครบถ้วน", "Information Required", "warning");
        }

        setIsSubmitting(true);
        try {
            await submitLeaveRequest(leaveForm);
            await dialog.showAlert("ส่งใบลาเรียบร้อยแล้ว", "Success", "success");
            setShowLeaveModal(false);
            setLeaveForm({ type: 'Sick Leave', reason: '', startDate: '', endDate: '' });
        } catch (error) {
            dialog.showAlert(error.message, "Error", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAdjustSubmit = async () => {
        if (!adjustForm.date || (!adjustForm.timeIn && !adjustForm.timeOut)) {
            return dialog.showAlert("กรุณาระบุวันที่และเวลา", "Information Required", "warning");
        }

        setIsSubmitting(true);
        try {
            await submitAdjustmentRequest(adjustForm);
            await dialog.showAlert("ส่งคำขอแก้ไขเวลาเรียบร้อย", "Success", "success");
            setShowAdjustModal(false);
            setAdjustForm({ timeIn: '', timeOut: '', reason: '', date: '' });
        } catch (error) {
            dialog.showAlert(error.message, "Error", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <RequestModalContext.Provider value={{ openLeaveModal, openAdjustModal }}>
            {children}

            {/* Leave Modal */}
            {showLeaveModal && createPortal(
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center animate-fade-in">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLeaveModal(false)}></div>
                    <div className="bg-[#F8F9FD] w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 relative z-10 animate-slide-up max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-extrabold flex items-center gap-2 text-[#0F172A]">
                                <AirplaneTilt weight="duotone" className="text-blue-600" /> New Leave
                            </h3>
                            <button onClick={() => setShowLeaveModal(false)} className="w-8 h-8 rounded-full bg-slate-200/50 flex items-center justify-center text-slate-500">
                                <X weight="bold" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Leave Type Selector */}
                            <div className="grid grid-cols-2 gap-2">
                                {['Sick Leave', 'Vacation', 'Business', 'Other'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setLeaveForm({ ...leaveForm, type: t })}
                                        className={`p-3 rounded-2xl text-xs font-bold border transition-all active:scale-95 ${leaveForm.type === t
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                                                : 'bg-white text-slate-500 border-slate-200'
                                            }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>

                            {/* Date Inputs */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white p-3 rounded-2xl border border-slate-100">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none"
                                        value={leaveForm.startDate}
                                        onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                                    />
                                </div>
                                <div className="bg-white p-3 rounded-2xl border border-slate-100">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none"
                                        value={leaveForm.endDate}
                                        onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Reason */}
                            <textarea
                                className="w-full bg-white border border-slate-100 rounded-2xl p-4 text-sm resize-none h-32 focus:ring-2 focus:ring-blue-100 outline-none transition"
                                placeholder="Reason for leave..."
                                value={leaveForm.reason}
                                onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                            ></textarea>

                            {/* Submit Button */}
                            <button
                                disabled={isSubmitting}
                                onClick={handleLeaveSubmit}
                                className="w-full bg-[#0F172A] text-white py-4 rounded-2xl font-bold text-sm shadow-xl hover:bg-slate-800 active:scale-95 transition disabled:opacity-50"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Adjust Time Modal */}
            {showAdjustModal && createPortal(
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center animate-fade-in">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAdjustModal(false)}></div>
                    <div className="bg-[#F8F9FD] w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 relative z-10 animate-slide-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-extrabold flex items-center gap-2 text-[#0F172A]">
                                <Timer weight="duotone" className="text-slate-500" /> Adjust Time
                            </h3>
                            <button onClick={() => setShowAdjustModal(false)} className="w-8 h-8 rounded-full bg-slate-200/50 flex items-center justify-center text-slate-500">
                                <X weight="bold" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Date Input */}
                            <div className="bg-white p-3 rounded-2xl border border-slate-100">
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Date</label>
                                <input
                                    type="date"
                                    className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none"
                                    value={adjustForm.date}
                                    onChange={e => setAdjustForm({ ...adjustForm, date: e.target.value })}
                                />
                            </div>

                            {/* Time Inputs */}
                            <div className="flex gap-3">
                                <div className="flex-1 bg-white p-3 rounded-2xl border border-slate-100">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Time In</label>
                                    <input
                                        type="time"
                                        className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none"
                                        value={adjustForm.timeIn}
                                        onChange={e => setAdjustForm({ ...adjustForm, timeIn: e.target.value })}
                                    />
                                </div>
                                <div className="flex-1 bg-white p-3 rounded-2xl border border-slate-100">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Time Out</label>
                                    <input
                                        type="time"
                                        className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none"
                                        value={adjustForm.timeOut}
                                        onChange={e => setAdjustForm({ ...adjustForm, timeOut: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Reason */}
                            <textarea
                                className="w-full bg-white border border-slate-100 rounded-2xl p-4 text-sm h-32 resize-none focus:ring-2 focus:ring-slate-100 outline-none transition"
                                placeholder="Reason..."
                                value={adjustForm.reason}
                                onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                            ></textarea>

                            {/* Submit Button */}
                            <button
                                disabled={isSubmitting}
                                onClick={handleAdjustSubmit}
                                className="w-full bg-[#0F172A] text-white py-4 rounded-2xl font-bold text-sm shadow-xl hover:bg-slate-800 active:scale-95 transition disabled:opacity-50"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </RequestModalContext.Provider>
    );
}

export const useRequestModal = () => {
    const context = useContext(RequestModalContext);
    if (!context) {
        throw new Error('useRequestModal must be used within RequestModalProvider');
    }
    return context;
};
