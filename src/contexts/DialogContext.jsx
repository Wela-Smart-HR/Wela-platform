import React, { createContext, useContext, useState, useRef } from 'react';
import { X, Check, WarningCircle, Info } from '@phosphor-icons/react';

const DialogContext = createContext();

export function useDialog() {
  return useContext(DialogContext);
}

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'info', confirmLabel: 'ตกลง', cancelLabel: 'ยกเลิก' });
  const resolveRef = useRef(null);

  // ฟังก์ชันเรียกใช้ (เหมือน alert/confirm แต่สวยกว่า)
  const showAlert = (message, title = 'แจ้งเตือน', type = 'info') => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({ isOpen: true, title, message, type, isConfirm: false, confirmLabel: 'ตกลง' });
    });
  };

  const showConfirm = (message, title = 'ยืนยัน', confirmLabel = 'ตกลง', cancelLabel = 'ยกเลิก') => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({ isOpen: true, title, message, type: 'confirm', isConfirm: true, confirmLabel, cancelLabel });
    });
  };

  const handleClose = (result) => {
    setDialog({ ...dialog, isOpen: false });
    if (resolveRef.current) {
      resolveRef.current(result); // ส่งค่า true/false กลับไปให้คนเรียก
      resolveRef.current = null;
    }
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* --- ส่วนแสดงผล UI (ออกแบบครั้งเดียวใช้ได้ทั้งแอป) --- */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 animate-fade-in">
          {/* ฉากหลังสีดำจางๆ */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !dialog.isConfirm && handleClose(false)}></div>
          
          {/* กล่องข้อความ */}
          <div className="bg-white w-full max-w-xs sm:max-w-sm rounded-3xl p-6 shadow-2xl relative z-10 animate-zoom-in text-center">
            
            {/* ไอคอนตามประเภท */}
            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 ${
                dialog.type === 'error' ? 'bg-rose-50 text-rose-500' :
                dialog.type === 'success' ? 'bg-emerald-50 text-emerald-500' :
                dialog.type === 'confirm' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'
            }`}>
                {dialog.type === 'error' ? <X weight="bold" size={32}/> :
                 dialog.type === 'success' ? <Check weight="bold" size={32}/> :
                 dialog.type === 'confirm' ? <WarningCircle weight="fill" size={32}/> : <Info weight="fill" size={32}/>}
            </div>

            <h3 className="text-xl font-bold text-slate-800 mb-2">{dialog.title}</h3>
            <p className="text-slate-500 text-sm mb-8 whitespace-pre-line leading-relaxed">{dialog.message}</p>

            {/* ปุ่มกด */}
            <div className="flex gap-3">
              {dialog.isConfirm && (
                <button 
                  onClick={() => handleClose(false)} 
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition"
                >
                  {dialog.cancelLabel}
                </button>
              )}
              <button 
                onClick={() => handleClose(true)} 
                className={`flex-1 py-3 rounded-xl text-white font-bold text-sm shadow-lg active:scale-95 transition ${
                    dialog.type === 'error' ? 'bg-rose-500 hover:bg-rose-600' :
                    dialog.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' :
                    'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}