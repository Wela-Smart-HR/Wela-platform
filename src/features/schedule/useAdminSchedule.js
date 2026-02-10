import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../shared/lib/firebase';
import { useDialog } from '../../contexts/DialogContext';
import {
    collection, query, where, getDocs, writeBatch,
    doc, onSnapshot, serverTimestamp, updateDoc, getDoc
} from 'firebase/firestore';

// Helper: Format Date
const formatDateLocal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper: Chunk Array
const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
};

export const useAdminSchedule = (initialView = 'daily') => {
    const { currentUser } = useAuth();
    const dialog = useDialog();

    // --- State ---
    const [viewMode, setViewMode] = useState(initialView);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [weekStart, setWeekStart] = useState(new Date()); // New state for Weekly View
    const [loading, setLoading] = useState(false);

    // Data State
    const [schedules, setSchedules] = useState([]);
    const [companyShifts, setCompanyShifts] = useState([]);
    const [activeEmployees, setActiveEmployees] = useState([]); // New: Active Employees
    const [otTypes, setOtTypes] = useState([]);
    const [configLoaded, setConfigLoaded] = useState(false);

    // Filtered Data (Daily)
    const [workingStaff, setWorkingStaff] = useState([]);
    const [leaveStaff, setLeaveStaff] = useState([]);
    const [offStaff, setOffStaff] = useState([]);

    // Modals State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState(null);
    const [isManageTodayOpen, setIsManageTodayOpen] = useState(false);
    const [manageTodayTab, setManageTodayTab] = useState('bonus');
    const [bulkForm, setBulkForm] = useState({ incentive: '', otType: '', otHours: 0 });

    // --- Helpers ---
    const changeMonth = (offset) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    const changeDay = (day) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    // Weekly Helpers
    const getMonday = (d) => {
        d = new Date(d);
        const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    const changeWeek = (offset) => {
        const newDate = new Date(weekStart);
        newDate.setDate(newDate.getDate() + (offset * 7));
        setWeekStart(newDate);
    };

    const resetToStandardMonday = () => {
        setWeekStart(getMonday(new Date()));
    };

    // --- Effects ---

    // 0. Init Week Start on Mount
    useEffect(() => {
        setWeekStart(getMonday(new Date()));
    }, []);

    // 1. Fetch Config & Employees
    useEffect(() => {
        if (!currentUser?.companyId) return;
        const fetchConfig = async () => {
            try {
                // Fetch Company Config
                const compDoc = await getDoc(doc(db, "companies", currentUser.companyId));
                if (compDoc.exists()) {
                    const data = compDoc.data();
                    setCompanyShifts(data.shifts || []);
                    const rawOT = data.otTypes || [];
                    setOtTypes(rawOT.sort((a, b) => a.rate - b.rate));
                }

                // Fetch Active Employees
                const qEmployees = query(
                    collection(db, "users"),
                    where("companyId", "==", currentUser.companyId),
                    where("role", "==", "employee"),
                    where("status", "==", "active") // Only Active
                );
                const employeeSnapshot = await getDocs(qEmployees);
                const rawEmployees = employeeSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(emp => emp.active !== false); // Client-side filter for soft-deletes

                // Deduplicate by Name (Keep the one with avatar or first found)
                const uniqueEmployees = [];
                const seenNames = new Set();

                rawEmployees.forEach(emp => {
                    const cleanName = emp.name?.trim().toLowerCase();
                    if (cleanName && !seenNames.has(cleanName)) {
                        seenNames.add(cleanName);
                        uniqueEmployees.push(emp);
                    }
                });

                setActiveEmployees(uniqueEmployees);

                setConfigLoaded(true);
            } catch (e) {
                console.error("Error fetching config/employees:", e);
                dialog.showAlert("โหลดข้อมูลไม่สำเร็จ", "Error", "error");
            }
        };
        fetchConfig();
    }, [currentUser]);


    // 2. Fetch Schedules (Monthly)
    useEffect(() => {
        if (!currentUser?.companyId) return;

        setLoading(true);
        const startOfMonth = formatDateLocal(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
        const endOfMonth = formatDateLocal(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));

        const q = query(
            collection(db, "schedules"),
            where("companyId", "==", currentUser.companyId),
            where("date", ">=", startOfMonth),
            where("date", "<=", endOfMonth)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const rawDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Deduplicate Schedules: Logic "Last Write Wins" or "Latest updatedAt"
            // Key = `${userId}_${date}`
            const scheduleMap = new Map();

            rawDocs.forEach(doc => {
                const key = `${doc.userId}_${doc.date}`;
                const existing = scheduleMap.get(key);

                if (!existing) {
                    scheduleMap.set(key, doc);
                } else {
                    // Conflict Resolution: Prefer latest 'updatedAt'
                    const existingTime = existing.updatedAt?.toMillis() || 0;
                    const newTime = doc.updatedAt?.toMillis() || 0;

                    if (newTime > existingTime) {
                        scheduleMap.set(key, doc);
                    }
                }
            });

            setSchedules(Array.from(scheduleMap.values()));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching schedules:", error);
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser, currentDate]);

    // 3. Process Daily Staff
    useEffect(() => {
        const targetDateStr = formatDateLocal(currentDate);

        // Optimizing lookup
        const todaySchedules = schedules.filter(s => s.date === targetDateStr);
        const scheduleMap = new Map();
        todaySchedules.forEach(s => scheduleMap.set(s.userId, s));

        const working = [];
        const leaves = [];
        const off = [];

        activeEmployees.forEach(emp => {
            const shift = scheduleMap.get(emp.id);

            if (shift) {
                const staffObj = {
                    id: shift.id,
                    userId: emp.id,
                    name: emp.name,
                    role: emp.position || 'พนักงาน',
                    avatar: emp.avatar,
                    type: shift.type,
                    startTime: shift.startTime || '-',
                    endTime: shift.endTime || '-',
                    otType: shift.otType || null,
                    otHours: shift.otHours || 0,
                    incentive: shift.incentive || 0,
                    note: shift.note || '',
                    shiftCode: shift.shiftCode || '',
                    color: shift.color || '',
                    raw: shift
                };

                if (shift.type === 'work') working.push(staffObj);
                else if (shift.type === 'leave') leaves.push(staffObj);
                else off.push(staffObj);
            }
        });

        setWorkingStaff(working);
        setLeaveStaff(leaves);
        setOffStaff(off);
    }, [schedules, currentDate, activeEmployees]);

    // --- Actions ---

    const openEditModal = (staff) => {
        const defaultStart = companyShifts[0]?.startTime || '09:00';
        const defaultEnd = companyShifts[0]?.endTime || '18:00';

        setEditingShift({
            docId: staff.id, name: staff.name, type: staff.type,
            startTime: staff.startTime !== '-' ? staff.startTime : defaultStart,
            endTime: staff.endTime !== '-' ? staff.endTime : defaultEnd,
            hasOT: staff.otHours > 0, otType: staff.otType || otTypes[0]?.id || '', otHours: staff.otHours || 0,
            incentive: staff.incentive || 0,
            shiftCode: staff.shiftCode || staff.name || 'WORK',
            color: staff.color || 'blue',
            note: staff.note || '',
            selectedPreset: ''
        });
        setIsEditModalOpen(true);
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
                shiftCode: (editingShift.type === 'work') ? editingShift.shiftCode : '',
                color: (editingShift.type === 'work') ? editingShift.color : '',
                note: editingShift.note || '',
                updatedAt: serverTimestamp()
            };
            await updateDoc(doc(db, "schedules", editingShift.docId), updateData);
            dialog.showAlert("อัปเดตข้อมูลเรียบร้อยแล้ว", "สำเร็จ", "success");
            setIsEditModalOpen(false);
        } catch (e) {
            dialog.showAlert("เกิดข้อผิดพลาด: " + e.message, "Error", "error");
        }
        setLoading(false);
    };

    const handleAutoSchedule = async () => {
        if (!configLoaded) return dialog.showAlert("กำลังโหลดข้อมูลบริษัท กรุณารอสักครู่...", "ใจเย็นๆ", "info");
        if (companyShifts.length === 0) {
            return dialog.showAlert("ไม่พบข้อมูล 'กะงาน' ในระบบ \nกรุณาไปที่เมนู Settings > กฎ & กะงาน แล้วสร้างกะงานก่อนครับ", "ข้อมูลไม่ครบ", "warning");
        }

        const isConfirmed = await dialog.showConfirm(
            `ระบบจะสร้างตารางงานให้พนักงานทุกคนในเดือนนี้ โดยอิงตาม "กะงานเริ่มต้น" ของพนักงานแต่ละคน\n(ข้อมูลเดิมในเดือนนี้จะถูกเขียนทับ)`,
            "สร้างตารางอัตโนมัติ?"
        );

        if (isConfirmed) {
            executeAutoSchedule();
        }
    };

    const executeAutoSchedule = async () => {
        setLoading(true);
        try {
            const qUsers = query(collection(db, "users"), where("companyId", "==", currentUser.companyId), where("role", "==", "employee"));
            const userSnapshot = await getDocs(qUsers);
            if (userSnapshot.empty) {
                setLoading(false);
                return dialog.showAlert("ไม่พบข้อมูลพนักงานในระบบ", "แจ้งเตือน", "warning");
            }

            // Fallback shift (first one)
            const globalDefaultShift = companyShifts[0];

            const allOperations = [];
            userSnapshot.forEach(userDoc => {
                const user = userDoc.data();
                const userDayOffs = user.dayOffs || [0];

                // Determin Shift for this User
                let targetShift = globalDefaultShift;
                if (user.shift) {
                    const foundShift = companyShifts.find(s => s.id === user.shift);
                    if (foundShift) targetShift = foundShift;
                }

                for (let day = 1; day <= daysInMonth; day++) {
                    const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const dateStr = formatDateLocal(dateObj);
                    const isDayOff = userDayOffs.includes(dateObj.getDay());

                    allOperations.push({
                        ref: doc(db, "schedules", `${userDoc.id}_${dateStr}`), // Fixed ID Format to be consistent
                        data: {
                            companyId: currentUser.companyId, userId: userDoc.id, userName: user.name || 'No Name',
                            userRole: user.position || 'Employee', userAvatar: user.avatar || '',
                            date: dateStr,
                            startTime: isDayOff ? "" : targetShift.startTime,
                            endTime: isDayOff ? "" : targetShift.endTime,
                            type: isDayOff ? 'off' : 'work',
                            shiftCode: isDayOff ? '' : (targetShift.name || 'WORK'),
                            color: isDayOff ? '' : (targetShift.color || 'blue'),
                            note: isDayOff ? '' : (targetShift.note || ''),
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

            dialog.showAlert(`สร้างตารางงาน ${allOperations.length} รายการเรียบร้อย!`, "เสร็จสิ้น", "success");

        } catch (e) {
            console.error(e);
            dialog.showAlert("เกิดข้อผิดพลาด: " + e.message, "Error", "error");
        }
        setLoading(false);
    };

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

    return {
        state: {
            viewMode, currentDate, weekStart, loading,
            schedules,
            activeEmployees, // New
            companyShifts, otTypes,
            workingStaff, leaveStaff, offStaff,
            daysInMonth, firstDayOfMonth
        },
        actions: {
            setViewMode, changeMonth, changeDay,
            changeWeek, setWeekStart, resetToStandardMonday,
            handleAutoSchedule,
            openEditModal, saveShiftEdit,
            setIsEditModalOpen, setEditingShift,
            setIsManageTodayOpen, executeBulkAction,
            setManageTodayTab, setBulkForm
        },
        modals: {
            isEditModalOpen, editingShift,
            isManageTodayOpen, manageTodayTab, bulkForm
        }
    };
};
