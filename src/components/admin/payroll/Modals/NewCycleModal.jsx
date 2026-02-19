import React, { useState } from 'react';
import {
    CalendarPlus, Clock, MinusCircle, ArrowRight
} from '@phosphor-icons/react';

export const NewCycleModal = ({ isOpen, onClose, onCreate }) => {
    const [form, setForm] = useState({
        month: new Date().toISOString().slice(0, 7),
        period: 'full',
        target: 'all',
        syncOT: true,
        syncDeduct: true
    });

    if (!isOpen) return null;

    const handleSubmit = async () => {
        // Validate: Check if the period has ended yet
        const [year, month] = form.month.split('-').map(Number);
        let endDay;
        if (form.period === 'first') {
            endDay = new Date(year, month - 1, 15); // 15th
        } else if (form.period === 'second') {
            endDay = new Date(year, month, 0); // Last day of month
        } else {
            endDay = new Date(year, month, 0); // Last day of month
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (endDay > today) {
            const { default: Swal } = await import('sweetalert2');
            const result = await Swal.fire({
                icon: 'warning',
                title: 'รอบยังไม่สิ้นสุด',
                html: `<p class="text-sm">วันสิ้นสุดรอบ: <strong>${endDay.toLocaleDateString('th-TH', { dateStyle: 'long' })}</strong></p>
                       <p class="text-sm text-gray-500 mt-1">ข้อมูลอาจไม่ครบถ้วน เนื่องจากยังไม่ถึงวันสิ้นสุดรอบ</p>`,
                showCancelButton: true,
                confirmButtonText: 'สร้างเลย',
                cancelButtonText: 'ยกเลิก',
                confirmButtonColor: '#2563EB',
                cancelButtonColor: '#ef4444',
                customClass: { popup: 'rounded-3xl', confirmButton: 'rounded-xl', cancelButton: 'rounded-xl' }
            });
            if (!result.isConfirmed) return;
        }

        onCreate(form);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4 text-left animate-fade-in">
            <div className="absolute inset-0" onClick={onClose}></div>
            <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-6 pb-8 shadow-2xl relative flex flex-col max-h-[90vh] animate-slide-up">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6 shrink-0"></div>

                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <CalendarPlus className="text-blue-600" weight="fill" /> ตั้งค่ารอบบิลใหม่
                </h2>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
                    {/* Month Selection */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">เดือนที่จ่าย</label>
                        <input
                            type="month"
                            value={form.month}
                            onChange={e => setForm({ ...form, month: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-black outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                        />
                    </div>

                    {/* Period Selection */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">ช่วงเวลา</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['first', 'second', 'full'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setForm({ ...form, period: p })}
                                    className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${form.period === p ? 'bg-black text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500'}`}
                                >
                                    <span className="text-xs font-bold">
                                        {p === 'first' ? 'งวดแรก' : (p === 'second' ? 'งวดสอง' : 'ทั้งเดือน')}
                                    </span>
                                    <span className="text-[9px] opacity-70">
                                        {p === 'first' ? '1 - 15' : (p === 'second' ? '16 - End' : 'Full')}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Target Selection */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">กลุ่มเป้าหมาย</label>
                        <div className="space-y-2">
                            <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${form.target === 'all' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                                <input type="radio" name="target" value="all" checked={form.target === 'all'} onChange={() => setForm({ ...form, target: 'all' })} className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-bold text-gray-900">ทุกคน (All)</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer ${form.target === 'daily' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                                    <input type="radio" name="target" value="daily" checked={form.target === 'daily'} onChange={() => setForm({ ...form, target: 'daily' })} className="w-4 h-4 text-blue-600" />
                                    <span className="text-xs font-bold text-gray-700">รายวัน</span>
                                </label>
                                <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer ${form.target === 'monthly' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                                    <input type="radio" name="target" value="monthly" checked={form.target === 'monthly'} onChange={() => setForm({ ...form, target: 'monthly' })} className="w-4 h-4 text-blue-600" />
                                    <span className="text-xs font-bold text-gray-700">รายเดือน</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-600 flex items-center gap-2">
                                <Clock className="text-blue-600" weight="fill" /> ดึงค่า OT อัตโนมัติ
                            </span>
                            <div
                                onClick={() => setForm({ ...form, syncOT: !form.syncOT })}
                                className={`relative inline-block w-10 h-6 transition rounded-full cursor-pointer ${form.syncOT ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                                <span className={`absolute left-1 bottom-1 w-4 h-4 bg-white rounded-full transition-transform ${form.syncOT ? 'translate-x-4' : 'translate-x-0'}`}></span>
                            </div>
                        </div>
                        <div className="h-px bg-gray-200 w-full"></div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-600 flex items-center gap-2">
                                <MinusCircle className="text-red-500" weight="fill" /> ดึงรายการหัก (Daily Log)
                            </span>
                            <div
                                onClick={() => setForm({ ...form, syncDeduct: !form.syncDeduct })}
                                className={`relative inline-block w-10 h-6 transition rounded-full cursor-pointer ${form.syncDeduct ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                                <span className={`absolute left-1 bottom-1 w-4 h-4 bg-white rounded-full transition-transform ${form.syncDeduct ? 'translate-x-4' : 'translate-x-0'}`}></span>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg shadow-lg mt-6 flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors active:scale-[0.98]"
                >
                    <span>เริ่มคำนวณ</span>
                    <ArrowRight weight="bold" />
                </button>
            </div>
        </div>
    );
};
