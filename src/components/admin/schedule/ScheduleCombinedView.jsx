import React, { useMemo } from 'react';
import {
    CaretLeft, CaretRight, CalendarBlank, ArrowUUpLeft, PencilSimple, Plus,
    Clock, Gift, WarningOctagon, Moon, AirplaneTilt
} from '@phosphor-icons/react';

// Helper: Format Date for Key (YYYY-MM-DD)
const formatDateLocal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function ScheduleCombinedView({
    weekStart, changeWeek, setWeekStart, resetToStandardMonday,
    schedules, openEditModal, currentDate, changeDay, onDaySelect
}) {
    // Generate Week Days Array
    const weekDays = useMemo(() => {
        const days = [];
        let tempDate = new Date(weekStart);
        const todayStr = formatDateLocal(new Date());

        for (let i = 0; i < 7; i++) {
            const dateStr = formatDateLocal(tempDate);
            days.push({
                date: tempDate.getDate(),
                dayName: tempDate.toLocaleDateString('th-TH', { weekday: 'short' }),
                dateStr: dateStr,
                isWeekend: (tempDate.getDay() === 0 || tempDate.getDay() === 6),
                isToday: dateStr === todayStr,
                isDifferentMonth: tempDate.getMonth() !== weekStart.getMonth(),
                fullDate: new Date(tempDate)
            });
            tempDate.setDate(tempDate.getDate() + 1);
        }
        return days;
    }, [weekStart]);

    // Check if current view is standard Monday
    const isStandardMonday = useMemo(() => {
        const d = new Date(weekStart);
        return d.getDay() === 1;
    }, [weekStart]);

    // Group Shifts by User
    const usersWithShifts = useMemo(() => {
        const userMap = new Map();
        schedules.forEach(s => {
            if (!userMap.has(s.userId)) {
                userMap.set(s.userId, {
                    id: s.userId,
                    name: s.userName || 'Unknown',
                    role: s.userRole || 'Employee',
                    avatar: s.userAvatar || `https://ui-avatars.com/api/?name=${s.userName}`
                });
            }
        });
        return Array.from(userMap.values());
    }, [schedules]);

    // Get Shifts helper
    const getShifts = (userId, dateStr) => {
        return schedules.filter(s => s.userId === userId && s.date === dateStr);
    };

    // Helper: Resolve Color Class from Shift Color ID
    const resolveColor = (colorId, type) => {
        if (type === 'leave') return 'bg-orange-50 border-orange-100 text-orange-700';
        if (type === 'holiday') return 'bg-rose-50 border-rose-100 text-rose-700';
        if (type === 'off') return 'bg-slate-50 border-slate-100 text-slate-300';

        // Work Colors
        switch (colorId) {
            case 'blue': return 'bg-blue-50 border-blue-200 text-blue-700';
            case 'emerald': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
            case 'orange': return 'bg-orange-50 border-orange-200 text-orange-700';
            case 'purple': return 'bg-purple-50 border-purple-200 text-purple-700';
            case 'rose': return 'bg-rose-50 border-rose-200 text-rose-700';
            case 'slate': return 'bg-slate-100 border-slate-300 text-slate-700';
            default: return 'bg-blue-50 border-blue-200 text-blue-700';
        }
    };

    return (
        <div className="animate-fade-in-up pb-10">
            {/* Header Controls & Week Navigation */}
            <div className="bg-white sticky top-0 z-20 shadow-sm border-b border-slate-100 -mx-6 px-4 pt-3 pb-2 mb-4">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                        <CalendarBlank className="text-blue-600" weight="fill" />
                        {weekDays[0].dateStr} - {weekDays[6].dateStr}
                    </h2>

                    {!isStandardMonday && (
                        <button
                            onClick={resetToStandardMonday}
                            className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-slate-200 transition"
                        >
                            <ArrowUUpLeft weight="bold" /> กลับจันทร์
                        </button>
                    )}
                </div>

                <div className="bg-slate-50 p-1 rounded-xl flex items-center justify-between border border-slate-200 mb-3">
                    <button onClick={() => changeWeek(-1)} className="w-10 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 active:scale-95 transition hover:text-blue-600">
                        <CaretLeft weight="bold" />
                    </button>

                    <div className="flex-1 mx-2 relative group cursor-pointer">
                        <input
                            type="date"
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                            onChange={(e) => e.target.value && setWeekStart(new Date(e.target.value))}
                        />
                        <div className="h-9 bg-white rounded-lg border border-transparent group-hover:border-blue-200 flex items-center justify-center gap-2 transition shadow-inner">
                            <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600">
                                {weekDays[0].dayName} {weekDays[0].date} - {weekDays[6].dayName} {weekDays[6].date}
                            </span>
                            <PencilSimple className="text-slate-300 group-hover:text-blue-400" size={12} weight="bold" />
                        </div>
                    </div>

                    <button onClick={() => changeWeek(1)} className="w-10 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 active:scale-95 transition hover:text-blue-600">
                        <CaretRight weight="bold" />
                    </button>
                </div>

                {/* Date Strip Header */}
                <div className="grid grid-cols-[70px_1fr] gap-2">
                    <div className="flex items-end pb-2 justify-center">
                        <span className="text-[10px] font-bold text-slate-400">ทีม ({usersWithShifts.length})</span>
                    </div>
                    <div className="grid grid-cols-7 text-center">
                        {weekDays.map(day => (
                            <div
                                key={day.dateStr}
                                className="flex flex-col items-center gap-1 group cursor-pointer active:scale-95 transition"
                                onClick={() => onDaySelect && onDaySelect(day.fullDate)}
                            >
                                <span className={`text-[8px] font-bold uppercase ${day.isWeekend ? 'text-rose-400' : 'text-slate-400'}`}>
                                    {day.dayName}
                                </span>
                                <div className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-bold transition-all ${day.isToday ? 'bg-blue-600 text-white shadow-md scale-110' : 'bg-slate-50 text-slate-600 hover:bg-blue-100 hover:text-blue-600'}`}>
                                    {day.date}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Staff Rows */}
            <div className="space-y-3 px-1">
                {usersWithShifts.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 mx-auto max-w-xs">
                        <WarningOctagon size={48} className="text-slate-300 mx-auto mb-3" weight="duotone" />
                        <p className="text-slate-400 text-sm font-bold">ไม่พบตารางงาน</p>
                    </div>
                ) : (
                    usersWithShifts.map(staff => (
                        <div key={staff.id} className="flex gap-2 items-stretch group">
                            {/* Left: Staff Profile (Compact) */}
                            <div className="w-[70px] shrink-0 bg-white rounded-xl p-1.5 border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden">
                                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition"></div>
                                <img src={staff.avatar} className="w-8 h-8 rounded-full border border-slate-100 shadow-sm mb-1 object-cover bg-slate-50" alt={staff.name} />
                                <div className="leading-tight w-full overflow-hidden">
                                    <div className="font-bold text-[9px] text-slate-700 truncate w-full">{staff.name.split(' ')[0]}</div>
                                </div>
                            </div>

                            {/* Right: 7-Day Grid */}
                            <div className="flex-1 grid grid-cols-7 gap-1">
                                {weekDays.map(day => {
                                    const dayShifts = getShifts(staff.id, day.dateStr);
                                    const hasShift = dayShifts.length > 0;
                                    const shift = hasShift ? dayShifts[0] : null;

                                    return (
                                        <div
                                            key={`${staff.id}-${day.dateStr}`}
                                            className={`rounded-lg border flex flex-col items-center justify-center cursor-pointer transition relative overflow-hidden group/cell ${hasShift
                                                ? resolveColor(shift.color, shift.type)
                                                : 'bg-slate-50 border-dashed border-slate-200 hover:bg-slate-100'
                                                }`}
                                            onClick={() => openEditModal({
                                                id: `${staff.id}_${day.dateStr}`,
                                                userId: staff.id,
                                                userName: staff.name,
                                                date: day.dateStr,
                                                ...shift // Spread existing shift data if any
                                            })}
                                        >
                                            {hasShift ? (
                                                <>
                                                    {shift.type === 'work' ? (
                                                        <>
                                                            <div className="text-[10px] font-bold uppercase tracking-wide">
                                                                {shift.shiftCode || 'WORK'}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="text-[9px] font-bold">{shift.type === 'leave' ? 'ลา' : 'หยุด'}</div>
                                                    )}

                                                    {/* Indicators */}
                                                    <div className="absolute top-0.5 right-0.5 flex flex-col gap-0.5">
                                                        {shift.otHours > 0 && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" title={`OT ${shift.otHours} ชม.`} />}
                                                        {shift.incentive > 0 && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-sm" title={`พิเศษ ${shift.incentive} บ.`} />}
                                                        {shift.note && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-sm" title={shift.note} />}
                                                    </div>
                                                </>
                                            ) : (
                                                <Plus className="text-slate-200 opacity-0 group-hover/cell:opacity-100 transition" weight="bold" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
