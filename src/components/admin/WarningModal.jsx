import React, { useState } from 'react';
import { X, WarningCircle, PaperPlaneRight } from '@phosphor-icons/react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

export default function WarningModal({ isOpen, onClose, employee }) {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const [form, setForm] = useState({
    level: 'written', 
    topic: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  if (!isOpen) return null;

  // Safety Check: ถ้าไม่มี User หรือ Employee ให้ไม่แสดงผลหรือ return null ไปก่อน
  if (!currentUser || !employee) return null;

  const handleSubmit = async () => {
    if (!form.topic || !form.description) {
      alert("กรุณาระบุหัวข้อและรายละเอียดความผิด");
      return;
    }
    
    if (!window.confirm(`ยืนยันการออกใบเตือนให้ "${employee.name}"?`)) return;

    setIsLoading(true);
    try {
      await addDoc(collection(db, "warnings"), {
        companyId: currentUser.companyId,
        employeeId: employee.id,
        employeeName: employee.name,
        ...form,
        issuedBy: currentUser.uid,
        createdAt: serverTimestamp()
      });
      
      alert("บันทึกใบเตือนเรียบร้อย");
      onClose();
      // Reset Form
      setForm({ level: 'written', topic: '', description: '', date: new Date().toISOString().split('T')[0] }); 
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
    setIsLoading(false);
  };

  // Styles
  const inputStyle = "w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition-all";
  const labelStyle = "text-[10px] font-bold text-slate-400 mb-1.5 block uppercase tracking-wide";

  return (
    // ID เฉพาะเจาะจง: #modal-warning-wrapper
    <div id="modal-warning-wrapper" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden flex flex-col animate-pulse-soft">
        
        {/* Header */}
        <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
          <div className="flex items-center gap-2 text-rose-600">
            <WarningCircle weight="fill" size={24} />
            <h2 className="text-lg font-bold">ออกใบเตือน / ลงโทษ</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/50 hover:bg-white text-rose-500 flex items-center justify-center transition">
            <X weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
           
           {/* Target Employee */}
           <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <img src={employee?.avatar || `https://ui-avatars.com/api/?name=${employee?.name}`} className="w-10 h-10 rounded-full border border-white shadow-sm" alt="avatar"/>
              <div>
                <p className="text-xs text-slate-400 font-bold">ผู้ถูกตักเตือน</p>
                <p className="text-sm font-bold text-slate-800">{employee?.name}</p>
              </div>
           </div>

           {/* Level Selector */}
           <div>
              <label className={labelStyle}>ระดับการลงโทษ</label>
              <select 
                className={inputStyle}
                value={form.level}
                onChange={(e) => setForm({...form, level: e.target.value})}
              >
                <option value="verbal">1. ตักเตือนด้วยวาจา (Verbal Warning)</option>
                <option value="written">2. ลายลักษณ์อักษร (Written Warning)</option>
                <option value="suspension">3. พักงาน (Suspension)</option>
                <option value="termination">4. เลิกจ้าง (Termination)</option>
              </select>
           </div>

           {/* Topic */}
           <div>
              <label className={labelStyle}>หัวข้อความผิด</label>
              <input 
                type="text" 
                className={inputStyle} 
                placeholder="เช่น มาสายเกินกำหนด, ทะเลาะวิวาท..." 
                value={form.topic}
                onChange={(e) => setForm({...form, topic: e.target.value})}
              />
           </div>

           {/* Details */}
           <div>
              <label className={labelStyle}>รายละเอียด / เหตุการณ์</label>
              <textarea 
                rows="4" 
                className={`${inputStyle} resize-none`} 
                placeholder="ระบุรายละเอียดเหตุการณ์ที่เกิดขึ้น..."
                value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
              ></textarea>
           </div>

           {/* Date */}
           <div>
              <label className={labelStyle}>วันที่กระทำผิด</label>
              <input 
                type="date" 
                className={`${inputStyle} cursor-pointer`}
                value={form.date}
                onChange={(e) => setForm({...form, date: e.target.value})}
              />
           </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white pb-6">
          <button 
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-200 flex items-center justify-center gap-2 active:scale-95 transition"
          >
            {isLoading ? 'กำลังบันทึก...' : <><PaperPlaneRight weight="bold" size={18}/> บันทึกใบเตือน</>}
          </button>
        </div>

      </div>
    </div>
  );
}