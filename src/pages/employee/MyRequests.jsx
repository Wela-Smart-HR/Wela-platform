import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useMyRequests } from '../../features/requests/useMyRequests';
import { useDialog } from '../../contexts/DialogContext';
import { useNavigate } from 'react-router-dom';
import {
  FileText, CheckCircle, XCircle,
  Plus, X, AirplaneTilt, Timer, CalendarBlank, CaretLeft,
  Clock, ArrowRight, Trash, CaretDown, NotePencil, Steps, Funnel, Hourglass
} from '@phosphor-icons/react';

// --- SUB-COMPONENT: TIMELINE ---
const RequestTimeline = ({ request }) => {
  const steps = request.workflowSnapshot?.steps || [{ role: 'supervisor', label: 'อนุมัติ' }];
  const currentStep = request.currentStepIndex || 0;
  const isRejected = request.status === 'rejected';
  const isApproved = request.status === 'approved';

  return (
    <div className="mt-4 pt-4 border-t border-slate-50">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {steps.map((step, index) => {
          let statusColor = 'text-slate-300 bg-slate-50 border-slate-100';
          let icon = <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />;

          if (isRejected && index === currentStep) {
            statusColor = 'text-rose-500 bg-rose-50 border-rose-100';
            icon = <XCircle weight="fill" />;
          } else if (isApproved || index < currentStep) {
            statusColor = 'text-emerald-500 bg-emerald-50 border-emerald-100';
            icon = <CheckCircle weight="fill" />;
          } else if (index === currentStep && !isRejected) {
            statusColor = 'text-blue-600 bg-blue-50 border-blue-100 animate-pulse';
            icon = <Clock weight="fill" />;
          }

          return (
            <div key={index} className={`flex items-center whitespace-nowrap px-3 py-1.5 rounded-xl border text-[10px] font-bold gap-2 transition-all ${statusColor}`}>
              {icon}
              <span>{step.label || step.role}</span>
              {index < steps.length - 1 && <ArrowRight className="text-slate-300" size={12} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function MyRequests() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const dialog = useDialog();

  const { requests, loading, submitLeaveRequest, submitAdjustmentRequest, cancelRequest } = useMyRequests(currentUser);

  const [activeTab, setActiveTab] = useState('pending');
  const [expandedId, setExpandedId] = useState(null);
  const [showFabMenu, setShowFabMenu] = useState(false);

  // Modal States
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // Forms
  const [leaveForm, setLeaveForm] = useState({ type: 'Sick Leave', reason: '', startDate: '', endDate: '' });
  const [adjustForm, setAdjustForm] = useState({ timeIn: '', timeOut: '', reason: '', date: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- ACTIONS ---
  const handleLeaveSubmit = async () => {
    if (!leaveForm.reason || !leaveForm.startDate || !leaveForm.endDate) return dialog.showAlert("กรุณากรอกข้อมูลให้ครบถ้วน", "Information Required", "warning");

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
    if (!adjustForm.date || (!adjustForm.timeIn && !adjustForm.timeOut)) return dialog.showAlert("กรุณาระบุวันที่และเวลา", "Information Required", "warning");

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

  const handleCancel = async (req, e) => {
    e.stopPropagation();
    const confirm = await dialog.showConfirm(`ต้องการยกเลิกเอกสาร ${req.documentNo}?`, "Confirm Cancellation");
    if (confirm) {
      try {
        await cancelRequest(req.id);
        dialog.showAlert("ยกเลิกเอกสารเรียบร้อย", "Cancelled", "success");
      } catch (error) {
        dialog.showAlert("ไม่สามารถยกเลิกได้: " + error.message, "Error", "error");
      }
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  // --- RENDERING ---
  const filteredRequests = requests.filter(req => {
    if (activeTab === 'pending') return req.status === 'pending';
    if (activeTab === 'approved') return req.status === 'approved';
    if (activeTab === 'rejected') return req.status === 'rejected' || req.status === 'cancelled';
    return true;
  });

  const formatDate = (req) => {
    if (req.type === 'leave') {
      const start = req.startDate ? new Date(req.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '-';
      const end = req.endDate ? new Date(req.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '-';
      return start === end ? start : `${start} - ${end}`;
    }
    const d = req.targetDate || req.date;
    return d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '-';
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] font-sans text-slate-800 pb-28">

      {/* 1. CLEAN HEADER */}
      <div className="px-6 pt-8 pb-2"> {/* Removed sticky for natural flow */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/connect')} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 transition active:scale-95"><CaretLeft weight="bold" size={20} /></button>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A]">My Requests</h1>
          </div>
        </div>

        {/* 2. FULL FILTER PILLS (Blue Active) */}
        <div className="flex p-1.5 bg-white rounded-2xl shadow-sm border border-slate-100 gap-1">
          {['pending', 'approved', 'rejected'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === tab
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
            >
              {tab === 'pending' ? 'Pending' : tab === 'approved' ? 'Approved' : 'History'}
            </button>
          ))}
        </div>
      </div>

      {/* 3. SIMPLIFIED LIST */}
      <div className="px-6 mt-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-wider">Loading...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-20 opacity-50">
            <div className="w-20 h-20 bg-slate-100 rounded-[24px] flex items-center justify-center mx-auto mb-4 text-slate-300">
              <FileText weight="duotone" size={32} />
            </div>
            <p className="text-sm font-bold text-slate-400">No requests found</p>
          </div>
        ) : (
          filteredRequests.map(req => {
            const isExpanded = expandedId === req.id;

            // Status Logic for Card
            let statusColor = "bg-slate-100 text-slate-500";
            let StatusIcon = Hourglass;
            if (req.status === 'approved') {
              statusColor = "bg-emerald-50 text-emerald-600";
              StatusIcon = CheckCircle;
            } else if (req.status === 'rejected') {
              statusColor = "bg-rose-50 text-rose-600";
              StatusIcon = XCircle;
            } else {
              statusColor = "bg-blue-50 text-blue-600"; // Pending is Blue now
            }

            return (
              <div key={req.id} onClick={() => toggleExpand(req.id)} className={`bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 relative group transition-all duration-300 active:scale-[0.98] cursor-pointer ${isExpanded ? 'ring-2 ring-blue-50 border-blue-100' : 'hover:border-slate-300'}`}>

                <div className="flex items-center gap-4">
                  {/* ICON: Status-based Background */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors duration-300 ${statusColor}`}>
                    {req.type === 'leave' ? <AirplaneTilt weight="duotone" size={24} /> : <Timer weight="duotone" size={24} />}
                  </div>

                  {/* CONTENT: Simple & Clean */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="text-base font-bold text-[#0F172A] leading-tight truncate pr-2">
                        {req.type === 'leave' ? (req.leaveType || 'Leave Request') : 'Time Adjustment'}
                      </h3>
                      {/* Date Badge */}
                      <div className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg shrink-0">
                        {formatDate(req)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      {/* Status Text with Icon */}
                      <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${req.status === 'approved' ? 'text-emerald-600' : req.status === 'rejected' ? 'text-rose-600' : 'text-blue-500'}`}>
                        <StatusIcon weight="fill" size={12} />
                        {req.status}
                      </div>

                      {/* Separator */}
                      <span className="text-slate-300">•</span>

                      {/* Time Ago (Subtle) */}
                      <p className="text-[10px] text-slate-400">
                        {req.createdAt?.seconds ? new Date(req.createdAt.seconds * 1000).toLocaleDateString('en-GB') : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="mt-5 pt-5 border-t border-slate-50 animate-fade-in">
                    {req.type === 'adjustment' && (
                      <div className="mb-3 p-3 bg-slate-50 rounded-xl flex items-center gap-3">
                        <div className="text-slate-400"><Clock size={20} weight="duotone" /></div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">New Time</p>
                          <p className="text-sm font-bold text-slate-700">{req.timeIn} - {req.timeOut}</p>
                        </div>
                      </div>
                    )}

                    <div className="mb-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-2"><NotePencil /> Detail</label>
                      <p className="text-sm text-slate-700 leading-relaxed font-medium">
                        {req.reason || "- No detail -"}
                      </p>
                    </div>

                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-2"><Steps /> Approval Status</label>
                    <RequestTimeline request={req} />

                    {req.status === 'pending' && (
                      <button onClick={(e) => handleCancel(req, e)} className="mt-6 w-full py-3 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-rose-100 active:scale-95 transition">
                        <Trash size={16} weight="bold" /> Cancel Request
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>


      {/* --- MODAL 1: ใบลา (Theme match) --- */}
      {showLeaveModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLeaveModal(false)}></div>
          <div className="bg-[#F8F9FD] w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 relative z-10 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-extrabold flex items-center gap-2 text-[#0F172A]"><AirplaneTilt weight="duotone" className="text-blue-600" /> New Leave</h3>
              <button onClick={() => setShowLeaveModal(false)} className="w-8 h-8 rounded-full bg-slate-200/50 flex items-center justify-center text-slate-500"><X weight="bold" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {['Sick Leave', 'Vacation', 'Business', 'Other'].map(t => (
                  <button key={t} onClick={() => setLeaveForm({ ...leaveForm, type: t })} className={`p-3 rounded-2xl text-xs font-bold border transition-all active:scale-95 ${leaveForm.type === t ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-white text-slate-500 border-slate-200'}`}>
                    {t === 'Sick Leave' ? 'Sick Leave' : t === 'Vacation' ? 'Vacation' : t === 'Business' ? 'Business' : 'Other'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-2xl border border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Start Date</label>
                  <input type="date" className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} />
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">End Date</label>
                  <input type="date" className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} />
                </div>
              </div>
              <textarea className="w-full bg-white border border-slate-100 rounded-2xl p-4 text-sm resize-none h-32 focus:ring-2 focus:ring-blue-100 outline-none transition" placeholder="Reason for leave..." value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}></textarea>

              <button disabled={isSubmitting} onClick={handleLeaveSubmit} className="w-full bg-[#0F172A] text-white py-4 rounded-2xl font-bold text-sm shadow-xl hover:bg-slate-800 active:scale-95 transition disabled:opacity-50">
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* --- MODAL 2: แก้เวลา (Theme match) --- */}
      {showAdjustModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAdjustModal(false)}></div>
          <div className="bg-[#F8F9FD] w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 relative z-10 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-extrabold flex items-center gap-2 text-[#0F172A]"><Timer weight="duotone" className="text-slate-500" /> Adjust Time</h3>
              <button onClick={() => setShowAdjustModal(false)} className="w-8 h-8 rounded-full bg-slate-200/50 flex items-center justify-center text-slate-500"><X weight="bold" /></button>
            </div>
            <div className="space-y-4">
              <div className="bg-white p-3 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Date</label>
                <input type="date" className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none" value={adjustForm.date} onChange={e => setAdjustForm({ ...adjustForm, date: e.target.value })} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1 bg-white p-3 rounded-2xl border border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Time In</label>
                  <input type="time" className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none" value={adjustForm.timeIn} onChange={e => setAdjustForm({ ...adjustForm, timeIn: e.target.value })} />
                </div>
                <div className="flex-1 bg-white p-3 rounded-2xl border border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Time Out</label>
                  <input type="time" className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none" value={adjustForm.timeOut} onChange={e => setAdjustForm({ ...adjustForm, timeOut: e.target.value })} />
                </div>
              </div>
              <textarea className="w-full bg-white border border-slate-100 rounded-2xl p-4 text-sm h-32 resize-none focus:ring-2 focus:ring-slate-100 outline-none transition" placeholder="Reason..." value={adjustForm.reason} onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })}></textarea>
              <button disabled={isSubmitting} onClick={handleAdjustSubmit} className="w-full bg-[#0F172A] text-white py-4 rounded-2xl font-bold text-sm shadow-xl hover:bg-slate-800 active:scale-95 transition disabled:opacity-50">
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}