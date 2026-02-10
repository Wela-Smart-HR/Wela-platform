import React from 'react';
import { CaretLeft, CaretRight, CalendarBlank, Copy } from '@phosphor-icons/react';

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
    changeDay, setViewMode,
    daysInMonth, firstDayOfMonth, schedules
}) {
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
                    {[...Array(firstDayOfMonth)].map((_, i) => <div key={`empty-${i}`} className="aspect-square"></div>)}

                    {[...Array(daysInMonth)].map((_, i) => {
                        const day = i + 1;
                        const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        const dateStr = formatDateLocal(targetDate);

                        const workShifts = schedules.filter(s => s.date === dateStr && s.type === 'work');
                        const leaveShifts = schedules.filter(s => s.date === dateStr && s.type === 'leave');
                        const isHoliday = schedules.some(s => s.date === dateStr && s.type === 'holiday');

                        return (
                            <div key={day} onClick={() => { changeDay(day); setViewMode('daily'); }} className={`aspect-square rounded-xl flex flex-col items-center justify-center border text-xs font-bold relative cursor-pointer hover:border-blue-400 transition ${isHoliday ? 'bg-rose-50 border-rose-100 text-rose-400' : (workShifts.length > 0 || leaveShifts.length > 0) ? 'bg-white border-slate-100 text-slate-700' : 'bg-slate-50 border-transparent text-slate-300'}`}>
                                {day}
                                {!isHoliday && (
                                    <div className="flex gap-0.5 mt-1 justify-center flex-wrap px-1">
                                        {[...Array(Math.min(workShifts.length, 3))].map((_, idx) => <div key={`w-${idx}`} className="w-1 h-1 rounded-full bg-blue-500"></div>)}
                                        {[...Array(Math.min(leaveShifts.length, 3))].map((_, idx) => <div key={`l-${idx}`} className="w-1 h-1 rounded-full bg-orange-400"></div>)}
                                    </div>
                                )}
                                {isHoliday && <div className="text-[8px] mt-1 font-normal">ปิด</div>}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
