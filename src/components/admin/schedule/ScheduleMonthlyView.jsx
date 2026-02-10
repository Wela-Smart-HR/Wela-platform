import React from 'react';
import { CaretLeft, CaretRight, CalendarBlank, Copy, User } from '@phosphor-icons/react';

// --- HELPER: Timezone Fix ---
const formatDateLocal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function ScheduleMonthlyView({
    currentDate, changeMonth, handleAutoSchedule, loading,
    changeDay, setViewMode, onDateSelect,
    daysInMonth, firstDayOfMonth, schedules, activeEmployees = []
}) {
    // Optimization: Create a Set of active user IDs for fast lookup
    const activeUserIds = new Set(activeEmployees.map(e => e.id));

    return (
        <div className="animate-fade-in-up">
            <div className="flex flex-col gap-3 mb-6">
                <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                    <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400"><CaretLeft weight="bold" /></button>
                    <div className="flex items-center gap-2"><CalendarBlank weight="fill" className="text-slate-400" /><span className="font-bold text-slate-800 text-sm">{currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</span></div>
                    <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400"><CaretRight weight="bold" /></button>
                </div>
                <button onClick={handleAutoSchedule} disabled={loading} className="w-full flex items-center justify-center gap-1.5 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 text-[10px] font-bold shadow-sm active:scale-95 transition hover:border-blue-300 hover:text-blue-600"><Copy weight="bold" size={16} /> {loading ? 'กำลังสร้าง...' : 'สร้างตารางอัตโนมัติ (Auto)'}</button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
                <div className="grid grid-cols-7 gap-2 mb-3 text-center">{['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => <div key={d} className="text-[10px] font-bold text-slate-400">{d}</div>)}</div>
                <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                    {[...Array(firstDayOfMonth)].map((_, i) => <div key={`empty-${i}`} className="min-h-[85px]"></div>)}

                    {[...Array(daysInMonth)].map((_, i) => {
                        const day = i + 1;
                        const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        const dateStr = formatDateLocal(targetDate);

                        const daySchedules = schedules.filter(s => s.date === dateStr && activeUserIds.has(s.userId));

                        const workShifts = daySchedules.filter(s => s.type === 'work');
                        const leaveShifts = daySchedules.filter(s => s.type === 'leave');
                        const offShifts = daySchedules.filter(s => s.type === 'off');

                        const isHoliday = daySchedules.some(s => s.type === 'holiday');
                        const hasShifts = workShifts.length > 0 || leaveShifts.length > 0 || offShifts.length > 0;

                        const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

                        return (
                            <div
                                key={day}
                                onClick={() => {
                                    if (onDateSelect) {
                                        onDateSelect(targetDate);
                                    } else {
                                        changeDay(day);
                                        setViewMode('daily');
                                    }
                                }}
                                className={`min-h-[85px] p-1 rounded-lg border text-xs relative cursor-pointer transition hover:bg-slate-50 active:scale-95 flex flex-col justify-start items-stretch gap-0.5 ${currentDate.getMonth() !== targetDate.getMonth() ? 'opacity-30' : ''} ${isHoliday ? 'bg-rose-50/30 border-rose-100' : 'bg-white border-slate-100 hover:border-blue-300'}`}
                            >
                                {/* Date Number */}
                                <div className="flex justify-center mb-0.5">
                                    <div className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${isToday ? 'bg-blue-600 text-white shadow-sm font-bold' : hasShifts ? 'text-slate-700 font-bold' : 'text-slate-400'}`}>
                                        {day}
                                    </div>
                                </div>

                                {/* Event Bars */}
                                {!isHoliday && hasShifts && (
                                    <>
                                        {workShifts.length > 0 && (
                                            <div className="bg-blue-500 text-white h-4 rounded text-[8px] font-medium truncate flex items-center justify-center gap-1 shadow-sm leading-none px-1">
                                                <span>{workShifts.length} คน</span>
                                            </div>
                                        )}
                                        {leaveShifts.length > 0 && (
                                            <div className="bg-orange-400 text-white h-4 rounded text-[8px] font-medium truncate flex items-center justify-center gap-1 shadow-sm leading-none px-1">
                                                <span>{leaveShifts.length} ลา</span>
                                            </div>
                                        )}
                                        {offShifts.length > 0 && (
                                            <div className="bg-slate-100 text-slate-400 h-4 rounded text-[8px] font-medium truncate flex items-center justify-center gap-1 border border-slate-200 leading-none px-1">
                                                <span>{offShifts.length} หยุด</span>
                                            </div>
                                        )}
                                    </>
                                )}

                                {isHoliday && (
                                    <div className="bg-rose-400 text-white h-4 rounded text-[8px] font-bold text-center mt-auto shadow-sm flex items-center justify-center">
                                        ปิด
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
