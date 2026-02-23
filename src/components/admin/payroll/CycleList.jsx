import React from 'react';
import {
    Money, Users, PencilSimple, ArrowRight, Check, Plus, CalendarBlank, CoinVertical, TrendUp, Wallet, Lightning
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

        if (cycle.period === 'first') dates = `1 - 15 ${monthName} ${yearThai} `;
        else if (cycle.period === 'second') {
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            dates = `16 - ${lastDay} ${monthName} ${yearThai} `;
        } else {
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            dates = `1 - ${lastDay} ${monthName} ${yearThai} `;
        }

        return {
            title: `งวดเดือน ${month} (${periodMap[cycle.period] || 'ทั้งเดือน'})`,
            subtitle: `${dates} • ทั้งหมด`
        };
    };

    return (
        <div className="animate-fade-in pb-32 font-sans text-slate-900">
            {/* Header Area */}
            <header className="px-6 pt-8 pb-6">
                <div className="max-w-3xl mx-auto flex justify-between items-end">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
                            Payroll System
                        </p>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                            จัดการเงินเดือน
                        </h1>
                    </div>
                </div>
            </header>

            <main className="px-6 pt-0 w-full max-w-3xl mx-auto space-y-8">

                {/* 1. Stats Grid (Monochrome Deep) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* YTD Card - Dark & Deep */}
                    <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl shadow-slate-900/20 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                        {/* Subtle Noise Texture */}
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>

                        <div className="absolute right-4 top-4 p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/5">
                            <Money size={24} weight="fill" className="text-slate-200" />
                        </div>

                        <div className="relative z-10 mt-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <TrendUp size={14} className="text-slate-400" />
                                ยอดจ่ายสะสมปีนี้ (YTD)
                            </p>
                            <h2 className="text-4xl font-bold tracking-tight mb-1 text-white">
                                ฿{totals.ytdTotal >= 1000000 ? (totals.ytdTotal / 1000000).toFixed(2) + 'M' : fmt(totals.ytdTotal)}
                            </h2>
                        </div>
                    </div>

                    {/* Staff Card - High Contrast White */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative group hover:border-slate-400 hover:shadow-md transition-all duration-300">
                        <div className="absolute right-4 top-4 p-2 bg-slate-100 text-slate-900 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-colors">
                            <Users size={24} weight="duotone" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">พนักงานทั้งหมด</p>
                        <div className="flex items-boundary gap-3 mt-4">
                            <h2 className="text-4xl font-bold text-slate-900 tracking-tight">{totals.staffCount}</h2>
                            <span className="text-xs text-slate-500 self-end mb-1.5 font-bold">คน (Active)</span>
                        </div>
                    </div>
                </div>

                {/* 2. Active Cycle Section (Heroic Dark) */}
                <div>
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Lightning weight="fill" className="text-slate-900" />
                            กำลังดำเนินการ (Active)
                        </h2>
                    </div>

                    {activeDraft ? (
                        (() => {
                            const info = formatCycle(activeDraft);
                            return (
                                <div
                                    onClick={() => onSelectCycle(activeDraft)}
                                    // Make Active Card Dark
                                    className="bg-slate-900 rounded-2xl p-0 shadow-2xl shadow-slate-900/20 relative overflow-hidden group cursor-pointer hover:-translate-y-1 transition-all duration-300"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900"></div>
                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>

                                    <div className="relative z-10 p-6">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-sm border border-white/10 shadow-inner">
                                                    <PencilSimple size={24} weight="duotone" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="bg-white/10 text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10 backdrop-blur-md">DRAFT</span>
                                                        <span className="text-[10px] text-slate-400 font-bold">• {info.subtitle.split('•')[0]}</span>
                                                    </div>
                                                    <h3 className="font-bold text-lg text-white tracking-wide">{info.title}</h3>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-black/20 rounded-xl p-4 flex justify-between items-center border border-white/5 backdrop-blur-sm">
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">ESTIMATED TOTAL</p>
                                                <p className="text-xl font-bold text-white tracking-tight">฿{fmt(activeDraft.summary.totalNet)}</p>
                                            </div>
                                            <button className="bg-white text-slate-900 px-4 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 hover:bg-slate-100 transition-colors">
                                                จัดการ <ArrowRight weight="bold" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()
                    ) : (
                        /* Engaging "Silver" Empty State */
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-8 rounded-2xl border border-dashed border-slate-300 text-center relative overflow-hidden group hover:border-slate-400 hover:shadow-lg transition-all duration-300">
                            <div className="flex flex-col items-center justify-center py-2">
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                                    <CoinVertical size={28} weight="duotone" className="text-slate-700" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 mb-1">เริ่มรอบบัญชีใหม่</h3>
                                <p className="text-xs text-slate-500 mb-5 max-w-xs mx-auto leading-relaxed">
                                    สร้างรายการจ่ายเงินเดือนสำหรับงวดปัจจุบัน <br /> ระบบจะคำนวณยอดให้อัตโนมัติ
                                </p>
                                <button
                                    onClick={onCreateCycle}
                                    className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-0.5 hover:shadow-slate-900/30 transition-all flex items-center gap-2"
                                >
                                    <Plus weight="bold" size={16} />
                                    เปิดรอบใหม่
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. History Section (Clean List) */}
                <div>
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-1">ประวัติย้อนหลัง (History)</h2>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                        {history.length > 0 ? history.map((cycle) => {
                            const info = formatCycle(cycle);
                            return (
                                <div
                                    key={cycle.id}
                                    onClick={() => onSelectCycle(cycle)}
                                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300 shadow-sm">
                                            <Check size={16} weight="bold" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-slate-900 group-hover:underline decoration-slate-300 underline-offset-4 transition-all">{info.title}</h3>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                                                <span>{info.subtitle.split('•')[0]}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-base font-bold text-slate-900">฿{fmt(cycle.summary.totalPaid)}</p>
                                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-bold group-hover:bg-white border border-transparent group-hover:border-slate-200 transition-colors">{cycle.summary.count} คน</span>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="p-10 text-center flex flex-col items-center justify-center text-slate-400">
                                <Wallet size={32} className="mb-2 opacity-30" />
                                <p className="text-xs font-bold">ยังไม่มีประวัติการจ่ายเงิน</p>
                            </div>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
};
