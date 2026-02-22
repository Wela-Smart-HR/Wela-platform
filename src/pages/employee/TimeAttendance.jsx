import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../shared/lib/firebase';
import {
    MapPin, Fingerprint, CheckCircle, X, CalendarBlank, Timer,
    WarningCircle, SignOut, ClockCounterClockwise,
    Clock, WarningOctagon, UserCircle, Crosshair,
    CaretLeft, CaretRight, Briefcase, ArrowsClockwise, Info
} from '@phosphor-icons/react';

// Hooks
import { useSalaryCalculator } from '../../hooks/useSalaryCalculator';
import { useDialog } from '../../contexts/DialogContext';
import { useMyAttendance } from '../../features/attendance/useMyAttendance';
import { useMyRequests } from '../../features/requests/useMyRequests';

// Components (Lazy Load for Performance)
const AttendanceMiniMap = React.lazy(() => import('../../components/employee/AttendanceMiniMap'));
const LocationHelpModal = React.lazy(() => import('../../components/employee/LocationHelpModal'));
import LiveClock from '../../components/employee/LiveClock';
import HoldButton from '../../components/employee/HoldButton';
import RetroRequestModal from '../../components/employee/Modals/RetroRequestModal';
import UnscheduledWorkModal from '../../components/employee/Modals/UnscheduledWorkModal';
import CloseShiftModal from '../../components/employee/Modals/CloseShiftModal';
import ShiftSelectionModal from '../../components/employee/Modals/ShiftSelectionModal';

// Utilities
const formatDateForInput = (dateObj) => {
    if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj)) return '';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatTime = (timestamp) => {
    if (!timestamp) return '--:--';
    const date = timestamp.toDate ? timestamp.toDate() : timestamp;
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};

export default function TimeAttendance() {
    const { currentUser } = useAuth();
    const locationRoute = useLocation();
    const navigate = useNavigate();
    const dialog = useDialog();

    // ===================================================
    // 📦 STATE - UI
    // ===================================================
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [activeTab, setActiveTab] = useState(locationRoute.state?.defaultTab || 'scan');
    const [showMap, setShowMap] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // ===================================================
    // 🎯 Use Hooks
    // ===================================================
    const {
        location: hookLocation,
        locationStatus: hookLocationStatus,
        distance: hookDistance,
        gpsError: hookGpsError,
        retryGps,
        companyConfig: hookCompanyConfig,
        todayRecord: hookTodayRecord,
        attendanceLogs: hookAttendanceLogs,
        schedules: hookSchedules,
        todaySchedule: hookTodaySchedule,
        loading: hookLoading,
        isOffline,
        clockIn: hookClockIn,
        clockOut: hookClockOut,
        submitRetroRequest: hookSubmitRetro,
        isStuck,
        staleCheckIn,
        closeStaleShift
    } = useMyAttendance(currentUser?.uid, currentUser?.companyId, currentMonth);

    // Mapped State
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

    // UI Action State
    const [clocking, setClocking] = useState(false);
    const [filterType, setFilterType] = useState('All');
    const [expandedId, setExpandedId] = useState(null);
    const [isRetroModalOpen, setIsRetroModalOpen] = useState(locationRoute.state?.openRetro || false);
    const [retroForm, setRetroForm] = useState({ date: '', timeIn: '', timeOut: '', reason: '', location: '' });

    // Close Shift Modal State
    const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
    const [closeShiftForm, setCloseShiftForm] = useState({ date: '', outTime: '', reason: '' });

    // Unscheduled Work Request Modal State
    const [isUnscheduledModalOpen, setIsUnscheduledModalOpen] = useState(false);
    const todayDateStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    const [unscheduledForm, setUnscheduledForm] = useState({ date: todayDateStr, timeIn: '', timeOut: '', reason: '' });

    const [showGreetingPopup, setShowGreetingPopup] = useState(false);
    const [greetingMessage, setGreetingMessage] = useState({ title: '', text: '', isLate: false, type: 'in' });
    const popupTimeoutRef = useRef(null);

    // Shift Selection Modal State
    const [showShiftSelectModal, setShowShiftSelectModal] = useState(false);
    const [masterShifts, setMasterShifts] = useState([]);
    const [selectedShiftId, setSelectedShiftId] = useState('');

    // ===================================================
    // ⚡️ Performance Optimization (Memoization)
    // ===================================================
    const { dailyBreakdown } = useSalaryCalculator(
        attendanceList,
        schedules,
        deductionConfig,
        currentMonth,
        deductionConfig.employmentType
    );

    // Unscheduled Work Request Hook
    const { submitUnscheduledWorkRequest } = useMyRequests(currentUser);

    const sortedLogs = useMemo(() => {
        return dailyBreakdown
            .filter(item => {
                if (filterType === 'All') return true;
                if (filterType === 'Late') return item.status === 'late';
                if (filterType === 'Absent') return item.status === 'absent';
                if (filterType === 'Deducted') return item.deduction > 0;
                return true;
            })
            .sort((a, b) => b.date - a.date);
    }, [dailyBreakdown, filterType]);

    const changeMonth = (offset) => { setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1)); };
    const displayDate = new Date();
    const isClockIn = !todayRecord || todayRecord.actionType === 'clock-out';

    // ===================================================
    // ⏰ Actions & Logics
    // ===================================================

    // Load Master Shifts
    useEffect(() => {
        if (companyConfig?.shifts) {
            setMasterShifts(companyConfig.shifts);
        }
    }, [companyConfig]);

    // Handle Attempt Clock
    const handleAttemptClock = () => {
        if (clocking || activeTab !== 'scan' || locationStatus !== 'success') {
            if (locationStatus === 'out-of-range') {
                dialog.showAlert(`คุณอยู่นอกพื้นที่ (${Math.round(distance)} ม.)\nกรุณาขยับเข้าใกล้ร้าน`, "Out of Range", "error");
            } else if (locationStatus === 'error' || locationStatus === 'loading') {
                retryGps();
                dialog.showAlert(gpsErrorMsg || "กำลังค้นหาพิกัด...", "GPS", "warning");
            }
            return;
        }

        const isClockInAction = !todayRecord || todayRecord.actionType === 'clock-out';

        // ถ้าตอกเข้า และไม่มีกะ ให้เด้ง Modal เลือกกะก่อน
        if (isClockInAction && !todaySchedule) {
            setShowShiftSelectModal(true);
            return;
        }

        performClockAction(isClockInAction ? 'clock-in' : 'clock-out');
    };

    // Standard Clock Action
    const performClockAction = async (type) => {
        setClocking(true);
        try {
            let result;
            if (type === 'clock-in') {
                result = await hookClockIn({ scheduleData: todaySchedule });
            } else {
                result = await hookClockOut();
            }

            if (result.success) {
                if (result.offline) {
                    dialog.showAlert("ไม่มีสัญญาณอินเทอร์เน็ต\nบันทึกข้อมูลในเครื่องแล้ว", "Offline Mode", "warning");
                } else {
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
                dialog.showAlert(result.message, "Error", "error");
            }
        } catch (err) {
            console.error('Clock action error:', err);
            dialog.showAlert("เกิดข้อผิดพลาด: " + err.message, "Error", "error");
        } finally {
            setClocking(false);
        }
    };

    // Unscheduled Clock In Action
    const proceedWithUnscheduledClockIn = async (selectedShiftId) => {
        setShowShiftSelectModal(false);
        setSelectedShiftId('');
        setClocking(true);

        try {
            const result = await hookClockIn({
                isUnscheduled: true,
                requestedShiftId: selectedShiftId,
                scheduleData: null
            });

            if (result.success) {
                if (result.offline) {
                    dialog.showAlert("ไม่มีสัญญาณอินเทอร์เน็ต\nบันทึกข้อมูลในเครื่องแล้ว", "Offline Mode", "warning");
                } else {
                    setGreetingMessage({
                        title: result.message,
                        text: 'รอ Admin อนุมัติการทำงานนอกตาราง',
                        isLate: result.isLate || false,
                        type: 'clock-in'
                    });
                    setShowGreetingPopup(true);
                    clearTimeout(popupTimeoutRef.current);
                    popupTimeoutRef.current = setTimeout(() => setShowGreetingPopup(false), 5000);
                }
            } else {
                dialog.showAlert(result.message, "Error", "error");
            }
        } catch (err) {
            console.error('Unscheduled clock-in error:', err);
            dialog.showAlert("เกิดข้อผิดพลาด: " + err.message, "Error", "error");
        } finally {
            setClocking(false);
        }
    };

    // Submit Retro Request
    const handleRetroSubmit = async () => {
        if (!retroForm.date || !retroForm.timeIn || !retroForm.timeOut || !retroForm.reason) {
            return dialog.showAlert("กรุณากรอกข้อมูลให้ครบถ้วน", "ข้อมูลไม่ครบ", "warning");
        }
        setClocking(true);
        const result = await hookSubmitRetro({ ...retroForm, userName: currentUser.name });
        setClocking(false);

        if (result.success) {
            await dialog.showAlert(result.message, "สำเร็จ", "success");
            setIsRetroModalOpen(false);
            setRetroForm({ date: '', timeIn: '', timeOut: '', reason: '', location: currentLocation?.address || '' });
        } else {
            dialog.showAlert(result.message, "Error", "error");
        }
    };

    // Submit Unscheduled Form
    const handleUnscheduledWorkSubmit = async () => {
        if (!unscheduledForm.date || !unscheduledForm.timeIn || !unscheduledForm.timeOut) {
            return dialog.showAlert("กรุณากรอกวันที่ และเวลาเข้า-ออกงาน", "ข้อมูลไม่ครบ", "warning");
        }
        setClocking(true);
        try {
            const result = await submitUnscheduledWorkRequest({
                date: unscheduledForm.date,
                timeIn: unscheduledForm.timeIn,
                timeOut: unscheduledForm.timeOut,
                reason: unscheduledForm.reason || 'ไม่มีกะงาน ขออนุมัติวันทำงาน',
            });
            await dialog.showAlert(`ส่งคำขอเรียบร้อยแล้ว (${result.documentNo})\nรอ Admin อนุมัติ`, "สำเร็จ", "success");
            setIsUnscheduledModalOpen(false);
            setUnscheduledForm({ date: todayDateStr, timeIn: '', timeOut: '', reason: '' });
        } catch (err) {
            dialog.showAlert(err.message, "Error", "error");
        } finally {
            setClocking(false);
        }
    };

    // Handle Close Stale Shift
    const handleCloseShiftSubmit = async () => {
        if (!closeShiftForm.outTime || !closeShiftForm.reason || !closeShiftForm.date) {
            dialog.showAlert("กรุณากรอกข้อมูลให้ครบถ้วน", "ข้อมูลไม่ครบ", "warning");
            return;
        }
        setClocking(true);
        try {
            if (typeof closeStaleShift === 'function') {
                await closeStaleShift(staleCheckIn?.id, closeShiftForm.outTime, closeShiftForm.reason);
            }
            setIsCloseShiftModalOpen(false);
            dialog.showAlert("ปิดกะก่อนหน้าเรียบร้อยแล้ว", "สำเร็จ", "success");
        } catch (err) {
            dialog.showAlert(err.message || "เกิดข้อผิดพลาดในการปิดกะ", "Error", "error");
        } finally {
            setClocking(false);
        }
    };

    // ===================================================
    // 📦 RENDER (JSX)
    // ===================================================
    return (
        <div className="flex flex-col min-h-full bg-[#FAFAFA] font-sans">

            {/* --- Header Section --- */}
            <div className="px-6 pt-12 pb-4 flex justify-between items-end shrink-0 relative z-20">
                <div>
                    <p className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-wider">
                        {displayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                    <h1 className="text-3xl font-extrabold text-[#1C1C1E] tracking-tight">Attendance</h1>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-sm flex items-center justify-center text-slate-400">
                    <UserCircle size={24} weight="fill" />
                </div>
            </div>

            <div className="px-6 pb-4 shrink-0 relative z-20">
                <div className="bg-[#767680]/15 p-1 rounded-xl flex backdrop-blur-sm">
                    <button onClick={() => setActiveTab('scan')} className={`flex-1 py-1.5 rounded-[10px] text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'scan' ? 'bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.12)]' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Fingerprint weight={activeTab === 'scan' ? "fill" : "bold"} size={14} /> Scan
                    </button>
                    <button onClick={() => setActiveTab('logs')} className={`flex-1 py-1.5 rounded-[10px] text-xs font-bold flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'logs' ? 'bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.12)]' : 'text-slate-500 hover:text-slate-700'}`}>
                        <ClockCounterClockwise weight={activeTab === 'logs' ? "fill" : "bold"} size={14} /> Logs
                    </button>
                </div>
            </div>

            {/* === TAB 1: SCAN === */}
            {activeTab === 'scan' && (
                <div className="relative z-10 px-6 flex-1 flex flex-col items-center justify-start gap-8 pt-8 pb-24 animate-fade-in">

                    {/* Shift Info & Status */}
                    <div className="flex items-center justify-center gap-2 w-full">
                        {todaySchedule ? (
                            <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                <Briefcase size={14} className="text-slate-500" weight="duotone" />
                                <span className="text-[10px] font-bold text-slate-600">
                                    {`${todaySchedule.startTime} - ${todaySchedule.endTime}`}
                                </span>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsUnscheduledModalOpen(true)}
                                className="flex items-center gap-2 bg-amber-50/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-amber-200 shadow-sm hover:bg-amber-100 active:scale-95 transition-all cursor-pointer"
                            >
                                <WarningCircle size={14} className="text-amber-500" weight="fill" />
                                <span className="text-[10px] font-bold text-amber-700">
                                    No shift · ขอรับรองวันทำงาน
                                </span>
                            </button>
                        )}
                        <div className="flex items-center gap-1">
                            <div
                                onClick={() => { retryGps(); setShowMap(true); }}
                                className={`backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${locationStatus === 'success' ? 'bg-emerald-50/80 border-emerald-100 text-emerald-600' : (locationStatus === 'out-of-range' ? 'bg-orange-50 border-orange-200 text-orange-600' : locationStatus === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-100 border-slate-200 text-slate-500')}`}
                            >
                                {locationStatus === 'success' ? <CheckCircle weight="fill" size={14} /> :
                                    locationStatus === 'out-of-range' ? <WarningCircle weight="fill" size={14} /> :
                                        locationStatus === 'error' ? <ArrowsClockwise weight="bold" size={14} className="animate-pulse" /> :
                                            <Crosshair className="animate-spin" size={14} />}
                                <span className="text-[10px] font-bold truncate max-w-[140px]">
                                    {locationStatus === 'success' ? "In Range" :
                                        locationStatus === 'out-of-range' ? "Out of Area" :
                                            locationStatus === 'error' ? (gpsErrorMsg || "Retry GPS") : "Locating..."}
                                </span>
                            </div>
                            <button onClick={() => setShowHelp(true)} className="w-8 h-8 bg-white/60 backdrop-blur-md rounded-full border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-white transition-all active:scale-95">
                                <Info weight="bold" size={16} />
                            </button>
                        </div>
                    </div>

                    <LiveClock isClockIn={isClockIn} locationStatus={locationStatus} distance={distance} />

                    {/* Close Previous Shift Card (Stale Check-in) */}
                    {isStuck && staleCheckIn && (
                        <div className="w-full max-w-[320px] bg-rose-50 border border-rose-100 rounded-2xl p-5 shadow-lg shadow-rose-100 flex flex-col gap-4 animate-pulse-soft">
                            <div className="flex items-start gap-3">
                                <div className="bg-rose-100 text-rose-500 rounded-full p-2 shrink-0">
                                    <WarningCircle weight="fill" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-rose-600">You forgot to clock out!</h3>
                                    <p className="text-[11px] text-rose-400 leading-tight mt-1">
                                        Last check-in was on <b>{formatDateForInput(staleCheckIn.clockIn)}</b> at <b>{formatTime(staleCheckIn.clockIn)}</b>.
                                        <br />Please close this shift before starting a new one.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsCloseShiftModalOpen(true);
                                    setCloseShiftForm({ date: formatDateForInput(staleCheckIn.clockIn), outTime: '18:00', reason: 'ลืมตอกบัตรออก' });
                                }}
                                className="w-full py-3 rounded-xl bg-rose-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <SignOut weight="bold" size={16} /> Close Previous Shift
                            </button>
                        </div>
                    )}

                    <HoldButton onAction={handleAttemptClock} disabled={clocking || locationStatus !== 'success'} isClockIn={isClockIn} locationStatus={locationStatus} />

                    <button
                        onClick={() => setIsRetroModalOpen(true)}
                        className="text-slate-400 text-[10px] font-bold tracking-wide hover:text-slate-600 transition flex items-center gap-1.5 py-2 px-4 rounded-full hover:bg-slate-100"
                    >
                        <WarningCircle size={14} /> Forgot? Request Adjustment
                    </button>
                </div>
            )}

            {/* === TAB 2: LOGS === */}
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
                                else if (item.status === 'leave') { config = { bg: 'bg-yellow-50', text: 'text-yellow-600', label: item.leaveType || 'LEAVE', bar: 'bg-yellow-500' }; }
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
                                                {item.status === 'absent' ? (<span className="text-sm font-bold text-rose-500">Missing Entry <span className="text-[10px] font-normal text-slate-400 ml-1">(Tap to fix)</span></span>) : item.status === 'upcoming' ? (<span className="text-sm font-bold text-slate-400">Future Work</span>) : (<><div className="text-sm font-bold text-slate-800 tracking-tight">{item.hasRecord ? formatTime(item.clockIn) : '--:--'} - {item.hasRecord ? formatTime(item.clockOut) : '--:--'}</div><div className="text-[10px] font-medium text-slate-400 mt-0.5 flex items-center gap-1"><Clock weight="fill" size={12} />{item.hasRecord ? 'Work' : 'No Record'}</div></>)}
                                            </div>
                                            <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${config.bg} ${config.text}`}>{config.label}</div>
                                        </div>
                                        {isExpanded && item.hasRecord && (
                                            <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex flex-col gap-2 animate-fade-in">
                                                <div className="flex items-start gap-3"><MapPin className="text-slate-400 mt-0.5" weight="fill" size={16} /><div><p className="text-xs font-bold text-slate-600 mb-0.5">Location</p><p className="text-[10px] text-slate-500 leading-relaxed">{item.clockInLocation?.address || "GPS Coordinates"}</p></div></div>
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

            {/* === MODALS PORTALS === */}

            <RetroRequestModal
                isOpen={isRetroModalOpen}
                onClose={() => setIsRetroModalOpen(false)}
                form={retroForm}
                setForm={setRetroForm}
                onSubmit={handleRetroSubmit}
                isSubmitting={clocking}
            />

            <UnscheduledWorkModal
                isOpen={isUnscheduledModalOpen}
                onClose={() => setIsUnscheduledModalOpen(false)}
                form={unscheduledForm}
                setForm={setUnscheduledForm}
                onSubmit={handleUnscheduledWorkSubmit}
                isSubmitting={clocking}
            />

            <CloseShiftModal
                isOpen={isCloseShiftModalOpen}
                onClose={() => setIsCloseShiftModalOpen(false)}
                form={closeShiftForm}
                setForm={setCloseShiftForm}
                onSubmit={handleCloseShiftSubmit}
                isSubmitting={clocking}
            />

            <ShiftSelectionModal
                isOpen={showShiftSelectModal}
                onClose={() => setShowShiftSelectModal(false)}
                masterShifts={masterShifts}
                selectedShiftId={selectedShiftId}
                setSelectedShiftId={setSelectedShiftId}
                onSubmit={(id) => proceedWithUnscheduledClockIn(id)}
                isSubmitting={clocking}
            />

            {/* Greeting Toast */}
            {showGreetingPopup && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center px-6 pointer-events-none">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"></div>
                    <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl p-6 animate-zoom-in pointer-events-auto flex flex-col items-center text-center relative z-10">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${greetingMessage.isLate ? 'bg-orange-50 text-orange-500' : 'bg-[#E8F8ED] text-[#34C759]'}`}>{greetingMessage.isLate ? <WarningCircle weight="fill" size={40} /> : <CheckCircle weight="fill" size={40} />}</div>
                        <h3 className="font-extrabold text-2xl text-slate-900 mb-2">{greetingMessage.title}</h3>
                        <p className="text-slate-500 text-sm font-medium mb-6 px-4 leading-relaxed">{greetingMessage.text}</p>
                        <button onClick={() => setShowGreetingPopup(false)} className="w-full bg-[#2563EB] text-white py-3.5 rounded-xl font-bold text-sm shadow-lg">Done</button>
                    </div>
                </div>
            )}

            {/* Map & Help Modals */}
            <Suspense fallback={null}>
                {showHelp && <LocationHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />}
                {showMap && <AttendanceMiniMap isOpen={showMap} onClose={() => setShowMap(false)} userLocation={hookLocation} companyLocation={companyConfig?.location} radius={companyConfig?.radius} />}
            </Suspense>
        </div>
    );
}