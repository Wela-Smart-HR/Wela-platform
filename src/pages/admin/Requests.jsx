import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useDialog } from '../../contexts/DialogContext';
import {
  Check, X, CalendarBlank, WarningCircle, Clock,
  HandSwipeLeft, WarningOctagon, CaretRight, CaretDown,
  Steps, FileText, UserCircle, NotePencil, CheckCircle, XCircle, AirplaneTilt
} from '@phosphor-icons/react';

import { useRequestsAdmin } from '../../features/requests/useRequestsAdmin';

export default function Requests() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const dialog = useDialog();
  const [filter, setFilter] = useState('pending');
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Use Admin Hook
  const { requests, loading, approveRequest, rejectRequest } = useRequestsAdmin(currentUser?.companyId, filter);

  // --- ACTIONS ---
  const handleAction = async (req, action, e) => {
    if (e) e.stopPropagation();

    // Logic for Button Label (Next Step vs Final)
    const isNextStep = req.status === 'pending' && req.workflowSnapshot && (req.currentStepIndex < (req.workflowSnapshot.steps?.length - 1));
    const actionLabel = action === 'approved'
      ? (isNextStep ? 'อนุมัติ (ส่งต่อ)' : 'อนุมัติ (เสร็จสิ้น)')
      : 'ปฏิเสธ';

    const isConfirmed = await dialog.showConfirm(
      `${actionLabel} รายการของ ${req.userProfile?.displayName || req.userName}?`,
      "ยืนยันการทำรายการ"
    );

    if (isConfirmed) {
      setIsProcessing(true);
      try {
        if (action === 'approved') {
          await approveRequest(req);
          dialog.showAlert(isNextStep ? "ส่งต่อเรียบร้อย" : "อนุมัติเรียบร้อย", "สำเร็จ", "success");
        } else {
          await rejectRequest(req);
          dialog.showAlert("ปฏิเสธคำขอเรียบร้อย", "สำเร็จ", "success");
        }
      } catch (error) {
        dialog.showAlert("เกิดข้อผิดพลาด: " + error.message, "Error", "error");
      }
      setIsProcessing(false);
      setExpandedId(null); // Collapse after action
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const filteredRequests = requests.filter(r => r.status === filter);

  // --- HELPERS ---
  const formatDateTh = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return isNaN(date) ? '' : date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  const getDateInfo = (req) => {
    // Support both old and new data structures
    const data = req || {};
    if (req.type === 'leave') {
      const s = req.startDate || req.date;
      const e = req.endDate || req.date;
      return (
        <span className="flex items-center gap-1">
          {formatDateTh(s)}
          {s !== e && <span className="text-slate-400 font-normal">➜</span>}
          {s !== e && formatDateTh(e)}
        </span>
      );
    }
    return formatDateTh(req.targetDate || req.date);
  };

  const getTypeStyle = (type) => {
    if (type === 'unscheduled_alert') return 'text-rose-600';
    if (type === 'leave') return 'text-orange-500';
    return 'text-blue-600';
  };

  const getTypeLabel = (req) => { // Updated to take whole req object
    if (req.type === 'unscheduled_alert') return 'ด่วน! นอกกะ';
    if (req.type === 'leave') return req.leaveType || 'ลา (ไม่ระบุ)';
    return 'แก้เวลา';
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] text-[#1E293B] font-sans">

      {/* HEADER */}
      <header className="px-6 pt-6 pb-2 z-20 bg-[#FAFAFA]/90 backdrop-blur-sm sticky top-0">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">รายการคำขอ</h1>
            <p className="text-xs text-slate-400 mt-0.5">Admin Dashboard</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-slate-200 p-1 rounded-xl flex mb-2">
          {[{ id: 'pending', label: 'รอตรวจ' }, { id: 'approved', label: 'อนุมัติ' }, { id: 'rejected', label: 'ปฏิเสธ' }].map((tab) => (
            <button key={tab.id} onClick={() => setFilter(tab.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${filter === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* LIST */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6 pt-2">
        <div className="space-y-3 pb-20">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-xs">กำลังโหลดรายการ...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-300 opacity-50">
              <HandSwipeLeft size={48} className="mb-2" />
              <p className="text-sm">ไม่มีรายการ {filter === 'pending' ? 'ใหม่' : ''}</p>
            </div>
          ) : (
            filteredRequests.map((req) => {
              const isExpanded = expandedId === req.id;
              const isNextStep = req.status === 'pending' && req.workflowSnapshot && (req.currentStepIndex < (req.workflowSnapshot.steps?.length - 1));

              return (
                <div
                  key={req.id}
                  onClick={() => toggleExpand(req.id)}
                  className={`relative overflow-hidden mb-3 rounded-xl transition-all duration-300 border border-slate-100 shadow-sm cursor-pointer active:scale-[0.99] group ${isExpanded ? 'bg-slate-50 ring-2 ring-slate-100' : 'bg-white'}`}
                >
                  {/* --- MAIN CARD ROW --- */}
                  <div className="flex items-start gap-3 p-4">
                    {/* DOC NO */}
                    <div className="absolute top-3 right-3 text-[9px] font-mono font-bold text-slate-300 tracking-wider">
                      {req.documentNo || req.id.slice(0, 8)}
                    </div>


                    {/* Avatar & Icon Badge */}
                    <div className="pt-1 relative">
                      {req.userProfile?.photoURL ? (
                        <img src={req.userProfile.photoURL} alt="Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ${req.type === 'leave' ? 'bg-orange-300' : 'bg-blue-300'}`}>
                          {(req.userProfile?.displayName || req.userName || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] shadow-sm ${req.type === 'leave' ? 'bg-orange-500' : req.type === 'unscheduled_alert' ? 'bg-rose-500' : 'bg-blue-500'}`}>
                        {req.type === 'leave' ? <AirplaneTilt weight="fill" /> : req.type === 'unscheduled_alert' ? <WarningCircle weight="fill" /> : <Clock weight="fill" />}
                      </div>
                    </div>

                    {/* Content Header */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1 pr-14 pl-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-slate-800 text-sm truncate">{req.userProfile?.displayName || req.userName}</h3>
                      </div>

                      {/* SUBMISSION TIME (For Manager Review) */}
                      <p className="text-[10px] text-slate-400 mt-0.5 mb-1.5 flex items-center gap-1">
                        ส่งเมื่อ: {req.createdAt?.seconds ? new Date(req.createdAt.seconds * 1000).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </p>

                      <div className="flex items-center flex-wrap gap-2 text-xs">
                        <span className={`font-bold ${getTypeStyle(req.type)} uppercase tracking-wide text-[10px]`}>{getTypeLabel(req)}</span>
                        <span className="text-slate-300 text-[10px]">|</span>
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                          <CalendarBlank weight="fill" className="text-slate-400" />
                          {getDateInfo(req)}
                        </div>
                      </div>

                      {/* Short Reason (if collapsed) */}
                      {!isExpanded && <p className="text-[11px] text-slate-400 truncate mt-0.5">{req.reason || '-'}</p>}
                    </div>

                    {/* Mobile Hint (Caret) */}
                    <div className={`self-center text-slate-300 pl-2 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                      <CaretDown size={14} weight="bold" />
                    </div>
                  </div>

                  {/* --- EXPANDED DETAILS --- */}
                  {isExpanded && (
                    <div className="px-4 pb-4 animate-fade-in">
                      <hr className="border-slate-100 mb-3" />

                      {/* Full Reason */}
                      <div className="mb-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1"><NotePencil /> รายละเอียด/เหตุผล</label>
                        <p className="text-sm text-slate-700 bg-white p-3 rounded-xl border border-slate-100 leading-relaxed">
                          {req.type === 'adjustment' && <span className="block font-bold mb-1 text-blue-600">เวลาใหม่: {req.timeIn} - {req.timeOut}</span>}
                          {req.reason || "- ไม่มีรายละเอียด -"}
                        </p>
                      </div>

                      {/* Workflow Status */}
                      <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Steps className="text-blue-500" weight="fill" />
                          <span className="text-xs font-bold text-blue-700">สถานะการอนุมัติ (Workflow)</span>
                        </div>
                        <div className="space-y-2">
                          {req.workflowSnapshot?.steps?.map((step, idx) => {
                            const isCurrent = idx === (req.currentStepIndex || 0);
                            const isPassed = idx < (req.currentStepIndex || 0);
                            const isCompleted = req.status === 'approved';

                            let icon = <div className="w-4 h-4 rounded-full border-2 border-slate-300" />;
                            let textClass = "text-slate-400";

                            if (req.status === 'rejected' && isCurrent) {
                              icon = <XCircle className="text-rose-500" weight="fill" size={16} />;
                              textClass = "text-rose-500 font-bold";
                            } else if (isPassed || isCompleted) {
                              icon = <CheckCircle className="text-emerald-500" weight="fill" size={16} />;
                              textClass = "text-emerald-600 font-bold";
                            } else if (isCurrent) {
                              icon = <div className="w-4 h-4 rounded-full border-4 border-blue-500 animate-pulse" />;
                              textClass = "text-blue-600 font-bold";
                            }

                            return (
                              <div key={idx} className="flex items-center gap-3 text-xs">
                                {icon}
                                <span className={textClass}>{step.label || step.role}</span>
                                {isCurrent && !isCompleted && req.status !== 'rejected' && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 rounded-full ml-auto">รออนุมัติ</span>}
                              </div>
                            );
                          })}
                          {/* Final Success State */}
                          {req.status === 'approved' && (
                            <div className="flex items-center gap-3 text-xs mt-2 pt-2 border-t border-blue-100/50">
                              <CheckCircle className="text-emerald-500" weight="fill" size={16} />
                              <span className="text-emerald-600 font-bold">อนุมัติเสร็จสิ้น</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons (Expanded View) */}
                      {filter === 'pending' && (
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <button onClick={(e) => handleAction(req, 'rejected', e)} className="py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 active:scale-95 transition">ปฏิเสธ</button>
                          <button onClick={(e) => handleAction(req, 'approved', e)} className="py-3 rounded-xl bg-slate-900 text-white font-bold text-sm shadow-lg hover:bg-slate-800 active:scale-95 transition">
                            {isNextStep ? 'อนุมัติ & ส่งต่อ' : 'อนุมัติทันที'}
                          </button>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
