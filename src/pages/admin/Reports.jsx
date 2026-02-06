import React, { useState } from 'react';
import {
    CalendarBlank, ChartBar, User, Warning, Trophy,
    Funnel, CaretDown, CaretUp, RocketLaunch, CaretLeft, CaretRight,
    Smiley, Detective, WarningCircle, Clock, Fire, Money, TrendUp
} from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';
// ✅ Import Hook จาก Features Architecture
import { useReportsAdmin } from '../../features/reports/useReportsAdmin';
import { migrationService } from '../../features/migration/migration.service';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const IconMap = {
    Smiley: <Smiley weight="fill" />,
    Detective: <Detective weight="fill" />,
    WarningCircle: <WarningCircle weight="fill" />,
    Clock: <Clock weight="fill" />,
    Fire: <Fire weight="fill" />,
    Trophy: <Trophy weight="fill" />
};

export default function Reports() {
    const { currentUser } = useAuth();
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [activeTab, setActiveTab] = useState('overview');
    const [expandedCard, setExpandedCard] = useState(null);

    const { overview, graphData, reportData, loading, isInsightGenerated, analyzeInsights } = useReportsAdmin(currentUser?.companyId, selectedMonth);

    const changeMonth = (offset) => {
        const newDate = new Date(selectedMonth);
        newDate.setMonth(newDate.getMonth() + offset);
        setSelectedMonth(newDate);
    };

    const fmt = (n) => n?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] text-[#1E293B] font-sans">

            {/* HEADER */}
            <header className="px-6 pt-6 pb-2 sticky top-0 bg-[#FAFAFA]/95 backdrop-blur z-20">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-slate-800">สรุปพฤติกรรม</h1>
                    <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-full border border-slate-200 shadow-sm">
                        <button onClick={() => changeMonth(-1)} className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400"><CaretLeft weight="bold" /></button>
                        <div className="flex items-center gap-2 px-2">
                            <CalendarBlank weight="fill" className="text-slate-400" />
                            <span className="text-sm font-bold text-slate-700 min-w-[100px] text-center">{selectedMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</span>
                        </div>
                        <button onClick={() => changeMonth(1)} className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400"><CaretRight weight="bold" /></button>
                    </div>
                </div>

                <div className="bg-white p-1 rounded-xl flex shadow-sm border border-slate-100 mb-2">
                    <button onClick={() => setActiveTab('overview')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'overview' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <ChartBar weight="fill" /> ภาพรวม
                    </button>
                    <button onClick={() => setActiveTab('insights')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'insights' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <User weight="fill" /> เจาะลึกรายคน
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6 pt-2">

                {/* TAB 1: OVERVIEW */}
                {activeTab === 'overview' && (
                    <div className="space-y-5 animate-fade-in">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-center">
                                <p className="text-[10px] text-slate-400 uppercase font-bold">อัตราเข้างาน</p>
                                <p className="text-2xl font-bold text-emerald-500">{overview.attendanceRate.toFixed(0)}%</p>
                            </div>
                            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-center">
                                <p className="text-[10px] text-slate-400 uppercase font-bold">สายรวม (นาที)</p>
                                <p className="text-2xl font-bold text-orange-500">{overview.totalLateMins}</p>
                            </div>
                            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-center">
                                <p className="text-[10px] text-slate-400 uppercase font-bold">OT (ชม.)</p>
                                <p className="text-2xl font-bold text-blue-500">{overview.totalOTHours.toFixed(1)}</p>
                            </div>
                        </div>

                        <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-lg relative">
                            <h3 className="font-bold text-sm mb-4">สถิติรายวัน (Daily Stats)</h3>
                            <div className="overflow-x-auto pb-2 no-scrollbar">
                                <div className="h-48 min-w-[800px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={graphData} barGap={4}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }} contentStyle={{ backgroundColor: '#1E293B', borderRadius: '8px', border: 'none', fontSize: '12px' }} />
                                            <Bar name="มาปกติ" dataKey="onTime" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} barSize={12} />
                                            <Bar name="สาย" dataKey="late" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} barSize={12} />
                                            <Bar name="ขาด/ลา" dataKey="absent" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={12} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 text-center mt-2 opacity-50">(( เลื่อนเพื่อดูวันที่อื่นๆ ))</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Trophy weight="fill" className="text-yellow-400" /> พนักงานดีเด่น</h3>
                                <div className="space-y-3">
                                    {overview.topGood.length > 0 ? overview.topGood.map((emp, i) => (
                                        <div key={i} className="flex items-center gap-3 border-b border-slate-50 pb-2 last:border-0">
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-yellow-50 text-yellow-600 border border-yellow-100">{i + 1}</div>
                                            <img src={emp.avatar || `https://ui-avatars.com/api/?name=${emp.name}`} className="w-8 h-8 rounded-full border border-slate-100" />
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-slate-700">{emp.name}</p>
                                                <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold">Top Score</span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-800">{emp.simpleScore}</span>
                                        </div>
                                    )) : <div className="text-center py-6"><p className="text-xs text-slate-400">ยังไม่มีข้อมูลในเดือนนี้</p></div>}
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Warning weight="fill" className="text-red-500" /> สายบ่อยที่สุด</h3>
                                <div className="space-y-3">
                                    {overview.topLate.length > 0 ? overview.topLate.map((emp, i) => (
                                        <div key={i} className="flex items-center gap-3 border-b border-slate-50 pb-2 last:border-0">
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-red-50 text-red-600 border border-red-100">{i + 1}</div>
                                            <img src={emp.avatar || `https://ui-avatars.com/api/?name=${emp.name}`} className="w-8 h-8 rounded-full border border-slate-100" />
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-slate-700">{emp.name}</p>
                                                <p className="text-[10px] text-slate-400">สาย {emp.lateCount || 0} ครั้ง</p>
                                            </div>
                                            <span className="text-xs font-bold text-red-500">+{emp.lateMins} น.</span>
                                        </div>
                                    )) : <div className="text-center py-6"><p className="text-xs text-slate-400">เยี่ยมมาก! ไม่มีใครสาย</p></div>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: INSIGHTS */}
                {activeTab === 'insights' && (
                    <div className="animate-fade-in">
                        {!isInsightGenerated ? (
                            <div className="flex flex-col items-center justify-center py-10">
                                <div className="w-20 h-20 bg-white rounded-full shadow-xl flex items-center justify-center text-blue-500 mb-6 animate-bounce-slow">
                                    <RocketLaunch size={40} weight="fill" />
                                </div>
                                <h2 className="text-lg font-bold text-slate-800 mb-2">เริ่มเจาะลึกพฤติกรรม?</h2>
                                <p className="text-slate-400 text-xs text-center max-w-xs mb-6">ระบบจะสแกนหา "ป่วยการเมือง" "สายสะสม" และคำนวณ "มูลค่าความเสียหาย" จากการขาด/สาย</p>
                                <button onClick={analyzeInsights} disabled={loading} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2">
                                    {loading ? 'กำลังวิเคราะห์...' : <><RocketLaunch weight="bold" /> วิเคราะห์เลย</>}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-xs font-bold text-slate-400">ผลการวิเคราะห์ ({reportData.length} คน)</span>
                                    <button onClick={analyzeInsights} className="text-[10px] text-blue-500 font-bold flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full"><RocketLaunch /> รีเฟรช</button>
                                </div>
                                {reportData.map((emp) => {
                                    const theme = {
                                        high: { border: 'border-l-red-500', bg: 'bg-red-50', text: 'text-red-600' },
                                        medium: { border: 'border-l-orange-400', bg: 'bg-orange-50', text: 'text-orange-600' },
                                        watch: { border: 'border-l-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-600' },
                                        low: { border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600' }
                                    }[emp.riskLevel] || { border: 'border-l-slate-300', bg: 'bg-slate-50', text: 'text-slate-600' };

                                    const isExpanded = expandedCard === emp.id;
                                    return (
                                        <div key={emp.id} className={`bg-white rounded-2xl shadow-sm border-y border-r border-slate-100 border-l-4 ${theme.border} overflow-hidden transition-all duration-300`}>
                                            <div className="p-4 flex justify-between items-center cursor-pointer active:bg-slate-50" onClick={() => setExpandedCard(isExpanded ? null : emp.id)}>
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <img src={emp.avatar || `https://ui-avatars.com/api/?name=${emp.name}`} className="w-10 h-10 rounded-full border border-slate-100" />
                                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-white ${emp.score >= 80 ? 'bg-emerald-500' : emp.score >= 50 ? 'bg-orange-400' : 'bg-red-500'}`}>{emp.grade}</div>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-sm text-slate-800">{emp.name}</h4>
                                                        <div className="flex gap-1 mt-1 flex-wrap">
                                                            {emp.tags.map((tag, i) => (
                                                                <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded font-bold border flex items-center gap-1 bg-${tag.color}-50 text-${tag.color}-600 border-${tag.color}-100`}>{tag.text}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-slate-400">คะแนน</p>
                                                    <p className={`text-xl font-bold ${theme.text}`}>{emp.score}</p>
                                                </div>
                                            </div>

                                            {/* EXPANDED CONTENT */}
                                            {isExpanded && (
                                                <div className="bg-slate-50/50 border-t border-slate-100 animate-fade-in">
                                                    {/* Insight Box */}
                                                    <div className={`p-4 ${theme.bg} border-b border-white`}>
                                                        <div className="flex gap-3 items-start">
                                                            <div className={`text-lg ${theme.text}`}>{IconMap[emp.insight.icon] || <WarningCircle />}</div>
                                                            <div><p className={`text-xs font-bold ${theme.text}`}>{emp.insight.title}</p><p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{emp.insight.text}</p></div>
                                                        </div>
                                                        {emp.lostCost > 0 && (
                                                            <div className="mt-2 bg-white/50 p-2 rounded flex items-center gap-2 border border-black/5">
                                                                <Money weight="fill" className="text-slate-400" />
                                                                <span className="text-xs text-slate-600">ประเมินมูลค่าความเสียหาย: <b className="text-red-500">฿{fmt(emp.lostCost)}</b></span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* ✅ Timeline รายวัน */}
                                                    {emp.incidents && emp.incidents.length > 0 && (
                                                        <div className="p-3 bg-white border-b border-slate-100">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Timeline ความผิดปกติ</p>
                                                            <div className="space-y-2">
                                                                {emp.incidents.map((inc, i) => (
                                                                    <div key={i} className="flex justify-between items-center text-xs">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                                            <span className="font-bold text-slate-600">{inc.date}</span>
                                                                            <span className={`px-1.5 rounded text-[10px] font-bold ${inc.severity === 'high' || inc.severity === 'critical' ? 'bg-red-100 text-red-600' : inc.type === 'late_minor' ? 'bg-slate-100 text-slate-400' : 'bg-orange-100 text-orange-600'}`}>
                                                                                {inc.type === 'late' ? 'สาย' : inc.type === 'absent' ? 'ขาดงาน' : inc.type === 'overwork' ? 'OT หนัก' : inc.type}
                                                                            </span>
                                                                        </div>
                                                                        <span className="font-bold text-slate-800">{inc.val}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-3 divide-x divide-slate-200 bg-white p-3">
                                                        <div className="text-center"><p className="text-[10px] text-slate-400">ขาด (วัน)</p><p className="font-bold text-red-500">{emp.stats.absentCount}</p></div>
                                                        <div className="text-center"><p className="text-[10px] text-slate-400">สาย (ครั้ง)</p><p className="font-bold text-slate-800">{emp.stats.lateCount}</p></div>
                                                        <div className="text-center"><p className="text-[10px] text-slate-400">OT (ชม.)</p><p className="font-bold text-slate-800">{emp.stats.otHours.toFixed(1)}</p></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}