import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../shared/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import {
    UserCircle, Target, WarningOctagon, AirplaneTilt,
    CaretDown, CheckCircle, Wallet,
    Money, TrendUp, TrendDown, ChartPieSlice, CalendarBlank,
    CaretLeft, CaretRight, X, Timer, WarningCircle
} from '@phosphor-icons/react';

import { useLocation } from 'react-router-dom';
import { useSalaryCalculator } from '../../hooks/useSalaryCalculator';
import { useDialog } from '../../contexts/DialogContext';

// Helper Function
const formatDateForInput = (dateObj) => {
    if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj)) return '';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function MyWork() {
    const { currentUser } = useAuth();
    const location = useLocation();
    const dialog = useDialog();

    // --- STATE ---
    const [activeTab, setActiveTab] = useState(location.state?.defaultTab || 'overview');
    const [attendanceList, setAttendanceList] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [schedules, setSchedules] = useState([]);

    const [deductionConfig, setDeductionConfig] = useState({
        dailyWage: 500, gracePeriod: 5, deductionPerMinute: 10, maxDeduction: 300,
        employmentType: 'daily'
    });

    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [leaveForm, setLeaveForm] = useState({ type: 'Sick Leave', reason: '' });
    const [adjustForm, setAdjustForm] = useState({ timeIn: '', timeOut: '', reason: '' });
    const [loading, setLoading] = useState(false);

    // 1. Fetch Config & Profile
    useEffect(() => {
        if (!currentUser?.uid) return;
        let unsubscribeUser;

        const setupListeners = async () => {
            try {
                let currentConfig = {
                    dailyWage: 500, gracePeriod: 5, deductionPerMinute: 10, maxDeduction: 300, employmentType: 'daily'
                };

                if (currentUser.companyId) {
                    const docRef = doc(db, "companies", currentUser.companyId, "settings", "deduction");
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        currentConfig = { ...currentConfig, ...docSnap.data() };
                    }
                }
                setDeductionConfig(currentConfig);

                const userRef = doc(db, "users", currentUser.uid);
                unsubscribeUser = onSnapshot(userRef, (userSnap) => {
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        let newUpdates = {};
                        if (userData.salary) {
                            const cleanSalary = String(userData.salary).replace(/,/g, '');
                            newUpdates.baseSalary = Number(cleanSalary);
                            newUpdates.dailyWage = Math.round(Number(cleanSalary) / 30);
                        }
                        if (userData.type) {
                            newUpdates.employmentType = userData.type;
                        }
                        setDeductionConfig(prev => ({ ...prev, ...newUpdates }));
                    }
                });

            } catch (error) { console.error("Config Error:", error); }
        };

        setupListeners();
        return () => { if (unsubscribeUser) unsubscribeUser(); };
    }, [currentUser]);

    // 2. Fetch Data
    useEffect(() => {
        if (!currentUser) return;

        const year = currentMonth.getFullYear();
        const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(year, currentMonth.getMonth() + 1, 0).getDate();

        const startOfMonthStr = `${year}-${month}-01`;
        const endOfMonthStr = `${year}-${month}-${lastDay}`;

        const qAttendance = query(
            collection(db, "attendance"),
            where("userId", "==", currentUser.uid),
            where("createdAt", ">=", new Date(year, currentMonth.getMonth(), 1)),
            orderBy("createdAt", "desc")
        );

        const unsubscribeAttendance = onSnapshot(qAttendance, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const filteredData = data.filter(item => {
                const d = item.createdAt.toDate();
                return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
            });
            setAttendanceList(filteredData);
        });

        const qSchedules = query(
            collection(db, "schedules"),
            where("userId", "==", currentUser.uid),
            where("date", ">=", startOfMonthStr),
            where("date", "<=", endOfMonthStr)
        );

        const unsubscribeSchedules = onSnapshot(qSchedules, (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data());
            setSchedules(data);
        });

        return () => {
            unsubscribeAttendance();
            unsubscribeSchedules();
        };

    }, [currentUser, currentMonth]);

    // 3. Hook
    const { stats, dailyBreakdown } = useSalaryCalculator(
        attendanceList,
        schedules,
        deductionConfig,
        currentMonth,
        deductionConfig.employmentType
    );

    const changeMonth = (offset) => { setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1)); };

    const getDayStatus = (day) => {
        const record = dailyBreakdown.find(d => d.date.getDate() === day);
        if (!record) return null;

        if (record.status === 'late') return { color: 'bg-orange-400' };
        if (record.status === 'absent') return { color: 'bg-rose-500' };
        if (record.hasRecord) return { color: 'bg-emerald-500' };

        if (record.status === 'upcoming' || !record.hasRecord) {
            const year = currentMonth.getFullYear();
            const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
            const dStr = String(day).padStart(2, '0');
            const dateKey = `${year}-${month}-${dStr}`;
            const schedule = schedules.find(s => s.date === dateKey);

            if (schedule?.type === 'holiday') return { color: 'bg-red-400' };
            if (schedule?.type === 'work') return { color: 'bg-blue-400' };
            if (schedule?.type === 'leave') return { color: 'bg-yellow-400' };
            if (schedule?.type === 'off') return { color: 'bg-slate-300' };
        }
        return null;
    };

    const handleDateClick = (day) => {
        try {
            const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const item = dailyBreakdown.find(d => d.date.getDate() === day);
            setSelectedDate(dateObj);

            if (item) {
                if (item.status === 'absent' || (item.status === 'today' && !item.hasRecord)) {
                    setAdjustForm(prev => ({ ...prev, date: formatDateForInput(dateObj) }));
                    setShowAdjustModal(true);
                }
                else if (item.status === 'upcoming' && item.isWorkDay) {
                    setShowLeaveModal(true);
                }
            } else {
                if (dateObj > new Date()) setShowLeaveModal(true);
            }
        } catch (error) { console.error("Date Click Error:", error); }
    };

    // HANDLERS
    const handleSubmitLeave = async () => {
        if (!leaveForm.reason) return dialog.showAlert("กรุณาระบุเหตุผลการลา", "ข้อมูลไม่ครบ", "warning");

        setLoading(true);
        try {
            await addDoc(collection(db, "requests"), {
                companyId: currentUser.companyId, userId: currentUser.uid, userName: currentUser.displayName || currentUser.email,
                type: 'leave', leaveType: leaveForm.type, reason: leaveForm.reason,
                date: formatDateForInput(selectedDate),
                status: 'pending', createdAt: serverTimestamp()
            });
            await dialog.showAlert("ส่งใบลาเรียบร้อยแล้ว! รอการอนุมัติจาก HR", "สำเร็จ", "success");
            setShowLeaveModal(false); setLeaveForm({ type: 'Sick Leave', reason: '' });
        } catch (error) {
            dialog.showAlert("เกิดข้อผิดพลาด: " + error.message, "Error", "error");
        }
        setLoading(false);
    };

    const handleSubmitAdjust = async () => {
        if (!adjustForm.timeIn || !adjustForm.timeOut || !adjustForm.reason) {
            return dialog.showAlert("กรุณากรอกเวลาและเหตุผลให้ครบถ้วน", "ข้อมูลไม่ครบ", "warning");
        }

        setLoading(true);
        try {
            await addDoc(collection(db, "requests"), {
                companyId: currentUser.companyId, userId: currentUser.uid, userName: currentUser.displayName || currentUser.email,
                type: 'adjustment',
                targetDate: adjustForm.date || formatDateForInput(selectedDate),
                timeIn: adjustForm.timeIn, timeOut: adjustForm.timeOut, reason: adjustForm.reason,
                status: 'pending', createdAt: serverTimestamp()
            });
            await dialog.showAlert("ส่งคำขอแก้ไขเวลาแล้ว! รอการอนุมัติจาก HR", "สำเร็จ", "success");
            setShowAdjustModal(false); setAdjustForm({ timeIn: '', timeOut: '', reason: '' });
        } catch (error) {
            dialog.showAlert("เกิดข้อผิดพลาดในการส่งคำขอ", "Error", "error");
        }
        setLoading(false);
    };

    // Components Helper
    const DonutChart = ({ value, total, color, label, icon: Icon }) => {
        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
        const gradient = `conic-gradient(${color} 0% ${percentage}%, #F1F5F9 ${percentage}% 100%)`;
        return (
            <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-inner" style={{ background: gradient }}>
                    <div className="w-12 h-12 bg-white rounded-full flex flex-col items-center justify-center"><span className="text-xs font-bold text-slate-700">{percentage}%</span></div>
                </div>
                <div className="mt-2 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                    <div className="flex items-center justify-center gap-1"><Icon weight="fill" className="text-slate-400" size={10} /><span className="text-[10px] font-bold text-slate-600">{value} D</span></div>
                </div>
            </div>
        );
    };

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 px-6 pt-8 pb-32">

            {/* 1. HEADER (ใช้แบบเดิม) */}
            <div className="flex justify-between items-center mb-6">
                <div><p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Employee Portal</p><h1 className="text-3xl font-extrabold tracking-tight text-slate-900">My Work</h1></div>
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-blue-600 border border-blue-50"><UserCircle size={24} weight="fill" /></div>
            </div>

            {/* SEGMENTED CONTROL */}
            <div className="bg-slate-200/50 p-1.5 rounded-xl flex relative mb-6">
                <button onClick={() => setActiveTab('overview')} className={`flex-1 py-2.5 rounded-[10px] text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'overview' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><ChartPieSlice weight="fill" size={16} /> Overview</button>
                <button onClick={() => setActiveTab('calendar')} className={`flex-1 py-2.5 rounded-[10px] text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'calendar' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><CalendarBlank weight="fill" size={16} /> Calendar</button>
            </div>

            {/* === TAB 1: OVERVIEW === */}
            {activeTab === 'overview' && (
                <div className="animate-fade-in">

                    {/* 3. DISCLAIMER BOX (เพิ่มกล่องเตือน) */}
                    <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex gap-3 items-start mb-6">
                        <WarningCircle className="text-orange-500 shrink-0 mt-0.5" size={20} weight="fill" />
                        <div>
                            <p className="text-xs font-bold text-orange-700 mb-0.5">หมายเหตุ (Disclaimer)</p>
                            <p className="text-[10px] text-orange-600/80 leading-relaxed">
                                ยอดเงินที่แสดงเป็นเพียงการ <b>"ประมาณการเบื้องต้น"</b> <br />
                                ไม่ใช่ยอดสุทธิ (Net Total) ที่จะได้รับจริง โปรดตรวจสอบในสลิป
                            </p>
                        </div>
                    </div>

                    {/* 4. CURRENT SAVING CARD (สีน้ำเงินเดิม + ลบคำคม) */}
                    <div className="bg-gradient-to-br from-[#2563EB] to-[#4F46E5] rounded-[32px] p-6 text-white shadow-xl shadow-indigo-500/20 mb-8 relative overflow-hidden">
                        <div className="absolute right-[-20px] top-[-20px] w-48 h-48 bg-white/10 rounded-full blur-[60px]"></div>
                        <div className="absolute left-[-20px] bottom-[-20px] w-40 h-40 bg-indigo-500/20 rounded-full blur-[50px]"></div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-end mb-2">
                                <div><p className="text-[10px] font-bold text-blue-100 uppercase tracking-wider mb-1 flex items-center gap-1"><Wallet size={14} /> ยอดสะสม (ESTIMATED)</p><h2 className="text-4xl font-extrabold tracking-tight text-white flex items-baseline gap-1">฿{stats.estimatedIncome.toLocaleString()}</h2></div>
                                <div className="text-right"><p className="text-[9px] text-blue-100 mb-1">เป้าหมาย (Goal)</p><p className="text-sm font-bold text-white">฿{stats.monthlyGoal.toLocaleString()}</p></div>
                            </div>
                            {/* ลบส่วน Motivation ออกแล้ว */}
                            <div className="relative pb-5 mt-6">
                                <div className="h-16 flex items-end gap-[2px] sm:gap-1 px-1 relative">
                                    {(() => {
                                        const TOTAL_BARS = 20; const STANDARD_BARS = 15;
                                        const valuePerBar = stats.monthlyGoal > 0 ? (stats.monthlyGoal / STANDARD_BARS) : 1;
                                        const activeBarsCount = Math.min(Math.floor(stats.estimatedIncome / valuePerBar), TOTAL_BARS);
                                        return Array.from({ length: TOTAL_BARS }, (_, i) => {
                                            const isActive = i < activeBarsCount; const isBonus = i >= STANDARD_BARS; const isLatest = i === activeBarsCount - 1; const stepHeight = 20 + ((i / 20) * 80);
                                            let barColor = 'bg-white/20'; if (isActive) barColor = isBonus ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]' : 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]';
                                            return (<div key={i} className="flex-1 h-full relative flex items-end justify-center group"><div className={`w-full rounded-[2px] transition-all duration-500 ${barColor}`} style={{ height: `${stepHeight}%` }}></div>{isLatest && (<div className="absolute w-full flex justify-center z-20 mb-1" style={{ bottom: `${stepHeight}%` }}><div className="text-yellow-300 drop-shadow-md animate-bounce"><CaretDown weight="fill" size={16} /></div></div>)}</div>);
                                        });
                                    })()}
                                </div>
                                <div className="absolute bottom-[-10px] w-full text-[9px] font-bold text-indigo-100 uppercase tracking-widest opacity-80 h-4"><span className="absolute left-0">Start</span><span className="absolute left-[75%] -translate-x-1/2">Target</span> <span className="absolute right-0">Bonus</span></div>
                            </div>
                        </div>
                    </div>

                    {/* STATS (คงเดิม) */}
                    <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 mb-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">Month Performance</h3>
                        <div className="flex justify-between items-start px-2"><DonutChart value={stats.actualWorkDays} total={stats.totalWorkDays} color="#10B981" label="Working" icon={CheckCircle} /><DonutChart value={stats.leaveCount} total={stats.totalWorkDays} color="#3B82F6" label="Leaves" icon={AirplaneTilt} /><DonutChart value={stats.lateCount + stats.absentCount} total={stats.totalWorkDays} color="#F97316" label="Issues" icon={WarningOctagon} /></div>
                    </div>

                    {/* 5. SALARY BREAKDOWN (แก้เป็นสไตล์ Payslip) */}
                    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 animate-slide-up">
                        <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Money className="text-blue-500" size={18} weight="fill" /> Salary Breakdown</h3><span className="text-[10px] text-slate-400 font-medium">Estimate</span></div>

                        <div className="space-y-3">
                            {/* Income Item */}
                            <div className="flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 group-hover:scale-125 transition"></div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-600 block">รายรับ (Income)</span>
                                        <span className="text-[9px] text-slate-400">Base + OT</span>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-emerald-600">+฿{(stats.estimatedIncome + stats.totalDeduction).toLocaleString()}</span>
                            </div>

                            {/* Deduction Item */}
                            <div className="flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400 group-hover:scale-125 transition"></div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-600 block">หัก (Deduction)</span>
                                        <span className="text-[9px] text-slate-400">Late / Absent</span>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-rose-500">-฿{stats.totalDeduction.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 my-4"></div>
                        <div className="flex justify-between items-center px-1"><p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Net Estimate</p><p className="text-xl font-extrabold text-slate-800">฿{stats.estimatedIncome.toLocaleString()}</p></div>
                    </div>
                </div>
            )}

            {/* === TAB 2: CALENDAR === */}
            {activeTab === 'calendar' && (
                <div className="animate-fade-in">
                    <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <button onClick={() => changeMonth(-1)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 text-slate-600 transition"><CaretLeft weight="bold" size={18} /></button>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
                            <button onClick={() => changeMonth(1)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 text-slate-600 transition"><CaretRight weight="bold" size={18} /></button>
                        </div>

                        <div className="grid grid-cols-7 text-center mb-2">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-[10px] font-bold text-slate-300 uppercase tracking-wider py-2">{d}</div>)}</div>
                        <div className="grid grid-cols-7 gap-y-3 mb-8">
                            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`}></div>)}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const status = getDayStatus(day);
                                const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth();
                                return (
                                    <div key={day} onClick={() => handleDateClick(day)} className="flex flex-col items-center justify-center py-1 relative group cursor-pointer hover:bg-slate-50 rounded-xl transition">
                                        <span className={`text-[13px] font-bold w-9 h-9 flex items-center justify-center rounded-full transition-all ${isToday ? 'bg-[#1C1C1E] text-white shadow-md' : 'text-slate-600'}`}>{day}</span>
                                        {status && <div className={`mt-1 w-1.5 h-1.5 rounded-full ${status.color}`}></div>}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="border-t border-slate-100 pt-6 flex flex-wrap justify-center gap-4">
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[10px] font-bold text-slate-500 uppercase">Present</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-400"></div><span className="text-[10px] font-bold text-slate-500 uppercase">Late</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div><span className="text-[10px] font-bold text-slate-500 uppercase">Absent</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400"></div><span className="text-[10px] font-bold text-slate-500 uppercase">Work</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-300"></div><span className="text-[10px] font-bold text-slate-500 uppercase">Off</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400"></div><span className="text-[10px] font-bold text-slate-500 uppercase">Holiday</span></div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALS */}
            {showLeaveModal && createPortal(
                <div className="fixed inset-0 z-[99] flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLeaveModal(false)}></div>
                    <div className="bg-white w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 relative z-10 animate-slide-up">
                        <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold flex items-center gap-2 text-slate-800"><AirplaneTilt className="text-blue-500" /> Request Leave</h3><button onClick={() => setShowLeaveModal(false)}><X weight="bold" className="text-slate-400" /></button></div>
                        <div className="text-xs text-slate-500 mb-4 font-bold">
                            Date: {selectedDate instanceof Date && !isNaN(selectedDate) ? selectedDate.toLocaleDateString('th-TH') : 'ไม่ระบุ'}
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">{['Sick Leave', 'Vacation', 'Business', 'Other'].map(t => (<button key={t} onClick={() => setLeaveForm({ ...leaveForm, type: t })} className={`p-2 rounded-xl text-xs font-bold border ${leaveForm.type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{t}</button>))}</div>
                            <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm" placeholder="Reason..." value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}></textarea>
                            <button onClick={handleSubmitLeave} disabled={loading} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold disabled:opacity-50">Submit Request</button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {showAdjustModal && createPortal(
                <div className="fixed inset-0 z-[99] flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAdjustModal(false)}></div>
                    <div className="bg-white w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 relative z-10 animate-slide-up">
                        <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold flex items-center gap-2 text-rose-500"><Timer weight="fill" /> Missed Punch?</h3><button onClick={() => setShowAdjustModal(false)}><X weight="bold" className="text-slate-400" /></button></div>
                        <p className="text-xs text-slate-500 mb-4 bg-rose-50 p-3 rounded-lg border border-rose-100 leading-relaxed">
                            คุณไม่ได้ลงเวลาในวันที่ <span className="font-bold text-rose-600">{selectedDate instanceof Date && !isNaN(selectedDate) ? selectedDate.toLocaleDateString('th-TH') : 'ไม่ระบุ'}</span> ระบบนับว่าขาดงาน
                        </p>
                        <div className="flex gap-3 mb-3"><div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">In</label><input type="time" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm" value={adjustForm.timeIn} onChange={e => setAdjustForm({ ...adjustForm, timeIn: e.target.value })} /></div><div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Out</label><input type="time" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm" value={adjustForm.timeOut} onChange={e => setAdjustForm({ ...adjustForm, timeOut: e.target.value })} /></div></div>
                        <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm mb-4" placeholder="Reason..." value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}></textarea>
                        <button onClick={handleSubmitAdjust} className="w-full bg-rose-500 text-white py-3 rounded-xl font-bold">Send to HR</button>
                    </div>
                </div>, document.body
            )}
        </div>
    );
}