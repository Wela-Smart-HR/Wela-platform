import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../shared/lib/firebase';
import { useLocation } from 'react-router-dom';
import { useDialog } from '../../contexts/DialogContext'; // ✅ 1. Import Dialog
import {
    collection, query, where, getDocs, writeBatch,
    doc, onSnapshot, serverTimestamp, updateDoc, getDoc
} from 'firebase/firestore';
import {
    Clock, PencilSimple, Copy, CaretRight, CaretLeft,
    CalendarBlank, Check, WarningCircle,
    Briefcase, Moon, Coins, X, MagicWand, Gift, Storefront,
    AirplaneTilt, ArrowDown, WarningOctagon
} from '@phosphor-icons/react';

// --- HELPER: Timezone Fix ---
const formatDateLocal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- HELPER: Chunking ---
const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
};

export default function Schedule() {
    const { currentUser } = useAuth();
    const location = useLocation();
    const dialog = useDialog(); // ✅ 2. เรียกใช้ Dialog
    const [viewMode, setViewMode] = useState(location.state?.viewMode || 'daily');
    const [currentDate, setCurrentDate] = useState(new Date());

    // Data
    const [schedules, setSchedules] = useState([]);
    const [workingStaff, setWorkingStaff] = useState([]);
    const [leaveStaff, setLeaveStaff] = useState([]);
    const [offStaff, setOffStaff] = useState([]);

    const [loading, setLoading] = useState(false);

    // Configs from Settings
    const [companyShifts, setCompanyShifts] = useState([]);
    const [otTypes, setOtTypes] = useState([]);
    const [configLoaded, setConfigLoaded] = useState(false);

    // Modals
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState(null);
    const [isManageTodayOpen, setIsManageTodayOpen] = useState(false);
    const [manageTodayTab, setManageTodayTab] = useState('bonus');
    const [bulkForm, setBulkForm] = useState({ incentive: '', otType: '', otHours: 0 });

    // ❌ ลบ state confirmConfig ทิ้ง (เพราะเราใช้ Global Dialog แล้ว)

    // Helpers
    const changeMonth = (offset) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    const changeDay = (day) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    // --- 1. FETCH DATA & CONFIG ---
    useEffect(() => {
        if (!currentUser?.companyId) return;

        const fetchConfig = async () => {
            try {
                const compDoc = await getDoc(doc(db, "companies", currentUser.companyId));
                if (compDoc.exists()) {
                    const data = compDoc.data();
                    setCompanyShifts(data.shifts || []);
                    const rawOT = data.otTypes || [];
                    setOtTypes(rawOT.sort((a, b) => a.rate - b.rate));
                }
                setConfigLoaded(true);
            } catch (e) { console.error("Error fetching config:", e); }
        };
        fetchConfig();

        setLoading(true);
        const startOfMonth = formatDateLocal(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
        const endOfMonth = formatDateLocal(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));

        const q = query(collection(db, "schedules"), where("companyId", "==", currentUser.companyId), where("date", ">=", startOfMonth), where("date", "<=", endOfMonth));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSchedules(docs);
            setLoading(false);
        });
        return unsubscribe;
    }, [currentUser, currentDate]);

    // --- 2. PROCESS DAILY STAFF ---
    useEffect(() => {
        const targetDateStr = formatDateLocal(currentDate);
        const todayData = schedules.filter(s => s.date === targetDateStr);

        const working = [];
        const leaves = [];
        const off = [];

        todayData.forEach(shift => {
            const staffObj = {
                id: shift.id, userId: shift.userId, name: shift.userName || 'Unknown',
                role: shift.userRole || 'พนักงาน', avatar: shift.userAvatar, type: shift.type,
                startTime: shift.startTime || '-', endTime: shift.endTime || '-',
                otType: shift.otType || null, otHours: shift.otHours || 0,
                incentive: shift.incentive || 0,
                note: shift.note || '',
                raw: shift
            };

            if (shift.type === 'work') working.push(staffObj);
            else if (shift.type === 'leave') leaves.push(staffObj);
            else off.push(staffObj);
        });

        setWorkingStaff(working);
        setLeaveStaff(leaves);
        setOffStaff(off);
    }, [schedules, currentDate]);

    // --- 3. ACTIONS ---

    // 3.1 Edit Single Shift
    const openEditModal = (staff) => {
        const defaultStart = companyShifts[0]?.startTime || '09:00';
        const defaultEnd = companyShifts[0]?.endTime || '18:00';

        setEditingShift({
            docId: staff.id, name: staff.name, type: staff.type,
            startTime: staff.startTime !== '-' ? staff.startTime : defaultStart,
            endTime: staff.endTime !== '-' ? staff.endTime : defaultEnd,
            hasOT: staff.otHours > 0, otType: staff.otType || otTypes[0]?.id || '', otHours: staff.otHours || 0,
            incentive: staff.incentive || 0,
            selectedPreset: ''
        });
        setIsEditModalOpen(true);
    };

    const handlePresetChange = (e) => {
        const shiftId = e.target.value;
        const preset = companyShifts.find(s => s.id === shiftId);
        if (preset) {
            setEditingShift(prev => ({
                ...prev,
                selectedPreset: shiftId,
                startTime: preset.startTime,
                endTime: preset.endTime
            }));
        }
    };

    const saveShiftEdit = async () => {
        if (!editingShift) return;
        setLoading(true);
        try {
            const updateData = {
                type: editingShift.type,
                startTime: editingShift.type === 'work' ? editingShift.startTime : '',
                endTime: editingShift.type === 'work' ? editingShift.endTime : '',
                otType: (editingShift.type === 'work' && editingShift.hasOT) ? editingShift.otType : null,
                otHours: (editingShift.type === 'work' && editingShift.hasOT) ? Number(editingShift.otHours) : 0,
                incentive: (editingShift.type === 'work') ? Number(editingShift.incentive) : 0,
                updatedAt: serverTimestamp()
            };
            await updateDoc(doc(db, "schedules", editingShift.docId), updateData);
            // ✅ เปลี่ยน alert เป็น dialog
            dialog.showAlert("อัปเดตข้อมูลเรียบร้อยแล้ว", "สำเร็จ", "success");
            setIsEditModalOpen(false);
        } catch (e) {
            dialog.showAlert("เกิดข้อผิดพลาด: " + e.message, "Error", "error");
        }
        setLoading(false);
    };

    // 3.2 Auto Schedule (✅ ปรับใหม่ ใช้ Dialog.showConfirm)
    const handleAutoSchedule = async () => {
        if (!configLoaded) return dialog.showAlert("กำลังโหลดข้อมูลบริษัท กรุณารอสักครู่...", "ใจเย็นๆ", "info");

        if (companyShifts.length === 0) {
            return dialog.showAlert("ไม่พบข้อมูล 'กะงาน' ในระบบ \nกรุณาไปที่เมนู Settings > กฎ & กะงาน แล้วสร้างกะงานก่อนครับ", "ข้อมูลไม่ครบ", "warning");
        }

        const mainShift = companyShifts[0];
        const timeRange = `${mainShift.startTime}-${mainShift.endTime}`;

        // ✅ เรียกใช้ Global Confirm
        const isConfirmed = await dialog.showConfirm(
            `ระบบจะสร้างตารางกะ "${mainShift.name}" (${timeRange}) ให้พนักงานทุกคนในเดือนนี้\n(ข้อมูลเดิมจะถูกเขียนทับ)`,
            "สร้างตารางอัตโนมัติ?"
        );

        if (isConfirmed) {
            executeAutoSchedule(mainShift);
        }
    };

    const executeAutoSchedule = async (mainShift) => {
        setLoading(true);
        try {
            const qUsers = query(collection(db, "users"), where("companyId", "==", currentUser.companyId), where("role", "==", "employee"));
            const userSnapshot = await getDocs(qUsers);
            if (userSnapshot.empty) {
                setLoading(false);
                return dialog.showAlert("ไม่พบข้อมูลพนักงานในระบบ", "แจ้งเตือน", "warning");
            }

            const allOperations = [];
            userSnapshot.forEach(userDoc => {
                const user = userDoc.data();
                const userDayOffs = user.dayOffs || [0];

                for (let day = 1; day <= daysInMonth; day++) {
                    const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const dateStr = formatDateLocal(dateObj);
                    const isDayOff = userDayOffs.includes(dateObj.getDay());

                    allOperations.push({
                        ref: doc(db, "schedules", `${userDoc.id}_${dateStr}`),
                        data: {
                            companyId: currentUser.companyId, userId: userDoc.id, userName: user.name || 'No Name',
                            userRole: user.position || 'Employee', userAvatar: user.avatar || '',
                            date: dateStr,
                            startTime: isDayOff ? "" : mainShift.startTime,
                            endTime: isDayOff ? "" : mainShift.endTime,
                            type: isDayOff ? 'off' : 'work',
                            createdAt: serverTimestamp()
                        }
                    });
                }
            });

            const chunks = chunkArray(allOperations, 450);
            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(op => batch.set(op.ref, op.data, { merge: true }));
                await batch.commit();
            }

            dialog.showAlert(`ปรับปรุงตารางงาน ${allOperations.length} รายการเรียบร้อย!`, "เสร็จสิ้น", "success");

        } catch (e) {
            console.error(e);
            dialog.showAlert("เกิดข้อผิดพลาด: " + e.message, "Error", "error");
        }
        setLoading(false);
    };

    // 3.3 Manage Today (Bulk)
    const executeBulkAction = async () => {
        const dateStr = formatDateLocal(currentDate);
        const todayShifts = schedules.filter(s => s.date === dateStr);
        const batch = writeBatch(db);
        let count = 0;

        if (manageTodayTab === 'bonus') {
            const working = todayShifts.filter(s => s.type === 'work');
            working.forEach(shift => {
                const updates = {};
                if (bulkForm.incentive) updates.incentive = Number(bulkForm.incentive);
                if (bulkForm.otType) {
                    updates.hasOT = true;
                    updates.otType = bulkForm.otType;
                    updates.otHours = Number(bulkForm.otHours);
                }
                if (Object.keys(updates).length > 0) {
                    batch.update(doc(db, "schedules", shift.id), updates);
                    count++;
                }
            });
        } else if (manageTodayTab === 'close') {
            todayShifts.forEach(shift => {
                batch.update(doc(db, "schedules", shift.id), { type: 'holiday', startTime: '', endTime: '', otHours: 0, incentive: 0 });
                count++;
            });
        }

        if (count > 0) {
            await batch.commit();
            dialog.showAlert(manageTodayTab === 'close' ? "ปิดร้านเรียบร้อย" : "แจกรางวัลเรียบร้อย!", "สำเร็จ", "success");
        } else {
            dialog.showAlert("ไม่มีรายการที่ต้องอัปเดต", "แจ้งเตือน", "info");
        }
        setIsManageTodayOpen(false);
    };

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] text-[#1E293B] font-sans">
            {/* HEADER */}
            <header className="px-6 pt-6 pb-2 z-20 bg-[#FAFAFA]/90 backdrop-blur-sm sticky top-0">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-slate-800">ตารางงาน</h1>
                    <div className="flex gap-1 bg-white p-1 rounded-full shadow-sm border border-slate-100">
                        <button onClick={() => setViewMode('daily')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === 'daily' ? 'bg-slate-900 text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}>รายวัน</button>
                        <button onClick={() => setViewMode('monthly')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === 'monthly' ? 'bg-slate-900 text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}>รายเดือน</button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6 pt-4"> {/* Added pt-4 for safe spacing */}
                {/* DAILY VIEW */}
                {viewMode === 'daily' && (
                    <div className="animate-fade-in-up"> {/* Changed animation to standard */}
                        {/* Date Strip */}
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 px-1 mb-2">
                            {Array.from({ length: 7 }, (_, i) => {
                                const d = new Date(currentDate); d.setDate(currentDate.getDate() - 3 + i);
                                const isSelected = d.getDate() === currentDate.getDate();
                                return (
                                    <div key={i} onClick={() => changeDay(d.getDate())} className={`min-w-[56px] h-[76px] rounded-2xl flex flex-col justify-center items-center border transition-all cursor-pointer ${isSelected ? 'bg-slate-900 text-white shadow-lg -translate-y-1' : 'bg-white border-transparent shadow-sm text-slate-400'}`}>
                                        <span className={`text-[10px] font-medium ${isSelected ? 'opacity-70' : ''}`}>{d.toLocaleDateString('th-TH', { weekday: 'short' })}</span>
                                        <span className="text-lg font-bold">{d.getDate()}</span>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Manage Button */}
                        <div className="flex justify-between items-end mb-4 px-1">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">{currentDate.toLocaleDateString('th-TH', { dateStyle: 'long' })}</h2>
                                <p className="text-[10px] text-slate-400">ทีมงาน: {workingStaff.length} คน • ลา: {leaveStaff.length} • หยุด: {offStaff.length}</p>
                            </div>
                            {(workingStaff.length > 0 || offStaff.length > 0) && (
                                <button onClick={() => setIsManageTodayOpen(true)} className="text-[10px] font-bold text-slate-700 border border-slate-200 bg-white px-3 py-1.5 rounded-lg hover:bg-slate-50 transition active:scale-95 flex items-center gap-2 shadow-sm">
                                    <MagicWand size={16} className="text-purple-500" /> แก้ไขวันนี้
                                </button>
                            )}
                        </div>

                        {/* ZERO STAFF ALERT */}
                        {workingStaff.length === 0 && (
                            <div className="mb-6 bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3 animate-pulse">
                                <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-500 shrink-0">
                                    <WarningOctagon weight="fill" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-rose-700">ไม่มีพนักงานเข้ากะวันนี้!</h3>
                                    <p className="text-xs text-rose-600 mt-1">
                                        โปรดตรวจสอบตารางงาน อาจไม่มีใครมาทำงานเลย หรือทุกคนลางาน/หยุดพร้อมกัน
                                    </p>
                                    <button onClick={() => setIsManageTodayOpen(true)} className="mt-2 text-[10px] font-bold bg-white text-rose-600 px-3 py-1.5 rounded-lg border border-rose-200 shadow-sm hover:bg-rose-50">
                                        จัดการกะงานด่วน
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* WORKING STAFF */}
                        <div className="space-y-3 mb-6">

                            {workingStaff.map((staff) => (
                                <div key={staff.id} onClick={() => openEditModal(staff)} className="modern-card p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition rounded-xl bg-white border border-slate-100 shadow-sm relative overflow-hidden group">
                                    {staff.otHours > 0 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400"></div>}
                                    <div className="flex items-center gap-3">
                                        <img src={staff.avatar || `https://ui-avatars.com/api/?name=${staff.name}`} className="w-10 h-10 rounded-full border border-slate-100" alt={staff.name} />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-slate-700">{staff.name}</p>
                                                {staff.incentive > 0 && (
                                                    <span className="text-[9px] font-bold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-100 flex items-center gap-1">
                                                        <Gift weight="fill" /> +{staff.incentive}฿
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-[10px] text-slate-500 flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded"><Clock weight="bold" /> {staff.startTime} - {staff.endTime}</p>
                                                {staff.otHours > 0 && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">OT {staff.otHours}h</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <PencilSimple className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                </div>
                            ))}
                        </div>

                        {/* LEAVE STAFF */}
                        {leaveStaff.length > 0 && (
                            <>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6 flex items-center gap-2"><AirplaneTilt weight="fill" className="text-orange-400" /> ลางาน ({leaveStaff.length})</h3>
                                <div className="space-y-2">
                                    {leaveStaff.map((staff) => (
                                        <div key={staff.id} onClick={() => openEditModal(staff)} className="p-3 flex items-center justify-between cursor-pointer bg-orange-50/50 hover:bg-orange-50 transition rounded-xl border border-orange-100">
                                            <div className="flex items-center gap-3">
                                                <img src={staff.avatar || `https://ui-avatars.com/api/?name=${staff.name}`} className="w-8 h-8 rounded-full opacity-80" alt={staff.name} />
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700">{staff.name}</p>
                                                    <p className="text-[10px] text-orange-500">{staff.note || 'ลางาน'}</p>
                                                </div>
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-full shadow-sm">Leave</div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* OFF STAFF */}
                        {offStaff.length > 0 && (
                            <>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6 flex items-center gap-2"><Moon weight="fill" /> หยุดพักผ่อน ({offStaff.length})</h3>
                                <div className="space-y-2 opacity-80">
                                    {offStaff.map((staff) => (
                                        <div key={staff.id} onClick={() => openEditModal(staff)} className="p-3 flex items-center justify-between cursor-pointer hover:bg-white hover:shadow-sm transition rounded-xl border border-transparent hover:border-slate-100 group">
                                            <div className="flex items-center gap-3 grayscale group-hover:grayscale-0 transition-all">
                                                <img src={staff.avatar || `https://ui-avatars.com/api/?name=${staff.name}`} className="w-8 h-8 rounded-full opacity-60" alt={staff.name} />
                                                <div>
                                                    <p className="text-sm font-bold text-slate-500">{staff.name}</p>
                                                    <p className="text-[10px] text-slate-400">{staff.type === 'holiday' ? 'ร้านปิด' : 'วันหยุด'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* MONTHLY VIEW */}
                {viewMode === 'monthly' && (
                    <div className="animate-fade-in-up">
                        <div className="flex flex-col gap-3 mb-6">
                            <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                                <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400"><CaretLeft weight="bold" /></button>
                                <div className="flex items-center gap-2"><CalendarBlank weight="fill" className="text-slate-400" /><span className="font-bold text-slate-800 text-sm">{currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</span></div>
                                <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400"><CaretRight weight="bold" /></button>
                            </div>
                            <button onClick={handleAutoSchedule} disabled={loading} className="w-full flex items-center justify-center gap-1.5 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 text-[10px] font-bold shadow-sm active:scale-95 transition hover:border-blue-300 hover:text-blue-600"><Copy weight="bold" size={16} /> {loading ? 'กำลังสร้าง...' : 'สร้างตารางอัตโนมัติ (Auto)'}</button>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
                            <div className="grid grid-cols-7 gap-2 mb-3 text-center">{['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => <div key={d} className="text-[10px] font-bold text-slate-400">{d}</div>)}</div>
                            <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                                {[...Array(firstDayOfMonth)].map((_, i) => <div key={`empty-${i}`} className="aspect-square"></div>)}

                                {[...Array(daysInMonth)].map((_, i) => {
                                    const day = i + 1; const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day); const dateStr = formatDateLocal(targetDate);

                                    const workShifts = schedules.filter(s => s.date === dateStr && s.type === 'work');
                                    const leaveShifts = schedules.filter(s => s.date === dateStr && s.type === 'leave');
                                    const isHoliday = schedules.some(s => s.date === dateStr && s.type === 'holiday');

                                    return (
                                        <div key={day} onClick={() => { changeDay(day); setViewMode('daily'); }} className={`aspect-square rounded-xl flex flex-col items-center justify-center border text-xs font-bold relative cursor-pointer hover:border-blue-400 transition ${isHoliday ? 'bg-rose-50 border-rose-100 text-rose-400' : (workShifts.length > 0 || leaveShifts.length > 0) ? 'bg-white border-slate-100 text-slate-700' : 'bg-slate-50 border-transparent text-slate-300'}`}>
                                            {day}
                                            {!isHoliday && (
                                                <div className="flex gap-0.5 mt-1 justify-center flex-wrap px-1">
                                                    {[...Array(Math.min(workShifts.length, 3))].map((_, idx) => <div key={`w-${idx}`} className="w-1 h-1 rounded-full bg-blue-500"></div>)}
                                                    {[...Array(Math.min(leaveShifts.length, 3))].map((_, idx) => <div key={`l-${idx}`} className="w-1 h-1 rounded-full bg-orange-400"></div>)}
                                                </div>
                                            )}
                                            {isHoliday && <div className="text-[8px] mt-1 font-normal">ปิด</div>}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* --- MODAL: EDIT SHIFT --- */}
            {isEditModalOpen && editingShift && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:px-4 animate-fade-in">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}></div>
                    <div className="bg-white w-full max-w-sm sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl relative z-10 animate-zoom-in">
                        <div className="flex justify-between items-center mb-6"><div><h3 className="text-lg font-bold text-slate-800">แก้ไขตารางงาน</h3><p className="text-xs text-slate-500">สำหรับ: {editingShift.name}</p></div><button onClick={() => setIsEditModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800"><X weight="bold" /></button></div>

                        <div className="bg-slate-100 p-1 rounded-xl flex mb-6">
                            <button onClick={() => setEditingShift({ ...editingShift, type: 'work' })} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${editingShift.type === 'work' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><Briefcase weight="fill" /> ทำงาน</button>
                            <button onClick={() => setEditingShift({ ...editingShift, type: 'leave', hasOT: false, incentive: 0 })} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${editingShift.type === 'leave' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}><AirplaneTilt weight="fill" /> ลา</button>
                            <button onClick={() => setEditingShift({ ...editingShift, type: 'off', hasOT: false, incentive: 0 })} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${editingShift.type === 'off' ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-400'}`}><Moon weight="fill" /> หยุด</button>
                        </div>

                        {editingShift.type === 'work' && (
                            <div className="space-y-4 animate-fade-in">

                                {/* 1. SHIFT PRESET SELECTOR */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 mb-1">เลือกกะงาน (Shift Preset)</label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 outline-none appearance-none focus:border-blue-500"
                                            onChange={handlePresetChange}
                                            value={editingShift.selectedPreset || ''}
                                        >
                                            <option value="">-- กำหนดเอง (Manual) --</option>
                                            {companyShifts.map(s => (
                                                <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-3 text-slate-400 pointer-events-none"><ArrowDown size={14} weight="bold" /></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-[10px] font-bold text-slate-400 mb-1">เวลาเข้า</label><input type="time" value={editingShift.startTime} onChange={(e) => setEditingShift({ ...editingShift, startTime: e.target.value, selectedPreset: '' })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500" /></div>
                                    <div><label className="block text-[10px] font-bold text-slate-400 mb-1">เวลาออก</label><input type="time" value={editingShift.endTime} onChange={(e) => setEditingShift({ ...editingShift, endTime: e.target.value, selectedPreset: '' })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500" /></div>
                                </div>

                                {/* OT Section */}
                                <div className="pt-4 border-t border-slate-100">
                                    <div className="flex justify-between items-center mb-3"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Coins weight="fill" className={editingShift.hasOT ? "text-emerald-500" : "text-slate-300"} /> เพิ่ม OT</label><div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in"><input type="checkbox" checked={editingShift.hasOT} onChange={(e) => setEditingShift({ ...editingShift, hasOT: e.target.checked })} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-300 checked:border-emerald-500" /><label onClick={() => setEditingShift({ ...editingShift, hasOT: !editingShift.hasOT })} className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${editingShift.hasOT ? 'bg-emerald-500' : 'bg-slate-300'}`}></label></div></div>
                                    {editingShift.hasOT && (
                                        <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100 space-y-3 animate-fade-in">
                                            <div>
                                                <label className="block text-[10px] font-bold text-emerald-600 mb-1">ประเภท OT</label>
                                                <select value={editingShift.otType} onChange={(e) => setEditingShift({ ...editingShift, otType: e.target.value })} className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none">
                                                    {otTypes.length > 0 ? otTypes.map(ot => (<option key={ot.id} value={ot.id}>{ot.name} (x{ot.rate})</option>)) : <option value="">ไม่พบการตั้งค่า OT</option>}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-emerald-600 mb-1">จำนวนชั่วโมง</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number" step="0.1" min="0"
                                                        value={editingShift.otHours}
                                                        onChange={(e) => setEditingShift({ ...editingShift, otHours: e.target.value })}
                                                        className="w-20 bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 outline-none text-center"
                                                    />
                                                    <span className="text-xs text-emerald-600 font-bold">ชม.</span>
                                                    <span className="text-[10px] text-slate-400 ml-1">
                                                        ({(Number(editingShift.otHours) * 60).toFixed(0)} นาที)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-slate-100 animate-fade-in">
                                    <div className="flex justify-between items-center mb-2"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Gift weight="fill" className="text-yellow-500" /> เงินพิเศษ (Incentive)</label></div>
                                    <div className="flex items-center gap-2"><div className="relative flex-1"><input type="number" min="0" placeholder="0" value={editingShift.incentive} onChange={(e) => setEditingShift({ ...editingShift, incentive: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-yellow-400" /><span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">THB</span></div></div>
                                </div>
                            </div>
                        )}
                        <button onClick={saveShiftEdit} disabled={loading} className="w-full mt-6 bg-slate-900 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition active:scale-95 disabled:opacity-50">บันทึก</button>
                    </div>
                </div>
            )}

            {/* --- MODAL 2: MANAGE TODAY --- */}
            {isManageTodayOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:px-4 animate-fade-in">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsManageTodayOpen(false)}></div>
                    <div className="bg-white w-full max-w-sm sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl relative z-10 animate-zoom-in">
                        <div className="flex justify-between items-center mb-6"><div><h3 className="text-lg font-bold text-slate-800">แก้ไขวันนี้</h3><p className="text-xs text-slate-500">วันที่: {currentDate.toLocaleDateString()}</p></div><button onClick={() => setIsManageTodayOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800"><X weight="bold" /></button></div>
                        <div className="bg-slate-100 p-1 rounded-xl flex mb-6">
                            <button onClick={() => setManageTodayTab('bonus')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${manageTodayTab === 'bonus' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Incentive / OT</button>
                            <button onClick={() => setManageTodayTab('close')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${manageTodayTab === 'close' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>ปิดร้าน</button>
                        </div>
                        {manageTodayTab === 'bonus' ? (
                            <div className="space-y-4 animate-fade-in">
                                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100"><label className="text-xs font-bold text-yellow-700 mb-2 block flex items-center gap-1"><Gift weight="fill" /> Incentive </label><div className="relative"><input type="number" placeholder="เช่น 200" value={bulkForm.incentive} onChange={e => setBulkForm({ ...bulkForm, incentive: e.target.value })} className="w-full bg-white border border-yellow-200 rounded-lg pl-3 pr-8 py-2 text-sm font-bold text-slate-800 outline-none" /><span className="absolute right-3 top-2 text-xs font-bold text-slate-400">THB</span></div></div>
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                    <label className="text-xs font-bold text-emerald-700 mb-2 block flex items-center gap-1"><Coins weight="fill" /> OT </label>
                                    <select value={bulkForm.otType} onChange={e => setBulkForm({ ...bulkForm, otType: e.target.value })} className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none mb-2">
                                        <option value="">-- ไม่แจก OT --</option>
                                        {otTypes.map(ot => <option key={ot.id} value={ot.id}>{ot.name} (x{ot.rate})</option>)}
                                    </select>
                                    {bulkForm.otType && <div className="flex items-center gap-2"><input type="number" value={bulkForm.otHours} onChange={e => setBulkForm({ ...bulkForm, otHours: e.target.value })} className="w-20 bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 outline-none text-center" /><span className="text-xs text-emerald-700 font-bold">ชั่วโมง</span></div>}
                                </div>
                                <button onClick={executeBulkAction} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition active:scale-95">ยืนยันการแจก</button>
                            </div>
                        ) : (
                            <div className="text-center py-4 animate-fade-in"><Storefront size={48} className="text-rose-200 mx-auto mb-3" weight="duotone" /><h4 className="font-bold text-rose-600">ต้องการปิดร้านวันนี้?</h4><p className="text-xs text-slate-500 mb-6">พนักงานทุกคนจะถูกเปลี่ยนสถานะเป็น "วันหยุด (Holiday)" และล้างค่า OT ทั้งหมด</p><button onClick={executeBulkAction} className="w-full bg-rose-500 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-rose-600 transition active:scale-95">ยืนยันปิดร้าน</button></div>
                        )}
                    </div>
                </div>
            )}

            {/* ❌ ส่วน Confirm Modal ของเดิมลบทิ้งได้เลยครับ เพราะใช้ Global แล้ว */}
        </div>
    );
}