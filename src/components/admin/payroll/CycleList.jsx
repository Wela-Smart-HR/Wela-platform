import React from 'react';
import {
    Money, Users, PencilSimple, ArrowRight, Check, Plus, Gear
} from '@phosphor-icons/react';

export const CycleList = ({
    cycles,
    totals,
    onCreateCycle,
    onSelectCycle
}) => {
    const activeDraft = cycles.find(c => c.status === 'draft');
    const history = cycles.filter(c => c.status !== 'draft');

    const fmt = (n) => (n || 0).toLocaleString();

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <header className="sticky top-0 z-40 px-5 pt-4 pb-4 bg-[#F2F2F7]/95 backdrop-blur-xl border-b border-black/5">
                <div className="max-w-2xl mx-auto w-full flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-black">รอบเงินเดือน</h1>
                    <button className="w-9 h-9 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-500 hover:text-black transition-colors">
                        <Gear weight="bold" />
                    </button>
                </div>
            </header>

            <main className="px-5 pt-6 w-full max-w-2xl mx-auto">

                {/* Dashboard Overview */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-black text-white p-4 rounded-2xl shadow-lg relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-3 opacity-20 group-hover:opacity-30 transition-opacity">
                            <Money size={40} weight="fill" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">ยอดจ่ายปีนี้ (YTD)</p>
                        <h2 className="text-2xl font-display font-bold">฿{fmt(totals.ytdTotal)}</h2>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">พนักงานทั้งหมด</p>
                        <div className="flex items-end gap-2">
                            <h2 className="text-2xl font-display font-bold text-black">{totals.staffCount}</h2>
                            <span className="text-xs text-gray-500 mb-1">คน</span>
                        </div>
                    </div>
                </div>

                {/* Active Draft Card */}
                <div className="mb-8">
                    <h2 className="text-xs font-bold text-gray-400 uppercase mb-3 ml-1">กำลังดำเนินการ (Active)</h2>

                    {activeDraft ? (
                        <div
                            onClick={() => onSelectCycle(activeDraft)}
                            className="bg-white rounded-2xl p-5 shadow-sm border border-blue-500/30 relative overflow-hidden group cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                        >
                            <div className="absolute top-0 right-0 p-3">
                                <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-lg">DRAFT</span>
                            </div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                    <PencilSimple size={20} weight="fill" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">{activeDraft.title}</h3>
                                    <p className="text-xs text-gray-500">{activeDraft.periodLabel}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Estimated Total</p>
                                    <p className="text-xl font-display font-bold text-gray-900">฿{fmt(activeDraft.summary.totalNet)}</p>
                                </div>
                                <button className="bg-black text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 group-hover:bg-gray-800 transition-colors">
                                    จัดการ <ArrowRight weight="bold" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                            <p className="text-sm text-gray-400">ไม่มีรายการค้าง</p>
                        </div>
                    )}
                </div>

                {/* History List */}
                <div>
                    <h2 className="text-xs font-bold text-gray-400 uppercase mb-3 ml-1">ประวัติย้อนหลัง (History)</h2>
                    <div className="space-y-3">
                        {history.length > 0 ? history.map(cycle => (
                            <div
                                key={cycle.id}
                                onClick={() => onSelectCycle(cycle)}
                                className="bg-white p-4 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                        <Check size={18} weight="bold" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm text-gray-900">{cycle.title}</h3>
                                        <p className="text-[10px] text-gray-400">{cycle.periodLabel}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-gray-900">฿{fmt(cycle.summary.totalPaid)}</p>
                                    <span className="text-[10px] text-gray-400">{cycle.summary.count} คน</span>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-xs text-gray-400 italic py-4">ยังไม่มีประวัติการจ่ายเงิน</p>
                        )}
                    </div>
                </div>
            </main>

            {/* Fab */}
            <div className="fixed bottom-10 left-0 right-0 z-30 flex justify-center pointer-events-none">
                <button
                    onClick={onCreateCycle}
                    className="pointer-events-auto bg-blue-600 text-white pl-6 pr-8 py-4 rounded-full font-bold shadow-2xl shadow-blue-500/40 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all"
                >
                    <div className="bg-white/20 p-1 rounded-full"><Plus size={20} weight="bold" /></div>
                    <span className="text-lg">เปิดรอบจ่ายใหม่</span>
                </button>
            </div>
        </div>
    );
};
