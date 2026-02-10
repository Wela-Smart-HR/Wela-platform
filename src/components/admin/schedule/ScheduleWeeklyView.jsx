import React, { useMemo } from 'react';
import { CaretLeft, CaretRight, CalendarBlank, ArrowUUpLeft, PencilSimple, Plus } from '@phosphor-icons/react';

// Helper: Format Date for Key (YYYY-MM-DD)
const formatDateLocal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function ScheduleWeeklyView({
    weekStart, changeWeek, setWeekStart, resetToStandardMonday,
    schedules, openEditModal
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
                isDifferentMonth: tempDate.getMonth() !== weekStart.getMonth()
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
        // Collect all unique users from schedules this week + maybe all users?
        // Ideally we should list ALL users, but for now let's list users who have shifts OR just derive from props if we had a full user list.
        // Since we only have 'schedules' which might be sparse, we might miss users who have NO shifts in this range 
        // unless we passed 'allUsers' to this component. 
        // For now, let's extract unique users from the `schedules` prop (which contains monthly data).

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

    const getShiftColor = (type) => {
        switch (type) {
            case 'work': return 'bg-blue-500';
            case 'leave': return 'bg-orange-400';
            case 'holiday': return 'bg-rose-400';
            default: return 'bg-slate-300';
        }
    };

    return (
        <div className="animate-fade-in-up pb-20">
            {/* Header Controls */}
            <div className="bg-white sticky top-0 z-10 shadow-sm border-b border-slate-100 -mx-6 px-6 pt-3 pb-4 mb-4">
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
                            <ArrowUUpLeft weight="bold" /> กลับไปวันจันทร์
                        </button>
                    )}
                </div>

                <div className="bg-slate-50 p-1 rounded-xl flex items-center justify-between border border-slate-200">
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
                                {weekDays[0].date} {weekDays[0].dayName} - {weekDays[6].date} {weekDays[6].dayName}
                            </span>
                            <PencilSimple className="text-slate-300 group-hover:text-blue-400" size={12} weight="bold" />
                        </div>
                    </div>

                    <button onClick={() => changeWeek(1)} className="w-10 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 active:scale-95 transition hover:text-blue-600">
                        <CaretRight weight="bold" />
                    </button>
                </div>

                <div className="grid grid-cols-7 text-center mt-3">
                    {weekDays.map(day => (
                        <div key={day.dateStr} className="flex flex-col items-center">
                            <span className={`text-[9px] font-bold uppercase mb-1 ${day.isWeekend ? 'text-rose-400' : 'text-slate-400'}`}>
                                {day.dayName}
                            </span>
                            <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full transition ${day.isToday ? 'bg-blue-600 text-white shadow-md scale-110' : (day.isDifferentMonth ? 'text-slate-300' : 'text-slate-700 bg-slate-100')}`}>
                                {day.date}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Staff Grid */}
            <div className="space-y-3">
                {usersWithShifts.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">ไม่พบข้อมูลพนักงานที่มีตารางงานในช่วงนี้</div>
                ) : (
                    usersWithShifts.map(staff => (
                        <div key={staff.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <img src={staff.avatar} className="w-8 h-8 rounded-full border border-white shadow-sm" alt={staff.name} />
                                    <div>
                                        <div className="font-bold text-xs text-slate-900">{staff.name}</div>
                                        <div className="text-[9px] text-slate-400">{staff.role}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-2">
                                <div className="flex gap-1 h-12">
                                    {weekDays.map(day => {
                                        const dayShifts = getShifts(staff.id, day.dateStr);
                                        const hasShift = dayShifts.length > 0;

                                        // Mock Staff Object for Modal (Since we iterate user id, we need to reconstruct staff obj)
                                        const staffObjForModal = { ...staff, id: hasShift ? dayShifts[0].id : null, userId: staff.id }; // Simplified

                                        return (
                                            <button
                                                key={day.dateStr}
                                                // If existing shift, open edit. If empty, create new (we need logic for create new from empty cell)
                                                // For now, let's open modal with partial data
                                                onClick={() => openEditModal({
                                                    id: hasShift ? dayShifts[0].id : null, // If null, modal should handle 'create new' logic? 
                                                    // Wait, existing modal expects a docId to update. 
                                                    // To support "Add New", we might need to update EditShiftModal or create a temp doc ID?
                                                    // For this iteration, let's supporting editing existing shifts first. 
                                                    // To support adding, we need a "Create Mode".
                                                    // Let's pass a special object or handle it in the hook.
                                                    // For safety, let's only allow editing existing ones for now OR 
                                                    // pass the necessary context to create one.
                                                    // The user request prototype used a simple logic "addShift".
                                                    // Our current hook `openEditModal` expects a full firestore doc object usually.

                                                    // Correct approach: If no shift, pass a stub object
                                                    ...staff,
                                                    id: hasShift ? dayShifts[0].id : 'new', // Flag for new?
                                                    date: day.dateStr,
                                                    type: hasShift ? dayShifts[0].type : 'off', // Default to off?
                                                    startTime: hasShift ? dayShifts[0].startTime : '-',
                                                    endTime: hasShift ? dayShifts[0].endTime : '-',
                                                    otHours: hasShift ? dayShifts[0].otHours : 0
                                                })}
                                                className={`flex-1 rounded-lg border relative overflow-hidden active:scale-95 transition-all duration-200 ${hasShift ? 'bg-white border-slate-200' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}
                                            >
                                                {!hasShift && (
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                        <Plus className="text-slate-400" weight="bold" />
                                                    </div>
                                                )}

                                                {hasShift && (
                                                    <div className="w-full h-full flex flex-col gap-[1px] p-[2px]">
                                                        {dayShifts.map((shift, idx) => (
                                                            <div key={idx} className={`flex-1 rounded-sm w-full shadow-sm ${getShiftColor(shift.type)}`} title={`${shift.startTime}-${shift.endTime}`}></div>
                                                        ))}
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
