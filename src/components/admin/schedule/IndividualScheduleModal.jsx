import React from 'react';
import { X, User } from '@phosphor-icons/react';
import ScheduleMonthlyView from './ScheduleMonthlyView';

export default function IndividualScheduleModal({
    isOpen, onClose, employee,
    currentDate, changeMonth, schedules,
    handleAutoSchedule, loading, daysInMonth, firstDayOfMonth
}) {
    if (!isOpen || !employee) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="bg-[#FAFAFA] w-full max-w-4xl rounded-3xl shadow-2xl relative overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center z-10">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <img
                                src={employee.avatar || `https://ui-avatars.com/api/?name=${employee.name}`}
                                className="w-12 h-12 rounded-full border border-slate-100 shadow-sm object-cover"
                                alt={employee.name}
                            />
                            <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[10px] px-1.5 rounded-full border border-white font-bold">
                                {employee.position || 'Employee'}
                            </div>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                ปฏิทินงาน: {employee.name}
                            </h2>
                            <p className="text-xs text-slate-500">ดูตารางงานรายบุคคล</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
                        <X weight="bold" size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto no-scrollbar">
                    <ScheduleMonthlyView
                        currentDate={currentDate}
                        changeMonth={changeMonth}
                        handleAutoSchedule={null} // Disable auto-schedule in view-only mode usually, but kept prop if needed or null if hidden
                        loading={loading}
                        daysInMonth={daysInMonth}
                        firstDayOfMonth={firstDayOfMonth}
                        schedules={schedules} // Pass ALL schedules, filtering happens inside if we pass activeEmployees
                        activeEmployees={[employee]} // Force filter to THIS employee
                        changeDay={() => { }} // Disable day click navigation if desired, or keep it.
                        setViewMode={() => { }} // Disable view switching
                        onDateSelect={null}
                    />
                </div>
            </div>
        </div>
    );
}
