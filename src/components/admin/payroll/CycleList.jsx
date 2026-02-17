import React from 'react';
import {
    Money, Users, PencilSimple, ArrowRight, Check, Plus, Gear
} from '@phosphor-icons/react';
import { CycleListSkeleton } from './PayrollSkeleton';
import { EmptyState } from './EmptyState';

export const CycleList = ({
    cycles,
    totals,
    onCreateCycle,
    onSelectCycle,
    isLoading
}) => {
    if (isLoading) return <CycleListSkeleton />;

    const activeDraft = cycles.find(c => c.status === 'draft');
    const history = cycles.filter(c => c.status !== 'draft');

    const fmt = (n) => (n || 0).toLocaleString();

    // Helper to format cycle display
    const formatCycle = (cycle) => {
        const [year, month] = (cycle.month || '2026-01').split('-');
        const periodMap = { 'full': 'ทั้งเดือน', 'first': 'ครึ่งเดือนแรก', 'second': 'ครึ่งเดือนหลัง' };

        // Calculate dates (Approximate for display if not saved)
        let dates = "";
        const mObj = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthName = mObj.toLocaleDateString('th-TH', { month: 'short' });
        const yearThai = parseInt(year) + 543;

        if (cycle.period === 'first') dates = `1 - 15 ${monthName} ${yearThai}`;
        else if (cycle.period === 'second') {
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            dates = `16 - ${lastDay} ${monthName} ${yearThai}`;
        } else {
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            dates = `1 - ${lastDay} ${monthName} ${yearThai}`;
        }

        return {
            title: `งวดเดือน ${month} (${periodMap[cycle.period] || 'ทั้งเดือน'})`,
            subtitle: `${dates} • ทั้งหมด` // assuming 'All' employees for now
        };
    };

    return (
        <div className="animate-fade-in pb-32"> {/* Increased padding bottom for FAB */}
            {/* Header */}
            <header className="sticky top-0 z-40 px-5 pt-4 pb-4 bg-[#F2F2F7]/95 backdrop-blur-xl border-b border-black/5 transition-all">
                <div className="max-w-2xl mx-auto w-full flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-black tracking-tight">รอบเงินเดือน</h1>
                    <button className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-500 hover:text-black transition-colors active:scale-95">
                        <Gear weight="bold" size={20} />
                    </button>
                </div>
            </header>

            <main className="px-5 pt-6 w-full max-w-2xl mx-auto">

                {/* Dashboard Overview */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    <div className="bg-black text-white p-5 rounded-[20px] shadow-lg shadow-black/10 relative overflow-hidden group transition-transform hover:scale-[1.02]">
                        <div className="absolute right-0 top-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity">
                            <Money size={48} weight="fill" />
                        </div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase mb-1 tracking-wide">ยอดจ่ายปีนี้ (YTD)</p>
                        <h2 className="text-3xl font-display font-bold tracking-tight">฿{totals.ytdTotal >= 1000000 ? (totals.ytdTotal / 1000000).toFixed(1) + 'M' : fmt(totals.ytdTotal)}</h2>
                    </div>
                    <div className="bg-white p-5 rounded-[20px] shadow-sm border border-gray-100 transition-transform hover:scale-[1.02]">
                        <p className="text-[11px] font-bold text-gray-400 uppercase mb-1 tracking-wide">พนักงานทั้งหมด</p>
                        <div className="flex items-end gap-2">
                            <h2 className="text-3xl font-display font-bold text-black tracking-tight">{totals.staffCount}</h2>
                            <span className="text-sm text-gray-500 mb-1.5 font-medium">คน</span>
                        </div>
                    </div>
                </div>

                {/* Active Draft Card */}
                <div className="mb-10">
                    <h2 className="text-xs font-bold text-gray-400 uppercase mb-4 ml-1">กำลังดำเนินการ (Active)</h2>

                    {activeDraft ? (
                        (() => {
                            const info = formatCycle(activeDraft);
                            return (
                                <div
                                    onClick={() => onSelectCycle(activeDraft)}
                                    className="bg-white rounded-[24px] p-6 shadow-sm border border-blue-100 relative overflow-hidden group cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                                >
                                    <div className="absolute top-6 right-6">
                                        <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1.5 rounded-full tracking-wide">DRAFT</span>
                                    </div>
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                            <PencilSimple size={24} weight="fill" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xl text-gray-900 group-hover:text-blue-600 transition-colors">{info.title}</h3>
                                            <p className="text-sm text-gray-500 mt-1">{info.subtitle}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">ESTIMATED TOTAL</p>
                                        <div className="flex justify-between items-end">
                                            <p className="text-3xl font-display font-bold text-gray-900 tracking-tight">฿{fmt(activeDraft.summary.totalNet)}</p>
                                            <button className="bg-black text-white px-6 py-2.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 group-hover:bg-gray-800 transition-colors">
                                                จัดการ <ArrowRight weight="bold" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()
                    ) : (
                        <div className="text-center py-10 bg-white/50 rounded-[24px] border border-dashed border-gray-300">
                            <EmptyState
                                title="ไม่มีรอบที่กำลังดำเนินการ"
                                message="สร้างรอบบัญชีใหม่เพื่อเริ่มจ่ายเงินเดือน"
                                onAction={onCreateCycle}
                                actionLabel="เปิดรอบใหม่"
                            />
                        </div>
                    )}
                </div>

                {/* History List */}
                <div>
                    <h2 className="text-xs font-bold text-gray-400 uppercase mb-4 ml-1">ประวัติย้อนหลัง (History)</h2>
                    <div className="space-y-4">
                        {history.length > 0 ? history.map(cycle => {
                            const info = formatCycle(cycle);
                            return (
                                <div
                                    key={cycle.id}
                                    onClick={() => onSelectCycle(cycle)}
                                    className="bg-white p-5 rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between cursor-pointer hover:shadow-md hover:border-green-100 border border-transparent transition-all active:scale-[0.99]"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                            <Check size={20} weight="bold" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-base text-gray-900">{info.title}</h3>
                                            <p className="text-xs text-gray-400 mt-0.5">{info.subtitle}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-gray-900">฿{fmt(cycle.summary.totalPaid)}</p>
                                        <span className="text-xs text-gray-400">{cycle.summary.count} คน</span>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="py-12 text-center bg-gray-50 rounded-[20px]">
                                <p className="text-sm text-gray-400 font-medium">ยังไม่มีประวัติการจ่ายเงิน</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Fab - Positioned higher to match design & reset z-index context */}
            <div className="fixed bottom-24 left-0 right-0 z-[100] flex justify-center pointer-events-none">
                <button
                    onClick={onCreateCycle}
                    className="pointer-events-auto bg-[#007AFF] text-white pl-8 pr-10 py-4 rounded-full font-bold shadow-2xl shadow-blue-500/30 flex items-center gap-3 hover:scale-105 active:scale-95 hover:bg-blue-600 transition-all ring-4 ring-white/20 backdrop-blur-md"
                >
                    <div className="bg-white/20 w-8 h-8 flex items-center justify-center rounded-full"><Plus size={20} weight="bold" /></div>
                    <span className="text-lg">เปิดรอบจ่ายใหม่</span>
                </button>
            </div>
        </div>
    );
};
