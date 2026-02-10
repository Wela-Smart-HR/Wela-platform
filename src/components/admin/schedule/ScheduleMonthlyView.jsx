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

// Helper: Resolve Color
const resolveShiftColor = (colorId) => {
    switch (colorId) {
        case 'blue': return 'bg-blue-500 text-white'; // Darker for monthly view visibility
        case 'emerald': return 'bg-emerald-500 text-white';
        case 'orange': return 'bg-orange-500 text-white';
        case 'purple': return 'bg-purple-500 text-white';
        case 'rose': return 'bg-rose-500 text-white';
        case 'slate': return 'bg-slate-500 text-white';
        default: return 'bg-blue-500 text-white';
    }
};

export default function ScheduleMonthlyView({
    currentDate, changeMonth, handleAutoSchedule, loading,
    changeDay, setViewMode, onDateSelect,
    daysInMonth, firstDayOfMonth, schedules = [], activeEmployees = []
}) {
    // Safety Checks
    const safeDate = currentDate instanceof Date ? currentDate : new Date();
    const safeDays = Number.isInteger(daysInMonth) && daysInMonth > 0 ? daysInMonth : new Date(safeDate.getFullYear(), safeDate.getMonth() + 1, 0).getDate();
    const safeFirstDay = Number.isInteger(firstDayOfMonth) && firstDayOfMonth >= 0 ? firstDayOfMonth : new Date(safeDate.getFullYear(), safeDate.getMonth(), 1).getDay();

    // Optimization: Create a Set of active user IDs for fast lookup
    const activeUserIds = new Set(activeEmployees.map(e => e.id));

    return (
        <div className="animate-fade-in-up">
            <div className="flex flex-col gap-3 mb-6">
                <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                    <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400"><CaretLeft weight="bold" /></button>
                    <div className="flex items-center gap-2"><CalendarBlank weight="fill" className="text-slate-400" /><span className="font-bold text-slate-800 text-sm">{safeDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</span></div>
                    <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400"><CaretRight weight="bold" /></button>
                </div>
                <button onClick={handleAutoSchedule} disabled={loading} className="w-full flex items-center justify-center gap-1.5 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 text-[10px] font-bold shadow-sm active:scale-95 transition hover:border-blue-300 hover:text-blue-600"><Copy weight="bold" size={16} /> {loading ? 'กำลังสร้าง...' : 'สร้างตารางอัตโนมัติ (Auto)'}</button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
                <div className="grid grid-cols-7 gap-2 mb-3 text-center">{['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => <div key={d} className="text-[10px] font-bold text-slate-400">{d}</div>)}</div>
                <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                    {[...Array(safeFirstDay)].map((_, i) => <div key={`empty-${i}`} className="min-h-[85px]"></div>)}

                    {[...Array(safeDays)].map((_, i) => {
                        const day = i + 1;
                        const targetDate = new Date(safeDate.getFullYear(), safeDate.getMonth(), day);
                        const dateStr = formatDateLocal(targetDate);

                        const daySchedules = schedules.filter(s => s.date === dateStr && activeUserIds.has(s.userId));

                        const workShifts = daySchedules.filter(s => s.type === 'work');
                        const leaveShifts = daySchedules.filter(s => s.type === 'leave');
                        const offShifts = daySchedules.filter(s => s.type === 'off');

                        const isHoliday = daySchedules.some(s => s.type === 'holiday');
                        const hasShifts = workShifts.length > 0 || leaveShifts.length > 0 || offShifts.length > 0;

                        const isToday = day === new Date().getDate() && safeDate.getMonth() === new Date().getMonth() && safeDate.getFullYear() === new Date().getFullYear();

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
                                className={`min-h-[85px] p-1 rounded-lg border text-xs relative cursor-pointer transition hover:bg-slate-50 active:scale-95 flex flex-col justify-start items-stretch gap-0.5 ${safeDate.getMonth() !== targetDate.getMonth() ? 'opacity-30' : ''} ${isHoliday ? 'bg-rose-50/30 border-rose-100' : 'bg-white border-slate-100 hover:border-blue-300'}`}
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
                                        {/* Work Shifts */}
                                        {workShifts.length > 0 && (
                                            activeUserIds.size === 1 ? (
                                                // Single User Mode: Show Shift Name & Color
                                                workShifts.map((shift, idx) => {
                                                    const colorClass = resolveShiftColor(shift.color || 'blue');
                                                    return (
                                                        <div key={idx} className={`${colorClass} h-4 rounded text-[9px] font-medium truncate flex items-center justify-center shadow-sm leading-none px-1 mb-0.5`} title={`${shift.name} (${shift.startTime}-${shift.endTime})`}>
                                                            {shift.name || shift.shiftCode || 'Shift'}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                // Admin Mode: Show Count
                                                <div className="bg-blue-500 text-white h-4 rounded text-[8px] font-medium truncate flex items-center justify-center gap-1 shadow-sm leading-none px-1">
                                                    <span>{workShifts.length} คน</span>
                                                </div>
                                            )
                                        )}

                                        {/* Leave Shifts */}
                                        {leaveShifts.length > 0 && (
                                            activeUserIds.size === 1 ? (
                                                leaveShifts.map((shift, idx) => (
                                                    <div key={idx} className="bg-orange-400 text-white h-4 rounded text-[9px] font-medium truncate flex items-center justify-center shadow-sm leading-none px-1">
                                                        {shift.name || 'ลา'}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="bg-orange-400 text-white h-4 rounded text-[8px] font-medium truncate flex items-center justify-center gap-1 shadow-sm leading-none px-1">
                                                    <span>{leaveShifts.length} ลา</span>
                                                </div>
                                            )
                                        )}

                                        {/* Off Shifts */}
                                        {offShifts.length > 0 && (
                                            activeUserIds.size === 1 ? (
                                                <div className="bg-slate-100 text-slate-400 h-4 rounded text-[9px] font-medium truncate flex items-center justify-center gap-1 border border-slate-200 leading-none px-1">
                                                    OFF
                                                </div>
                                            ) : (
                                                <div className="bg-slate-100 text-slate-400 h-4 rounded text-[8px] font-medium truncate flex items-center justify-center gap-1 border border-slate-200 leading-none px-1">
                                                    <span>{offShifts.length} หยุด</span>
                                                </div>
                                            )
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
