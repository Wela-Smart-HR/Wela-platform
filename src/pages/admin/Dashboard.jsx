import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../shared/lib/firebase';
import { WarningOctagon } from '@phosphor-icons/react';
import {
    collection, query, where, onSnapshot, orderBy, limit,
    doc, getDoc, getDocs
} from 'firebase/firestore';
import {
    Users, Clock, WarningCircle, BellRinging,
    TrendUp, CaretRight, Warning, Lightning,
    Wallet, CheckCircle
} from '@phosphor-icons/react';
import { useDashboard } from '../../features/dashboard/useDashboard';

export default function Dashboard() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // --- CUSTOM HOOK (ZERO-COST) ---
    const { companyName, stats } = useDashboard();

    // --- STATE ---
    // Note: companyName and stats are now managed by useDashboard
    const [pendingRequests, setPendingRequests] = useState([]);
    const [scheduleStatus, setScheduleStatus] = useState('missing');
    const [zeroStaffAlert, setZeroStaffAlert] = useState(false);

    // --- DATA FETCHING ---
    // 1. Requests (Keep specific collection query for now, or move to hook later)
    useEffect(() => {
        if (!currentUser?.companyId) return;

        const qReq = query(collection(db, "requests"), where("companyId", "==", currentUser.companyId), where("status", "==", "pending"), orderBy("createdAt", "desc"), limit(10));
        const unsubReq = onSnapshot(qReq, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPendingRequests(docs);
        });

        return () => unsubReq();
    }, [currentUser]);

    // 3. Requests Logic already set above.

    // 4. Check Schedule Status
    const checkSchedule = async () => {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];

        // Check for Zero Staff (Today)
        const qToday = query(collection(db, "schedules"), where("companyId", "==", currentUser.companyId), where("date", "==", dateStr));
        const snapToday = await getDocs(qToday);

        if (!snapToday.empty) {
            const hasWorkingStaff = snapToday.docs.some(d => d.data().type === 'work');
            setZeroStaffAlert(!hasWorkingStaff);
        }

        // Check for Missing Schedule (Tomorrow) - Existing Logic
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        const tmrStr = tomorrow.toISOString().split('T')[0];
        const qSch = query(collection(db, "schedules"), where("companyId", "==", currentUser.companyId), where("date", "==", tmrStr), limit(1));
        const snapTmr = await getDocs(qSch);
        setScheduleStatus(snapTmr.empty ? 'missing' : 'ready');
    };

    useEffect(() => {
        if (!currentUser?.companyId) return;
        checkSchedule();
    }, [currentUser]);

    const urgentAlerts = pendingRequests.filter(req => req.type === 'unscheduled_alert');
    const securityAlerts = pendingRequests.filter(req => req.type === 'security_alert');
    const normalRequests = pendingRequests.filter(req => req.type !== 'unscheduled_alert');

    // --- HELPER COMPONENTS ---

    // 🔥 ปรับขนาด Donut Chart ให้ใหญ่สะใจ (Radius 42, Stroke 12)
    const CircleChart = ({ value, max, color }) => {
        const radius = 42;
        const circumference = 2 * Math.PI * radius;
        const percent = max > 0 ? value / max : 0;
        const offset = circumference - percent * circumference;

        return (
            <div className="relative w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center transition-all">
                <svg className="w-full h-full -rotate-90 filter drop-shadow-sm" viewBox="0 0 100 100">
                    {/* Background */}
                    <circle cx="50" cy="50" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="12" />
                    {/* Progress */}
                    <circle
                        cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="12"
                        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                    />
                </svg>
                {/* ตัวเลขตรงกลาง (Optional: ถ้าอยากใส่ตัวเลขตรงกลางกราฟด้วยบอกได้นะครับ) */}
            </div>
        );
    };

    const LineChart = () => (
        <svg className="w-full h-10 sm:h-14 overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
            <path d="M0,35 L15,20 L30,30 L50,10 L70,25 L85,15 L100,30" fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="100" cy="30" r="4" fill="#3B82F6" className="animate-pulse" />
        </svg>
    );

    return (
        <div className="min-h-screen bg-[#F8F9FD] p-4 sm:p-6 font-sans text-slate-800 pb-24">

            {/* 1. HEADER */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] mb-1">{companyName}</h1>
                    <p className="text-xs sm:text-sm text-slate-400 font-medium">Admin Dashboard</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <button className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-500 hover:text-blue-600 transition hover:shadow-md">
                        <BellRinging size={18} />
                    </button>
                    <button className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition">
                        <Lightning size={18} weight="fill" />
                    </button>
                </div>
            </div>

            {/* 2. MAIN STATS GRID */}
            {/* Grid: Mobile=2, Large Screen=4 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">

                {/* Card 1: Total Employees */}
                <div
                    onClick={() => navigate('/people')}
                    className="bg-[#0F172A] rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 text-white relative overflow-hidden flex flex-col justify-between h-[150px] sm:h-[180px] shadow-xl shadow-slate-200/50 cursor-pointer hover:scale-[1.02] transition-transform"
                >
                    <div className="text-slate-400"><Users size={20} weight="duotone" className="sm:w-6 sm:h-6" /></div>
                    <div>
                        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-1">{stats.totalEmployees}</h2>
                        <p className="text-[10px] sm:text-xs text-slate-400 font-medium opacity-80">พนักงานทั้งหมด</p>
                    </div>
                </div>

                {/* Card 2: Active Now -> ไปหน้า Reports Tab Attendance */}
                <div
                    onClick={() => navigate('/reports', { state: { defaultTab: 'attendance' } })}
                    className="bg-white rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 flex items-center justify-between h-[150px] sm:h-[180px] shadow-sm border border-slate-100 cursor-pointer hover:border-emerald-200 transition-colors"
                >
                    <div className="flex flex-col justify-between h-full py-1">
                        <div className="text-slate-300"><Clock size={20} weight="duotone" className="sm:w-6 sm:h-6" /></div>
                        <div>
                            <h2 className="text-2xl sm:text-4xl font-bold text-[#0F172A] mb-1">{stats.activeNow}</h2>
                            <p className="text-[10px] sm:text-xs text-emerald-500 font-bold">เข้างานวันนี้</p>
                        </div>
                    </div>
                    <div className="flex-shrink-0">
                        <CircleChart value={stats.activeNow} max={stats.totalEmployees} color="#10B981" />
                    </div>
                </div>

                {/* Card 3: Payroll Forecast */}
                <div
                    onClick={() => navigate('/payroll')}
                    className="bg-white rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 h-[150px] sm:h-[180px] shadow-sm border border-slate-100 flex flex-col justify-between cursor-pointer hover:border-blue-200 transition-colors"
                >
                    <div className="flex justify-between items-start">
                        <div className="text-slate-300"><Wallet size={20} weight="duotone" className="sm:w-6 sm:h-6" /></div>
                        <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-bold">Forecast</span>
                    </div>
                    <div>
                        <h2 className="text-2xl sm:text-4xl font-bold text-[#0F172A] mb-1">
                            ฿{(stats.payrollForecast / 1000).toFixed(0)}k
                        </h2>
                        <p className="text-[10px] sm:text-xs text-blue-500 font-bold">ยอดจ่ายเดือนนี้</p>
                    </div>

                </div>

                {/* Card 4: Late Today -> ไปหน้า Settings Tab Rules */}
                <div
                    onClick={() => navigate('/settings', { state: { defaultTab: 'rules' } })}
                    className="bg-white rounded-[20px] sm:rounded-[24px] p-4 sm:p-5 flex items-center justify-between h-[150px] sm:h-[180px] shadow-sm border border-slate-100 cursor-pointer hover:border-orange-200 transition-colors"
                >
                    <div className="flex flex-col justify-between h-full py-1">
                        <div className="text-slate-300"><Warning size={20} weight="duotone" className="sm:w-6 sm:h-6" /></div>
                        <div>
                            <h2 className="text-2xl sm:text-4xl font-bold text-[#0F172A] mb-1">{stats.lateToday}</h2>
                            <p className="text-[10px] sm:text-xs text-orange-500 font-bold">มาสาย</p>
                        </div>
                    </div>
                    <div className="flex-shrink-0">
                        <CircleChart value={stats.lateToday} max={stats.activeNow || 1} color="#F97316" />
                    </div>
                </div>

            </div>

            {/* 3. UNIFIED BANNER SYSTEM */}
            <div className="mb-8 animate-pulse-soft">
                {scheduleStatus === 'zero_staff_today' && (
                    <div className="bg-[#DC2626] rounded-[20px] sm:rounded-[24px] flex items-center justify-between shadow-lg shadow-rose-200/50 overflow-hidden relative">
                        <div className="absolute -left-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                        <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-white relative z-10">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">
                                <WarningOctagon weight="fill" size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm sm:text-lg leading-tight">ไม่มีพนักงานเข้ากะวันนี้!</h3>
                                <p className="text-[10px] sm:text-xs text-white/90 mt-0.5">ด่วน! ตรวจสอบตารางงานวันนี้ทันที</p>
                            </div>
                        </div>
                        <button onClick={() => navigate('/schedule')} className="bg-white text-[#DC2626] px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-bold text-[10px] sm:text-xs shadow-md m-2 sm:m-4 hover:bg-rose-50 transition active:scale-95 whitespace-nowrap z-10">จัดการด่วน</button>
                    </div>
                )}

                {scheduleStatus === 'zero_staff_tomorrow' && (
                    <div className="bg-[#F97316] rounded-[20px] sm:rounded-[24px] flex items-center justify-between shadow-lg shadow-orange-200/50 overflow-hidden relative">
                        <div className="absolute -left-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                        <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-white relative z-10">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">
                                <WarningCircle weight="fill" size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm sm:text-lg leading-tight">พรุ่งนี้ไม่มีพนักงานเข้ากะ</h3>
                                <p className="text-[10px] sm:text-xs text-white/90 mt-0.5">โปรดตรวจสอบตารางงานล่วงหน้า</p>
                            </div>
                        </div>
                        <button onClick={() => navigate('/schedule')} className="bg-white text-[#F97316] px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-bold text-[10px] sm:text-xs shadow-md m-2 sm:m-4 hover:bg-orange-50 transition active:scale-95 whitespace-nowrap z-10">ตรวจสอบ</button>
                    </div>
                )}

                {scheduleStatus === 'missing_today' && (
                    <div className="bg-[#DC2626] rounded-[20px] sm:rounded-[24px] flex items-center justify-between shadow-lg shadow-rose-200/50 overflow-hidden relative">
                        <div className="absolute -left-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                        <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-white relative z-10">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">
                                <WarningCircle weight="fill" size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm sm:text-lg leading-tight">ยังไม่จัดตารางงานวันนี้!</h3>
                                <p className="text-[10px] sm:text-xs text-white/90 mt-0.5">พนักงานจะไม่สามารถเข้างานได้</p>
                            </div>
                        </div>
                        <button onClick={() => navigate('/schedule')} className="bg-white text-[#DC2626] px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-bold text-[10px] sm:text-xs shadow-md m-2 sm:m-4 hover:bg-rose-50 transition active:scale-95 whitespace-nowrap z-10">จัดการด่วน</button>
                    </div>
                )}

                {scheduleStatus === 'missing_tomorrow' && (
                    <div className="bg-[#DC2626] rounded-[20px] sm:rounded-[24px] flex items-center justify-between shadow-lg shadow-rose-200/50 overflow-hidden relative">
                        <div className="absolute -left-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                        <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-white relative z-10">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">
                                <WarningCircle weight="fill" size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm sm:text-lg leading-tight">ยังไม่จัดตารางงาน</h3>
                                <p className="text-[10px] sm:text-xs text-white/80 mt-0.5">สำหรับวันพรุ่งนี้</p>
                            </div>
                        </div>
                        <button onClick={() => navigate('/schedule')} className="bg-white text-[#DC2626] px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-bold text-[10px] sm:text-xs shadow-md m-2 sm:m-4 hover:bg-rose-50 transition active:scale-95 whitespace-nowrap z-10">จัดการเลย</button>
                    </div>
                )}

                {scheduleStatus === 'ready' && (
                    <div className="bg-[#059669] rounded-[20px] sm:rounded-[24px] flex items-center justify-between shadow-lg shadow-emerald-200/50 overflow-hidden relative">
                        <div className="absolute -left-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                        <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-white relative z-10">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">
                                <CheckCircle weight="fill" size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm sm:text-lg leading-tight">ตารางงานพร้อมแล้ว</h3>
                                <p className="text-[10px] sm:text-xs text-white/80 mt-0.5">ระบบพร้อมใช้งาน</p>
                            </div>
                        </div>
                        <button onClick={() => navigate('/schedule', { state: { viewMode: 'monthly' } })} className="bg-white text-[#059669] px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-bold text-[10px] sm:text-xs shadow-md m-2 sm:m-4 hover:bg-emerald-50 transition active:scale-95 whitespace-nowrap z-10">ดูรายเดือน</button>
                    </div>
                )}
            </div>

            {/* Security Alerts (🔴 สำคัญที่สุด ให้วางไว้บนสุด) */}
            {securityAlerts.map(req => (
                <div
                    key={req.id}
                    onClick={() => navigate('/requests')}
                    className="relative flex items-center justify-between p-5 mb-6 rounded-2xl bg-red-50 border border-red-100 shadow-sm hover:shadow-md hover:bg-red-100/80 cursor-pointer transition-all duration-300 animate-pulse group overflow-hidden"
                >
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                            {/* อย่าลืม import WarningOctagon */}
                            <WarningCircle weight="fill" size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-xs sm:text-sm font-bold text-red-700 truncate">{req.title || 'Security Alert'}</p>
                                <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">DANGER</span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-red-500 mt-0.5 truncate">{req.detail}</p>
                            <p className="text-[9px] text-red-400 mt-0.5 font-medium">User: {req.userName}</p>
                        </div>
                    </div>
                    <CaretRight className="text-red-300" weight="bold" />
                </div>
            ))}

            {/* 4. NOTIFICATIONS */}
            <div>
                <div className="flex justify-between items-center mb-4 px-1">
                    <h3 className="font-bold text-base sm:text-lg text-[#0F172A]">รายการแจ้งเตือน (Notifications)</h3>
                    <div className="flex gap-2">
                        <button onClick={() => navigate('/requests')} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 shadow-sm transition active:scale-95 text-xs font-bold"><Clock size={16} /></button>
                        <button onClick={() => navigate('/requests')} className="px-3 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 shadow-sm transition active:scale-95 text-[10px] font-bold">ดูทั้งหมด</button>
                    </div>
                </div>

                <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">

                    {/* Alerts */}
                    {urgentAlerts.map(req => (
                        <div
                            key={req.id}
                            onClick={() => navigate('/requests')}
                            className="flex items-center justify-between p-4 border-b border-slate-50 bg-rose-50/60 hover:bg-rose-50 cursor-pointer transition-colors"
                        >
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center flex-shrink-0">
                                    <WarningCircle weight="bold" size={20} />
                                </div>
                                <div>
                                    <p className="text-xs sm:text-sm font-bold text-rose-700">{req.userName}</p>
                                    <p className="text-[10px] sm:text-xs text-rose-400 mt-0.5">เข้างานนอกตาราง</p>
                                </div>
                            </div>
                            <span className="bg-rose-200/50 text-rose-600 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold whitespace-nowrap">ACTION NEEDED</span>
                        </div>
                    ))}

                    {/* Requests */}
                    {normalRequests.map(req => (
                        <div
                            key={req.id}
                            onClick={() => navigate('/requests')}
                            className="flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center flex-shrink-0 text-sm">
                                    {req.userName.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-xs sm:text-sm font-bold text-[#0F172A]">{req.userName}</p>
                                    <p className={`text-[10px] sm:text-xs mt-0.5 font-bold ${req.type === 'leave' ? 'text-orange-500' : 'text-blue-500'}`}>
                                        {req.type === 'leave' ? 'ลางาน' : 'แก้เวลา'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="bg-slate-100 text-slate-500 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold">PENDING</span>
                                <CaretRight className="text-slate-300 hidden sm:block" size={14} />
                            </div>
                        </div>
                    ))}

                    {pendingRequests.length === 0 && (
                        <div className="p-10 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                                <BellRinging size={24} />
                            </div>
                            <p className="text-xs text-slate-400">ไม่มีรายการแจ้งเตือนใหม่</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}