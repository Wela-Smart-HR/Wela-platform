import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useDialog } from '../../contexts/DialogContext'; // ✅ 1. เพิ่ม Import Dialog
import {
  Check, X, CalendarBlank, WarningCircle, Clock,
  HandSwipeLeft, WarningOctagon, CaretRight
} from '@phosphor-icons/react';

// ✅ Import Hook จาก Features Architecture
import { useRequestsAdmin } from '../../features/requests/useRequestsAdmin';

// --- COMPONENTS ---
const SwipeableItem = ({ children, onSwipeLeft, onSwipeRight, disabled }) => {
  const [dragX, setDragX] = useState(0);
  const startX = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => { if (disabled) return; startX.current = e.touches[0].clientX; };
  const handleTouchMove = (e) => {
    if (disabled) return;
    const diff = e.touches[0].clientX - startX.current;
    if (diff > -120 && diff < 120) setDragX(diff);
  };
  const handleTouchEnd = () => {
    if (disabled) return;
    if (dragX > 80) onSwipeRight && onSwipeRight();
    else if (dragX < -80) onSwipeLeft && onSwipeLeft();
    setDragX(0);
  };

  return (
    <div className="relative overflow-hidden mb-3 rounded-xl touch-pan-y select-none group">
      <div className={`absolute inset-0 flex items-center justify-between px-6 transition-colors rounded-xl ${dragX > 0 ? 'bg-emerald-500' : dragX < 0 ? 'bg-rose-500' : 'bg-white'}`}>
        <div className={`flex items-center gap-2 text-white font-bold text-sm ${dragX > 0 ? 'opacity-100' : 'opacity-0'}`}><Check weight="bold" size={20} /> อนุมัติ</div>
        <div className={`flex items-center gap-2 text-white font-bold text-sm ${dragX < 0 ? 'opacity-100' : 'opacity-0'}`}>ปฏิเสธ <X weight="bold" size={20} /></div>
      </div>
      <div ref={containerRef} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        style={{ transform: `translateX(${dragX}px)`, transition: 'transform 0.2s ease-out' }}
        className="relative bg-white shadow-sm border border-slate-100 rounded-xl"
      >
        {children}
      </div>
    </div>
  );
};

export default function Requests() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const dialog = useDialog(); // ✅ 2. เรียกใช้ Hook Dialog
  // UI State
  const [filter, setFilter] = useState('pending');
  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ เรียกใช้ Hook ข้อมูล จาก Features
  const { requests, loading, approveRequest, rejectRequest } = useRequestsAdmin(currentUser?.companyId, filter);

  // --- ACTIONS ---
  const handleAction = async (req, action) => {
    // ✅ 3. เปลี่ยน window.confirm เป็น dialog.showConfirm
    const isConfirmed = await dialog.showConfirm(
      `${action === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'} รายการของ ${req.userName}?`,
      "ยืนยันการทำรายการ"
    );

    if (isConfirmed) {
      setIsProcessing(true);
      try {
        if (action === 'approved') {
          await approveRequest(req);
          // (Optional) อาจจะไม่ต้องแจ้งเตือน Success ก็ได้ถ้าลิสต์หายไปเอง แต่ถ้าอยากใส่ก็ได้ครับ
          dialog.showAlert("อนุมัติเรียบร้อย", "สำเร็จ", "success");
        } else {
          await rejectRequest(req);
          dialog.showAlert("ปฏิเสธคำขอเรียบร้อย", "สำเร็จ", "success");
        }
      } catch (error) {
        // ✅ 4. เปลี่ยน alert เป็น dialog.showAlert
        dialog.showAlert("เกิดข้อผิดพลาด: " + error.message, "Error", "error");
      }
      setIsProcessing(false);
    }
  };

  const filteredRequests = requests.filter(r => r.status === filter);

  // --- FORMATTERS ---
  const formatDateTh = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return isNaN(date) ? '' : date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  const getDateInfo = (req) => {
    // Guard: ถ้าไม่มี data ให้ return ค่าว่าง
    if (!req?.data) return '-';

    if (req.type === 'leave') {
      return (
        <span className="flex items-center gap-1">
          {formatDateTh(req.data?.startDate)}
          {req.data?.startDate !== req.data?.endDate && <span className="text-slate-400 font-normal">➜</span>}
          {req.data?.startDate !== req.data?.endDate && formatDateTh(req.data?.endDate)}
        </span>
      );
    }
    return formatDateTh(req.data?.date);
  };

  const getReasonInfo = (req) => {
    if (req.type === 'leave') return req.reason || 'พักผ่อน/กิจธุระ';
    if (req.type === 'retro') return `เวลา ${req.data?.timeIn} - ${req.data?.timeOut} ${req.reason ? '• ' + req.reason : ''}`;
    if (req.type === 'unscheduled_alert') return `เวลา ${req.data?.time} น.`;
    return '-';
  };

  const getTypeStyle = (type) => {
    if (type === 'unscheduled_alert') return 'text-rose-600';
    if (type === 'leave') return 'text-orange-500';
    return 'text-blue-600';
  };

  const getTypeLabel = (type, data) => {
    if (type === 'unscheduled_alert') return 'ด่วน! นอกกะ';
    if (type === 'leave') return `ลา${data?.leaveType || 'งาน'}`;
    return 'แก้เวลา';
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] text-[#1E293B] font-sans">

      {/* HEADER */}
      <header className="px-6 pt-6 pb-2 z-20 bg-[#FAFAFA]/90 backdrop-blur-sm sticky top-0">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">รายการคำขอ</h1>
            <p className="text-xs text-slate-400 mt-0.5">ปัดขวาเพื่ออนุมัติ • ปัดซ้ายเพื่อปฏิเสธ</p>
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
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-xs">กำลังโหลดรายการ...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-300 opacity-50">
              <HandSwipeLeft size={48} className="mb-2" />
              <p className="text-sm">ไม่มีรายการ {filter === 'pending' ? 'ใหม่' : ''}</p>
            </div>
          ) : (
            filteredRequests.map((req) => {

              // 1. Security Alert (แสดงผลต่างจากเพื่อน)
              if (req.type === 'security_alert') {
                return (
                  <div key={req.id} className="bg-red-50 border border-red-100 p-4 rounded-xl mb-3 flex items-start gap-4 shadow-sm animate-pulse">
                    <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <WarningOctagon weight="fill" size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-red-700 text-sm">🚨 {req.title || 'Security Alert'}</h4>
                        <span className="text-[10px] text-red-400 font-medium">
                          {req.createdAt?.toDate().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-red-600 mt-1 font-medium">User: <span className="font-bold">{req.userName}</span></p>
                      <p className="text-xs text-slate-600 mt-2 bg-white p-2.5 rounded-lg border border-red-100 shadow-sm leading-relaxed">{req.detail}</p>
                      {filter === 'pending' && (
                        <div className="mt-3">
                          <button onClick={() => handleAction(req, 'approved')} className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-red-700 transition w-full sm:w-auto">รับทราบ / ปิดแจ้งเตือน</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // 2. Normal Request Card
              return (
                <SwipeableItem
                  key={req.id}
                  disabled={filter !== 'pending' || isProcessing}
                  onSwipeRight={() => handleAction(req, 'approved')}
                  onSwipeLeft={() => handleAction(req, 'rejected')}
                >
                  <div className="flex items-start gap-3 p-4">
                    {/* Icon */}
                    <div className="pt-1">
                      {req.type === 'unscheduled_alert' ? <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center"><WarningCircle weight="fill" size={20} /></div> :
                        req.type === 'leave' ? <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center"><CalendarBlank weight="fill" size={20} /></div> :
                          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center"><Clock weight="fill" size={20} /></div>}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-slate-800 text-sm truncate">{req.userName}</h3>
                        <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">
                          {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div className="flex items-center flex-wrap gap-2 text-xs">
                        <span className={`font-bold ${getTypeStyle(req.type)} uppercase tracking-wide text-[10px]`}>{getTypeLabel(req.type, req.data)}</span>
                        <span className="text-slate-300 text-[10px]">|</span>
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                          <CalendarBlank weight="fill" className="text-slate-400" />
                          {getDateInfo(req)}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{getReasonInfo(req)}</p>
                    </div>

                    {/* Actions (Desktop Click) */}
                    {filter === 'pending' && (
                      <div className="hidden md:flex flex-col gap-2 pl-2 border-l border-slate-100 justify-center h-full my-auto">
                        <button onClick={() => handleAction(req, 'approved')} className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm transition ${req.type === 'unscheduled_alert' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-slate-900 hover:bg-slate-800'}`}><Check weight="bold" /></button>
                        <button onClick={() => handleAction(req, 'rejected')} className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-400 hover:bg-slate-50 transition"><X weight="bold" /></button>
                      </div>
                    )}

                    {/* Mobile Hint (Caret) */}
                    {filter === 'pending' && <div className="md:hidden self-center text-slate-300 pl-2"><CaretRight size={16} /></div>}

                    {filter !== 'pending' && (
                      <div className={`self-center text-[10px] px-2 py-1 rounded-lg font-bold uppercase ml-2 ${req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                        {req.status}
                      </div>
                    )}
                  </div>
                </SwipeableItem>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}