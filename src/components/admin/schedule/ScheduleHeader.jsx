import React from 'react';
import { Table, CalendarBlank, CaretLeft } from '@phosphor-icons/react';

export default function ScheduleHeader({ viewMode, setViewMode }) {
    return (
        <header className="px-6 pt-6 pb-2 z-20 bg-[#FAFAFA]/90 backdrop-blur-sm sticky top-0">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-slate-800">
                    {viewMode === 'monthly' ? 'ตารางงาน' : 'ตารางงาน'}
                </h1>

                {/* Navigation Controls */}
                {viewMode === 'daily' ? (
                    <button
                        onClick={() => setViewMode('weekly')}
                        className="bg-white text-slate-600 px-4 py-2 rounded-full border border-slate-200 shadow-sm text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition active:scale-95"
                    >
                        <CaretLeft weight="bold" /> กลับไปรายอาทิตย์
                    </button>
                ) : viewMode === 'weekly' ? (
                    <button
                        onClick={() => setViewMode('monthly')}
                        className="bg-white text-slate-600 px-4 py-2 rounded-full border border-slate-200 shadow-sm text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition active:scale-95"
                    >
                        <CaretLeft weight="bold" /> กลับไปปฏิทิน
                    </button>
                ) : (
                    <div className="flex gap-1 bg-white p-1 rounded-full shadow-sm border border-slate-100">
                        {/* Fallback toggles if needed, or just show nothing if we want pure drill-down. 
                             But keeping them allows manual switch if user enters directly. 
                             Actually, let's keep the simple toggle for 'monthly' view so they know they are in 'Calendar' mode 
                             and *could* switch to Table if they really wanted (though drill-down is primary).
                             
                             Wait, if I want strict Drill-down, 'Monthly' view shouldn't have a toggle to 'Weekly' without selecting a date?
                             Actually, "Table" view without a specific week selected defaults to "Current Week". That's fine.
                             Let's keep the toggle in Monthly view for flexibility.
                         */}
                        <button
                            onClick={() => setViewMode('weekly')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'weekly' ? 'bg-slate-900 text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Table weight="bold" />
                        </button>
                        <button
                            onClick={() => setViewMode('monthly')}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'monthly' ? 'bg-slate-900 text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <CalendarBlank weight="bold" />
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
