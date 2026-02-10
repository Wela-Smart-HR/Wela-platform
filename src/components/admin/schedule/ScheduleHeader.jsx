import React from 'react';

export default function ScheduleHeader({ viewMode, setViewMode }) {
    return (
        <header className="px-6 pt-6 pb-2 z-20 bg-[#FAFAFA]/90 backdrop-blur-sm sticky top-0">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-slate-800">ตารางงาน</h1>
                <div className="flex gap-1 bg-white p-1 rounded-full shadow-sm border border-slate-100">
                    <button
                        onClick={() => setViewMode('daily')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === 'daily' ? 'bg-slate-900 text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        รายวัน
                    </button>
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === 'monthly' ? 'bg-slate-900 text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        รายเดือน
                    </button>
                </div>
            </div>
        </header>
    );
}
