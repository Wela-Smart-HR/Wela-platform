import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../shared/lib/firebase';
import AttendanceMiniMap from '../../components/employee/AttendanceMiniMap';
import LocationHelpModal from '../../components/employee/LocationHelpModal';
import {
    MapPin, Fingerprint, CheckCircle, X, CalendarBlank, Timer,
    WarningCircle, SignOut, ClockCounterClockwise,
    Clock, WarningOctagon, UserCircle, Crosshair,
    CaretLeft, CaretRight, Briefcase, ArrowsClockwise, Info
} from '@phosphor-icons/react';

import { useSalaryCalculator } from '../../hooks/useSalaryCalculator';
import { useDialog } from '../../contexts/DialogContext';

// ✅ NEW: Hook จาก Features Architecture (พร้อมใช้ในการ refactor ต่อ)
import { useMyAttendance } from '../../features/attendance/useMyAttendance';

// === Utility ===
const formatDateForInput = (dateObj) => {
    if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj)) return '';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function TimeAttendance() {
    const { currentUser } = useAuth();
    const locationRoute = useLocation();
    const navigate = useNavigate();
    const dialog = useDialog();

    // ===================================================
    // 📦 STATE - ต้องประกาศก่อน Hook
    // ===================================================
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // ===================================================
    // 🎯 ใช้ Hook จาก Features Architecture
    // ===================================================
    // Hook นี้จัดการ: GPS, Config, Clock In/Out, Offline, Logs
    // ดู useMyAttendance.js สำหรับรายละเอียด
    const {
        // GPS
        location: hookLocation,
        locationStatus: hookLocationStatus,
        distance: hookDistance,
        gpsError: hookGpsError,
        retryGps,

        // Config
        companyConfig: hookCompanyConfig,

        // Data
        todayRecord: hookTodayRecord,
        attendanceLogs: hookAttendanceLogs,  // ✅ ประวัติรายเดือน
        schedules: hookSchedules,            // ✅ ตารางเวลา
        todaySchedule: hookTodaySchedule,    // ✅ ตารางวันนี้

        // สถานะ
        loading: hookLoading,
        isOffline,

        // ===== Actions =====
        clockIn: hookClockIn,
        clockOut: hookClockOut,
        submitRetroRequest: hookSubmitRetro,  // ✅ ส่งขอเวลาย้อนหลัง
        syncOfflineData: hookSyncOffline,      // ✅ Sync offline
        reload: reloadTodayRecord
    } = useMyAttendance(currentUser?.uid, currentUser?.companyId, currentMonth);

    // ===================================================
    // 📦 STATE - UI เท่านั้น (ไม่เกี่ยวกับ business logic)
    // ===================================================
    const [activeTab, setActiveTab] = useState(locationRoute.state?.defaultTab || 'scan');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showMap, setShowMap] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // ===================================================
    // 📊 STATE - จาก Hook (ไม่ต้อง useState)
    // ===================================================
    const currentLocation = hookLocation;
    const locationStatus = hookLocationStatus || 'loading';
    const distance = hookDistance;
    const gpsErrorMsg = hookGpsError || '';
    const companyConfig = hookCompanyConfig || { location: null, radius: 350, greeting: { onTime: 'สวัสดีครับ', late: 'สายแล้วนะ' } };
    const deductionConfig = hookCompanyConfig?.deduction || { gracePeriod: 5, deductionPerMinute: 10, maxDeduction: 300 };
    const todayRecord = hookTodayRecord;
    const attendanceList = hookAttendanceLogs || [];
    const schedules = hookSchedules || [];
    const todaySchedule = hookTodaySchedule;

    // ===================================================
    // 📦 STATE - UI Only
    const [clocking, setClocking] = useState(false);
    const [filterType, setFilterType] = useState('All');
    const [expandedId, setExpandedId] = useState(null);
    const [isRetroModalOpen, setIsRetroModalOpen] = useState(locationRoute.state?.openRetro || false);
    const [retroForm, setRetroForm] = useState({ date: '', timeIn: '', timeOut: '', reason: '', location: '' });
    const [showGreetingPopup, setShowGreetingPopup] = useState(false);
    const [greetingMessage, setGreetingMessage] = useState({ title: '', text: '', isLate: false, type: 'in' });
    const popupTimeoutRef = useRef(null);

    // Hold Button Interaction
    const [isHolding, setIsHolding] = useState(false);
    const [progress, setProgress] = useState(0);
    const holdIntervalRef = useRef(null);
    const HOLD_DURATION = 1500;

    // ⏰ Clock Timer
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const { dailyBreakdown } = useSalaryCalculator(attendanceList, schedules, deductionConfig, currentMonth, deductionConfig.employmentType);

    const sortedLogs = dailyBreakdown
        .filter(item => {
            if (filterType === 'All') return true;
            if (filterType === 'Late') return item.status === 'late';
            if (filterType === 'Absent') return item.status === 'absent';
            if (filterType === 'Deducted') return item.deduction > 0;
            return true;
        })
        .sort((a, b) => b.date - a.date);

    const changeMonth = (offset) => { setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1)); };

    const startHold = () => {
        if (clocking || activeTab !== 'scan' || locationStatus !== 'success') {
            if (locationStatus === 'out-of-range') {
                dialog.showAlert(`คุณอยู่นอกพื้นที่ (${Math.round(distance)} ม.)\nกรุณาขยับเข้าใกล้ร้าน`, "Out of Range", "error");
            }
            else if (locationStatus === 'error' || locationStatus === 'loading') {
                // ลองเรียก GPS อีกรอบเผื่อมันหลับ
                retryGps();
                dialog.showAlert(gpsErrorMsg || "กำลังค้นหาพิกัด...", "GPS", "warning");
            }
            return;
        }
        setIsHolding(true);
        let startTime = Date.now();
        holdIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
            setProgress(newProgress);
            if (newProgress >= 100) {
                clearInterval(holdIntervalRef.current);
                if (navigator.vibrate) navigator.vibrate(50);
                const actionType = (!todayRecord || todayRecord.actionType === 'clock-out') ? 'clock-in' : 'clock-out';
                handleClockAction(actionType);
                setIsHolding(false); setProgress(0);
            }
        }, 10);
    };
    const cancelHold = () => { if (progress < 100) { setIsHolding(false); setProgress(0); clearInterval(holdIntervalRef.current); } };

    // ===================================================
    // ⏰ CLOCK IN/OUT - ใช้จาก Hook
    // ===================================================
    const handleClockAction = async (type) => {
        setClocking(true);

        try {
            let result;

            if (type === 'clock-in') {
                // ส่ง schedule data สำหรับคำนวณสาย
                result = await hookClockIn({ scheduleData: todaySchedule });
            } else {
                result = await hookClockOut();
            }

            if (result.success) {
                // ✅ ถ้า Offline ให้แจ้งเตือนแบบเดิม
                if (result.offline) {
                    dialog.showAlert("ไม่มีสัญญาณอินเทอร์เน็ต\nบันทึกข้อมูลในเครื่องแล้ว ระบบจะอัปโหลดเมื่อมีสัญญาณ", "Offline Mode", "warning");
                } else {
                    // แสดง Greeting Popup
                    setGreetingMessage({
                        title: result.message,
                        text: '',
                        isLate: result.isLate || false,
                        type
                    });
                    setShowGreetingPopup(true);
                    clearTimeout(popupTimeoutRef.current);
                    popupTimeoutRef.current = setTimeout(() => setShowGreetingPopup(false), 5000);
                }
            } else {
                // แสดง error
                dialog.showAlert(result.message, "Error", "error");
            }
        } catch (err) {
            console.error('Clock action error:', err);
            dialog.showAlert("เกิดข้อผิดพลาด: " + err.message, "Error", "error");
        } finally {
            setClocking(false);
        }
    };

    // ===================================================
    // 📝 RETRO REQUEST - ใช้จาก Hook
    // ===================================================
    const handleRetroSubmit = async () => {
        if (!retroForm.date || !retroForm.timeIn || !retroForm.timeOut || !retroForm.reason) {
            return dialog.showAlert("กรุณากรอกข้อมูลให้ครบถ้วน", "ข้อมูลไม่ครบ", "warning");
        }

        setClocking(true);
        const result = await hookSubmitRetro({
            ...retroForm,
            userName: currentUser.name
        });
        setClocking(false);

        if (result.success) {
            await dialog.showAlert(result.message, "สำเร็จ", "success");
            setIsRetroModalOpen(false);
            setRetroForm({ date: '', timeIn: '', timeOut: '', reason: '', location: currentLocation?.address || '' });
        } else {
            dialog.showAlert(result.message, "Error", "error");
        }
    };

    const formatTime = (timestamp) => timestamp ? timestamp.toDate().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const isClockIn = !todayRecord || todayRecord.actionType === 'clock-out';
    const accentColor = isClockIn ? 'text-[#007AFF]' : 'text-[#FF3B30]';
    const ringColor = isClockIn ? '#007AFF' : '#FF3B30';
    const glowColor = isClockIn ? 'shadow-[0_20px_50px_-12px_rgba(0,122,255,0.3)]' : 'shadow-[0_20px_50px_-12px_rgba(255,59,48,0.3)]';

    const btnSize = 340;
    const radius = 135;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="h-[100dvh] bg-[#F2F2F7] font-sans text-slate-900 relative overflow-hidden select-none flex flex-col">

            {activeTab === 'scan' && (
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[5%] -left-[10%] w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob bg-blue-300"></div>
                    <div className="absolute top-[15%] -right-[10%] w-96 h-96 rounded-full bg-purple-300 mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                </div>
            )}

            {/* Header & Tabs */}
            <div className="relative z-10 px-6 pt-8 pb-2 shrink-0">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                            {currentTime.toLocaleDateString('en-US', { weekday: 'long' })}, {currentTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                        </p>
                        <h1 className="text-3xl font-extrabold text-[#1C1C1E] tracking-tight">Attendance</h1>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-sm flex items-center justify-center text-slate-400">
                        <UserCircle size={24} weight="fill" />
                    </div>
                </div>

                <div className="bg-[#767680]/15 p-1 rounded-xl flex backdrop-blur-sm">
                    <button onClick={() => setActiveTab('scan')} className={`flex-1 py-1.5 rounded-[10px] text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'scan' ? 'bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.12)]' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Fingerprint weight={activeTab === 'scan' ? "fill" : "bold"} size={14} /> Scan
                    </button>
                    <button onClick={() => setActiveTab('logs')} className={`flex-1 py-1.5 rounded-[10px] text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'logs' ? 'bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.12)]' : 'text-slate-500 hover:text-slate-700'}`}>
                        <ClockCounterClockwise weight={activeTab === 'logs' ? "fill" : "bold"} size={14} /> Logs
                    </button>
                </div>
            </div>

            {/* === TAB 1: SCAN (UI Layout Fixed here!) === */}
            {activeTab === 'scan' && (
                // ✅ FIX: เปลี่ยนจาก justify-evenly เป็น justify-start + gap-8 + padding-top
                <div className="relative z-10 px-6 flex-1 flex flex-col items-center justify-start gap-8 pt-8 pb-24 animate-fade-in">

                    {/* Shift & Location Status */}
                    <div className="flex items-center justify-center gap-2 w-full">
                        <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/50 shadow-sm">
                            <Briefcase size={14} className="text-slate-500" weight="duotone" />
                            <span className="text-[10px] font-bold text-slate-600">
                                {todaySchedule ? `${todaySchedule.startTime} - ${todaySchedule.endTime}` : "No shift"}
                            </span>
                        </div>

                        <div className="flex items-center gap-1">
                            <div
                                onClick={() => {
                                    // กดที่สถานะเพื่อบังคับโหลด GPS ใหม่
                                    retryGps();
                                    setShowMap(true);
                                }}
                                className={`backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${locationStatus === 'success' ? 'bg-emerald-50/80 border-emerald-100 text-emerald-600' : (locationStatus === 'out-of-range' ? 'bg-orange-50 border-orange-200 text-orange-600' : locationStatus === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-100 border-slate-200 text-slate-500')}`}
                            >
                                {locationStatus === 'success' ? <CheckCircle weight="fill" size={14} /> :
                                    locationStatus === 'out-of-range' ? <WarningCircle weight="fill" size={14} /> :
                                        locationStatus === 'error' ? <ArrowsClockwise weight="bold" size={14} className="animate-pulse" /> :
                                            <Crosshair className="animate-spin" size={14} />}

                                <span className="text-[10px] font-bold truncate max-w-[140px]">
                                    {locationStatus === 'success' ? "In Range" :
                                        locationStatus === 'out-of-range' ? "Out of Area" :
                                            locationStatus === 'error' ? (gpsErrorMsg || "Retry GPS") :
                                                "Locating..."}
                                </span>
                            </div>

                            <button
                                onClick={() => setShowHelp(true)}
                                className="w-8 h-8 bg-white/60 backdrop-blur-md rounded-full border border-white/50 shadow-sm flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-white transition-all active:scale-95"
                            >
                                <Info weight="bold" size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Clock */}
                    <div className="text-center relative">
                        <h1 className="text-[5rem] font-bold text-[#1C1C1E] tracking-tighter tabular-nums drop-shadow-sm leading-none">
                            {currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                        </h1>
                        <span className={`text-sm font-bold tracking-tight mt-2 block ${accentColor}`}>
                            {isClockIn ? 'Ready to Clock In' : 'Ready to Clock Out'}
                        </span>

                        {locationStatus === 'out-of-range' && distance && (
                            <span className="text-[10px] text-orange-500 font-bold mt-1 block animate-pulse">
                                ห่างจากจุดเช็คอิน {Math.round(distance)} เมตร
                            </span>
                        )}
                    </div>

                    {/* Fingerprint Button */}
                    <div className="relative group flex items-center justify-center">
                        <svg width={btnSize} height={btnSize} className="-rotate-90 transform drop-shadow-lg absolute pointer-events-none">
                            <circle cx={btnSize / 2} cy={btnSize / 2} r={radius} fill="none" stroke="#E5E5EA" strokeWidth="8" strokeLinecap="round" />
                            <circle
                                cx={btnSize / 2} cy={btnSize / 2} r={radius} fill="none" stroke={ringColor} strokeWidth="8"
                                strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                                className="transition-all duration-75 ease-linear"
                            />
                        </svg>
                        <div
                            className="z-10"
                            onMouseDown={startHold} onMouseUp={cancelHold} onMouseLeave={cancelHold}
                            onTouchStart={startHold} onTouchEnd={cancelHold}
                        >
                            <div
                                className={`w-60 h-60 rounded-full bg-white flex items-center justify-center transition-all duration-300 cursor-pointer select-none ${glowColor} 
                        ${isHolding ? 'scale-95 shadow-[inset_0_4px_12px_rgba(0,0,0,0.05)]' : 'shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1)] hover:scale-105'}
                        ${locationStatus !== 'success' ? 'opacity-50 grayscale cursor-not-allowed' : ''} 
                        `}
                            >
                                <div className="flex flex-col items-center gap-2">
                                    <Fingerprint weight="fill" className={`w-28 h-28 transition-colors duration-300 ${accentColor} ${isHolding ? 'animate-pulse' : ''}`} />
                                    <span className="text-[11px] font-bold text-slate-300 tracking-[0.2em] uppercase mt-2">
                                        {isHolding ? "HOLDING..." : "HOLD"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsRetroModalOpen(true)}
                        className="text-slate-400 text-[10px] font-bold tracking-wide hover:text-slate-600 transition flex items-center gap-1.5 py-2 px-4 rounded-full hover:bg-white/50"
                    >
                        <WarningCircle size={14} /> Forgot? Request Adjustment
                    </button>
                </div>
            )}

            {/* === TAB 2: TIME LOGS (เหมือนเดิม) === */}
            {activeTab === 'logs' && (
                <div className="relative z-10 px-6 flex-1 overflow-y-auto no-scrollbar pb-28 animate-fade-in">
                    <div className="flex justify-between items-center mb-4 bg-white p-2 rounded-xl shadow-sm border border-slate-100 sticky top-0 z-20">
                        <button onClick={() => changeMonth(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-400 transition"><CaretLeft weight="bold" size={16} /></button>
                        <h2 className="text-sm font-bold text-slate-800">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
                        <button onClick={() => changeMonth(1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-400 transition"><CaretRight weight="bold" size={16} /></button>
                    </div>

                    <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
                        {['All', 'Late', 'Absent', 'Deducted'].map(type => (
                            <button key={type} onClick={() => setFilterType(type)} className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border whitespace-nowrap ${filterType === type ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-500 border-slate-200'}`}>{type}</button>
                        ))}
                    </div>

                    <div className="space-y-3">
                        {sortedLogs.length === 0 ? (
                            <div className="text-center py-10 opacity-40"><Clock size={40} className="mx-auto mb-2 text-slate-300" /><p className="text-sm font-medium text-slate-400">No records found this month</p></div>
                        ) : (
                            sortedLogs.map((item) => {
                                let config = { bg: 'bg-[#E8F8ED]', text: 'text-[#34C759]', label: 'ON TIME', bar: 'bg-[#34C759]' };
                                if (item.status === 'upcoming') { config = { bg: 'bg-slate-50', text: 'text-slate-400', label: 'FUTURE', bar: 'bg-slate-200' }; }
                                else if (item.status === 'today') { config = { bg: 'bg-blue-50', text: 'text-blue-600', label: 'TODAY', bar: 'bg-blue-500' }; }
                                else if (item.status === 'late') { config = { bg: 'bg-[#FFF4E5]', text: 'text-[#FF9500]', label: `LATE ${item.lateMinutes || 0}m`, bar: 'bg-[#FF9500]' }; }
                                else if (item.status === 'absent') { config = { bg: 'bg-[#FEE2E2]', text: 'text-[#EF4444]', label: 'MISSING', bar: 'bg-[#EF4444]' }; }
                                else if (item.status === 'off') { config = { bg: 'bg-slate-50', text: 'text-slate-400', label: 'DAY OFF', bar: 'bg-slate-300' }; }
                                if (item.deduction > 0) { config.label = `-${item.deduction} THB`; config.text = 'text-rose-500'; config.bg = 'bg-rose-50'; }

                                const itemKey = item.date.getTime();
                                const isExpanded = expandedId === itemKey;

                                return (
                                    <div key={itemKey} onClick={() => setExpandedId(isExpanded ? null : itemKey)} className={`bg-white rounded-[20px] shadow-sm border border-slate-50 overflow-hidden transition-all duration-300 cursor-pointer ${isExpanded ? 'ring-2 ring-blue-100 shadow-md' : ''}`}>
                                        <div className="p-4 flex items-center justify-between">
                                            <div className="flex flex-col items-center justify-center w-10 shrink-0">
                                                <span className={`text-lg font-bold leading-none ${item.status === 'absent' ? 'text-rose-500' : 'text-slate-700'}`}>{item.date.getDate()}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{item.date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                            </div>
                                            <div className={`w-1 h-8 rounded-full mx-4 shrink-0 ${config.bar} opacity-80`}></div>
                                            <div className="flex-1">
                                                {item.status === 'absent' ? (<span className="text-sm font-bold text-rose-500">Missing Entry <span className="text-[10px] font-normal text-slate-400 ml-1">(Tap to fix)</span></span>) : item.status === 'upcoming' ? (<span className="text-sm font-bold text-slate-400">Future Work</span>) : (<><div className="text-sm font-bold text-slate-800 tracking-tight">{item.hasRecord ? formatTime(item.clockIn?.createdAt) : '--:--'} - {item.hasRecord ? formatTime(item.clockOut?.createdAt) : '--:--'}</div><div className="text-[10px] font-medium text-slate-400 mt-0.5 flex items-center gap-1"><Clock weight="fill" size={12} />{item.hasRecord ? 'Work' : 'No Record'}</div></>)}
                                            </div>
                                            <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${config.bg} ${config.text}`}>{config.label}</div>
                                        </div>
                                        {isExpanded && item.hasRecord && (
                                            <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex flex-col gap-2 animate-fade-in">
                                                <div className="flex items-start gap-3"><MapPin className="text-slate-400 mt-0.5" weight="fill" size={16} /><div><p className="text-xs font-bold text-slate-600 mb-0.5">Location</p><p className="text-[10px] text-slate-500 leading-relaxed">{item.clockIn?.location?.address || "GPS Coordinates"}</p></div></div>
                                                {item.deduction > 0 && (<div className="flex items-start gap-3 mt-1 bg-white border border-rose-100 p-2 rounded-xl"><div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shrink-0"><WarningOctagon weight="fill" size={16} /></div><div className="flex-1"><div className="flex justify-between items-center"><p className="text-xs font-bold text-rose-600">Late Penalty</p><span className="text-xs font-bold text-rose-600">-฿{item.deduction}</span></div><p className="text-[10px] text-slate-500 mt-0.5">Late: {item.lateMinutes} mins {item.isCapped && <span className="block text-rose-500 font-bold mt-0.5">*Max Limit</span>}</p></div></div>)}
                                            </div>
                                        )}
                                        {isExpanded && item.status === 'absent' && (
                                            <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 animate-fade-in">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setIsRetroModalOpen(true); setRetroForm(prev => ({ ...prev, date: formatDateForInput(item.date) })); }}
                                                    className="w-full py-2 bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-200"
                                                >
                                                    Request Adjustment
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Retro Modal */}
            {isRetroModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center font-sans">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setIsRetroModalOpen(false)}></div>
                    <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl relative z-10 flex flex-col max-h-[90vh] animate-slide-up overflow-hidden">
                        <div className="px-6 pt-6 pb-4 flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Timer weight="duotone" className="text-blue-500" /> Request Adjustment</h2>
                            <button onClick={() => setIsRetroModalOpen(false)} className="w-8 h-8 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 flex items-center justify-center"><X weight="bold" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
                            <div className="flex gap-4">
                                <div className="flex-1"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">Time In</label><input type="time" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" value={retroForm.timeIn} onChange={(e) => setRetroForm({ ...retroForm, timeIn: e.target.value })} /></div>
                                <div className="flex-1"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">Time Out</label><input type="time" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" value={retroForm.timeOut} onChange={(e) => setRetroForm({ ...retroForm, timeOut: e.target.value })} /></div>
                            </div>
                            <div><label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">Date</label><input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" value={retroForm.date} onChange={(e) => setRetroForm({ ...retroForm, date: e.target.value })} /></div>
                            <div><label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">Reason</label><textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-800 outline-none resize-none h-24 focus:ring-2 focus:ring-blue-100" placeholder="Why are you adjusting?" value={retroForm.reason} onChange={(e) => setRetroForm({ ...retroForm, reason: e.target.value })}></textarea></div>
                            <div className="pt-4 pb-4"><button onClick={handleRetroSubmit} disabled={clocking} className="w-full bg-[#007AFF] text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-blue-500/20 active:scale-95 transition">Send Request</button></div>
                        </div>
                    </div>
                </div>, document.body
            )}

            {showGreetingPopup && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-6 pointer-events-none">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"></div>
                    <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl p-6 animate-zoom-in pointer-events-auto flex flex-col items-center text-center relative z-10">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${greetingMessage.isLate ? 'bg-orange-50 text-orange-500' : 'bg-[#E8F8ED] text-[#34C759]'}`}>{greetingMessage.isLate ? <WarningCircle weight="fill" size={40} /> : <CheckCircle weight="fill" size={40} />}</div>
                        <h3 className="font-extrabold text-2xl text-slate-900 mb-2">{greetingMessage.title}</h3>
                        <p className="text-slate-500 text-sm font-medium mb-6 px-4 leading-relaxed">{greetingMessage.text}</p>
                        <button onClick={() => setShowGreetingPopup(false)} className="w-full bg-[#2563EB] text-white py-3.5 rounded-xl font-bold text-sm shadow-lg">Done</button>
                    </div>
                </div>
            )}

            {/* Helper Modals */}
            <LocationHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
            <AttendanceMiniMap isOpen={showMap} onClose={() => setShowMap(false)} userLocation={currentLocation} companyLocation={companyConfig.location} radius={companyConfig.radius} />
        </div>
    );
}