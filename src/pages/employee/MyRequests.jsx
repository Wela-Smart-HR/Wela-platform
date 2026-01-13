import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  FileText, CheckCircle, XCircle, 
  Plus, X, AirplaneTilt, Timer, CalendarBlank, CaretLeft
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useDialog } from '../../contexts/DialogContext'; // ✅ 1. Import

export default function MyRequests() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const dialog = useDialog(); // ✅ 2. Hook

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  
  // Modal States
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: 'Sick Leave', reason: '', date: '' });
  const [adjustForm, setAdjustForm] = useState({ timeIn: '', timeOut: '', reason: '', date: '' });

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "requests"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // ✅ Submit Functions (Updated)
  const handleSubmitLeave = async () => {
    // ❌ เดิม: alert(...)
    if (!leaveForm.reason || !leaveForm.date) return dialog.showAlert("กรุณากรอกวันที่และเหตุผล", "ข้อมูลไม่ครบ", "warning");
    
    try {
        await addDoc(collection(db, "requests"), {
            companyId: currentUser.companyId, userId: currentUser.uid, userName: currentUser.displayName || currentUser.email,
            type: 'leave', 
            leaveType: leaveForm.type,
            reason: leaveForm.reason, 
            date: leaveForm.date, 
            status: 'pending', createdAt: serverTimestamp()
        });
        
        // ✅ Success
        await dialog.showAlert("ส่งใบลาเรียบร้อยแล้ว!", "สำเร็จ", "success");
        
        setShowLeaveModal(false); setLeaveForm({ type: 'Sick Leave', reason: '', date: '' });
    } catch (e) { dialog.showAlert("เกิดข้อผิดพลาด: " + e.message, "Error", "error"); }
  };

  const handleSubmitAdjust = async () => {
    // ❌ เดิม: alert(...)
    if (!adjustForm.timeIn || !adjustForm.timeOut || !adjustForm.date) return dialog.showAlert("กรุณากรอกข้อมูลให้ครบถ้วน", "ข้อมูลไม่ครบ", "warning");
    
    try {
        await addDoc(collection(db, "requests"), {
            companyId: currentUser.companyId, userId: currentUser.uid, userName: currentUser.displayName || currentUser.email,
            type: 'adjustment', 
            targetDate: adjustForm.date,
            timeIn: adjustForm.timeIn, timeOut: adjustForm.timeOut, reason: adjustForm.reason,
            status: 'pending', createdAt: serverTimestamp()
        });
        
        // ✅ Success
        await dialog.showAlert("ส่งคำขอแก้เวลาเรียบร้อยแล้ว!", "สำเร็จ", "success");
        
        setShowAdjustModal(false); setAdjustForm({ timeIn: '', timeOut: '', reason: '', date: '' });
    } catch (e) { dialog.showAlert("เกิดข้อผิดพลาด: " + e.message, "Error", "error"); }
  };

  // Helper: Filter
  const filteredRequests = requests.filter(req => req.status === activeTab);

  // Helper: Format Date
  const formatDate = (req) => {
      let dateString = req.type === 'leave' ? req.date : req.targetDate;
      if (!dateString && req.createdAt) dateString = req.createdAt.toDate(); 
      if (!dateString) return 'ไม่ระบุวันที่';
      const d = new Date(dateString);
      return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 pb-24">
      
      {/* HEADER & TABS */}
      <div className="bg-white px-6 pt-8 pb-4 sticky top-0 z-10 shadow-sm border-b border-slate-100">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/connect')} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition"><CaretLeft weight="bold"/></button>
                <div><h1 className="text-xl font-extrabold text-slate-900">รายการคำร้อง</h1><p className="text-xs text-slate-400">ประวัติการลาและการแก้ไขเวลา</p></div>
            </div>
            
            <div className="flex gap-2">
                <button onClick={() => setShowAdjustModal(true)} className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-bold shadow-sm active:scale-95 transition flex items-center gap-1 hover:bg-slate-50">
                    <Plus weight="bold" size={14}/> แก้เวลา
                </button>
                <button onClick={() => setShowLeaveModal(true)} className="px-3 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-bold shadow-lg active:scale-95 transition flex items-center gap-1 hover:bg-slate-800">
                    <Plus weight="bold" size={14}/> ยื่นใบลา
                </button>
            </div>
        </div>

        {/* TABS */}
        <div className="flex p-1 bg-slate-100 rounded-xl">
            {['pending', 'approved', 'rejected'].map(tab => (
                <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    {tab === 'pending' ? 'รอตรวจ' : tab === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}
                </button>
            ))}
        </div>
      </div>

      {/* LIST CONTENT */}
      <div className="p-4 space-y-3">
          {filteredRequests.length === 0 ? (
              <div className="text-center py-12 opacity-40">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300"><FileText weight="fill" size={32}/></div>
                  <p className="text-sm font-bold text-slate-400">ไม่มีรายการในสถานะนี้</p>
              </div>
          ) : (
              filteredRequests.map(req => (
                  <div key={req.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50 flex items-start justify-between animate-slide-up hover:shadow-md transition">
                      <div className="flex items-start gap-4 w-full">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1 ${req.type === 'leave' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'}`}>
                              {req.type === 'leave' ? <AirplaneTilt weight="fill" size={20}/> : <Timer weight="fill" size={20}/>}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <h3 className="text-sm font-bold text-slate-800 truncate">{req.type === 'leave' ? (req.leaveType || 'ขอลาหยุด') : 'แก้ไขเวลา'}</h3>
                                <span className="text-[9px] text-slate-300 font-medium shrink-0 ml-2">{req.createdAt?.toDate().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 mb-1.5">
                                  <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">
                                    <CalendarBlank weight="fill" className="text-slate-400" size={12}/>
                                    <span className="text-xs font-bold text-slate-600">{formatDate(req)}</span>
                                  </div>
                              </div>
                              <p className="text-[11px] text-slate-400 truncate">{req.type === 'adjustment' && <span className="mr-1 text-slate-500 font-medium">เวลา: {req.timeIn} - {req.timeOut} •</span>} {req.reason || "-"}</p>
                          </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2 self-center">
                          {req.status === 'approved' && <CheckCircle className="text-emerald-500" weight="fill" size={20}/>}
                          {req.status === 'rejected' && <XCircle className="text-rose-500" weight="fill" size={20}/>}
                          {req.status === 'pending' && <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse mt-1"></div>}
                      </div>
                  </div>
              ))
          )}
      </div>

      {/* --- MODAL 1: ใบลา --- */}
      {showLeaveModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center animate-fade-in"><div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLeaveModal(false)}></div><div className="bg-white w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 relative z-10 animate-slide-up"><div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold flex items-center gap-2 text-slate-800"><AirplaneTilt className="text-blue-500"/> เขียนใบลา</h3><button onClick={() => setShowLeaveModal(false)}><X weight="bold" className="text-slate-400"/></button></div><div className="space-y-4"><div className="grid grid-cols-2 gap-2">{['Sick Leave', 'Vacation', 'Business', 'Other'].map(t => (<button key={t} onClick={() => setLeaveForm({...leaveForm, type: t})} className={`p-2 rounded-xl text-xs font-bold border ${leaveForm.type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{t}</button>))}</div><div><label className="text-[10px] font-bold text-slate-400 uppercase">วันที่ลา</label><input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" value={leaveForm.date} onChange={e => setLeaveForm({...leaveForm, date: e.target.value})}/></div><textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm" placeholder="เหตุผล..." value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})}></textarea><button onClick={handleSubmitLeave} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">ส่งใบลา</button></div></div></div>, document.body
      )}

      {/* --- MODAL 2: แก้เวลา --- */}
      {showAdjustModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center animate-fade-in"><div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAdjustModal(false)}></div><div className="bg-white w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 relative z-10 animate-slide-up"><div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold flex items-center gap-2 text-rose-500"><Timer weight="fill"/> ขอแก้เวลา</h3><button onClick={() => setShowAdjustModal(false)}><X weight="bold" className="text-slate-400"/></button></div><div className="space-y-4"><div><label className="text-[10px] font-bold text-slate-400 uppercase">วันที่ต้องการแก้</label><input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" value={adjustForm.date} onChange={e => setAdjustForm({...adjustForm, date: e.target.value})}/></div><div className="flex gap-3"><div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase">เข้า (In)</label><input type="time" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" value={adjustForm.timeIn} onChange={e => setAdjustForm({...adjustForm, timeIn: e.target.value})}/></div><div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase">ออก (Out)</label><input type="time" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" value={adjustForm.timeOut} onChange={e => setAdjustForm({...adjustForm, timeOut: e.target.value})}/></div></div><textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm" placeholder="เหตุผล..." value={adjustForm.reason} onChange={e => setAdjustForm({...adjustForm, reason: e.target.value})}></textarea><button onClick={handleSubmitAdjust} className="w-full bg-rose-500 text-white py-3 rounded-xl font-bold">ส่งคำขอ</button></div></div></div>, document.body
      )}
    </div>
  );
}