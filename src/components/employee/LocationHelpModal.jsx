import React from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Gear, GoogleChromeLogo, WarningCircle, ArrowsClockwise } from '@phosphor-icons/react';

export default function LocationHelpModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 font-sans">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            
            {/* Modal Card */}
            <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl relative z-10 overflow-hidden animate-zoom-in">
                
                {/* Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <MapPin weight="duotone" className="text-blue-500"/> 
                        วิธีเปิดตำแหน่ง (GPS)
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100">
                        <X weight="bold"/>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                    
                    {/* Step 1: Android */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
                            สำหรับ Android (Chrome)
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-2 leading-relaxed">
                            <p>1. กดที่รูป <strong className="text-slate-800">แม่กุญแจ 🔒</strong> หรือ <strong className="text-slate-800">ไอคอนตั้งค่า</strong> ตรงช่องชื่อเว็บด้านบน</p>
                            <p>2. เลือกเมนู <strong className="text-slate-800">"สิทธิ์" (Permissions)</strong></p>
                            <p>3. กดที่ <strong className="text-slate-800">"ตำแหน่ง" (Location)</strong> และเลือก <strong className="text-blue-600">"อนุญาต"</strong></p>
                            <p>4. หากยังไม่ได้ ให้ลองกด <strong className="text-slate-800">"รีเซ็ตสิทธิ์"</strong></p>
                        </div>
                    </div>

                    {/* Step 2: iOS */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs">2</span>
                            สำหรับ iOS (iPhone)
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-2 leading-relaxed">
                            <p>1. ไปที่ <strong className="text-slate-800">การตั้งค่า (Settings)</strong> ในมือถือ</p>
                            <p>2. เลือก <strong className="text-slate-800">ความเป็นส่วนตัว (Privacy)</strong> {'>'} <strong className="text-slate-800">บริการหาตำแหน่ง (Location Services)</strong></p>
                            <p>3. หาแอป <strong className="text-slate-800">Safari</strong> หรือชื่อเว็บนี้</p>
                            <p>4. เปลี่ยนเป็น <strong className="text-blue-600">"ในระหว่างใช้แอป"</strong></p>
                        </div>
                    </div>

                    {/* Step 3: Global Setting */}
                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex gap-3">
                        <WarningCircle weight="fill" className="text-orange-500 shrink-0" size={20}/>
                        <p className="text-[11px] text-orange-700 font-medium leading-tight">
                            อย่าลืมเปิด <strong className="text-orange-800">GPS ของเครื่อง</strong> ด้วยนะ! (ลากแถบแจ้งเตือนลงมาแล้วกดเปิด Location)
                        </p>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t border-slate-50">
                    <button onClick={() => window.location.reload()} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition flex items-center justify-center gap-2">
                        <ArrowsClockwise weight="bold"/> ลองโหลดหน้าใหม่
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}