import { useState, useEffect, useCallback } from 'react';
import { db } from '@/shared/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useMonthlyStats } from './useMonthlyStats';

/**
 * Hook for behavioral reports and insights (admin perspective)
 */
export function useReportsAdmin(companyId, selectedMonth = new Date()) {
    const [overview, setOverview] = useState({
        attendanceRate: 0,
        totalLateMins: 0,
        totalOTHours: 0,
        totalEmployees: 0,
        topLate: [],
        topGood: []
    });

    const [graphData, setGraphData] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isInsightGenerated, setIsInsightGenerated] = useState(false);

    // Cache employees to avoid refetching (Zero-Cost Strategy)
    const [employeesCache, setEmployeesCache] = useState([]);

    const getMonthRange = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(year, date.getMonth() + 1, 0).getDate();
        return {
            start: `${year}-${month}-01`,
            end: `${year}-${month}-${lastDay}`,
            daysInMonth: lastDay
        };
    };

    // --- NEW ZERO-COST LOGIC ---
    // 1. AUTO: Overview (Optimized)
    const { stats: monthlyStatsMap, loading: statsLoading } = useMonthlyStats(companyId, selectedMonth);

    // ✅ Helper: Create Safe Date String (YYYY-MM-DD)
    const toISODate = (d) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    useEffect(() => {
        if (!companyId || statsLoading) return;

        const fetchOverview = async () => {
            setLoading(true);
            try {
                const { start, end, daysInMonth } = getMonthRange(selectedMonth);

                // 1. Fetch Total Employees (Snapshot for Estimate Calculation)
                // [Architect Note]: In Production should store this in Company Metadata to reduce Reads
                const usersSnap = await getDocs(query(collection(db, "users"),
                    where("companyId", "==", companyId),
                    where("role", "==", "employee"),
                    where("status", "==", "active") // Filter only active
                ));

                // ✅ Deduplicate Users & Filter Soft-Deleted
                const uniqueUsersMap = new Map();
                usersSnap.docs.forEach(d => {
                    const data = d.data();
                    if (data.active === false) return; // Skip deleted users
                    if (!uniqueUsersMap.has(d.id)) {
                        uniqueUsersMap.set(d.id, { id: d.id, ...data });
                    }
                });
                const employees = Array.from(uniqueUsersMap.values());
                setEmployeesCache(employees); // Store in cache

                const totalActiveStaff = employees.length;

                // 2. Fetch Daily Attendance & Schedules
                const [dailySnap, schSnap] = await Promise.all([
                    getDocs(query(collection(db, 'companies', companyId, 'daily_attendance'),
                        where('date', '>=', start), where('date', '<=', end))),
                    getDocs(query(collection(db, 'schedules'),
                        where('companyId', '==', companyId),
                        where('date', '>=', start),
                        where('date', '<=', end)))
                ]);

                // ✅ Map Schedules: Date -> Expected Count
                const scheduleMap = {};
                // If schedules exist, we use them. If EMPTY, we use "No Holiday Mode" (Everyone works every day)
                const hasSchedules = !schSnap.empty;

                if (hasSchedules) {
                    schSnap.forEach(doc => {
                        const s = doc.data();
                        if (s.type === 'work') {
                            if (!scheduleMap[s.date]) scheduleMap[s.date] = 0;
                            scheduleMap[s.date]++;
                        }
                    });
                }

                let dailyStats = [];

                if (!dailySnap.empty) {
                    // ✅ A. MODERN PATH
                    const dailyMap = {};
                    dailySnap.forEach(doc => dailyMap[doc.id] = doc.data());

                    dailyStats = Array.from({ length: daysInMonth }, (_, i) => {
                        const d = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), i + 1);
                        const dateStr = toISODate(d);
                        const summary = dailyMap[dateStr];

                        // Check if it's weekend (Sunday=0, Saturday=6)
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                        if (summary) {
                            const values = Object.values(summary.attendance || {});
                            const present = values.length;
                            const late = values.filter(v => v.status === 'late').length;
                            const onTime = Math.max(0, present - late);

                            // ✅ FIX: Calculate Absent based on Schedule or "No Holiday Mode"
                            let expected = 0;
                            if (hasSchedules) {
                                expected = scheduleMap[dateStr] || 0;
                            } else {
                                // Fallback: "No Holiday Mode" -> Everyday is workday
                                // (Unless future date)
                                expected = totalActiveStaff;
                            }

                            let absent = 0;
                            if (d <= new Date()) {
                                absent = Math.max(0, expected - present);
                            }

                            return { day: i + 1, dateFull: dateStr, onTime, late, absent };
                        } else {
                            // No attendance data logic
                            let expected = 0;
                            if (hasSchedules) {
                                expected = scheduleMap[dateStr] || 0;
                            } else {
                                expected = totalActiveStaff;
                            }

                            let absent = 0;
                            if (d <= new Date()) {
                                absent = expected; // All absent
                            }
                            return { day: i + 1, dateFull: dateStr, onTime: 0, late: 0, absent: absent };
                        }
                    });

                } else {
                    // ⚠️ Fallback: Legacy Query -> NOW MIGRATED TO NEW LOGS
                    // console.warn("⚠️ Fetching raw attendance (Legacy Mode)");

                    const logsQ = query(
                        collection(db, "attendance_logs"), // ✅ Switch to new collection
                        where("company_id", "==", companyId), // ✅ Use company_id
                        where("clock_in", ">=", start), // ✅ Query by ISO string
                        where("clock_in", "<=", end)
                    );
                    const logsSnap = await getDocs(logsQ);
                    const logsData = logsSnap.docs.map(d => {
                        const data = d.data();
                        return {
                            ...data,
                            // Map for Report Logic Compatibility
                            userId: data.employee_id,
                            createdAt: data.clock_in ? new Date(data.clock_in) : null, // Map clock_in -> createdAt (Date)
                            clockOut: data.clock_out ? new Date(data.clock_out) : null,
                            status: data.status || 'on-time',
                            lateMins: data.late_minutes || 0,
                            // Original fields
                            date: data.clock_in ? data.clock_in.split('T')[0] : ''
                        };
                    });

                    dailyStats = Array.from({ length: daysInMonth }, (_, i) => {
                        const d = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), i + 1);
                        const dateStr = toISODate(d);

                        // ✅ FIX: Robust Date Comparison
                        const attForDay = logsData.filter(a => {
                            if (!a.createdAt) return false;
                            const createdDate = toISODate(a.createdAt);
                            return createdDate === dateStr;
                        });

                        const present = attForDay.length;
                        const late = attForDay.filter(a => a.status === 'late').length;
                        const onTime = Math.max(0, present - late);

                        // ✅ FIX: Calculate Absent based on Schedule or "No Holiday Mode"
                        let expected = 0;
                        if (hasSchedules) {
                            expected = scheduleMap[dateStr] || 0;
                        } else {
                            expected = totalActiveStaff;
                        }

                        let absent = 0;
                        if (d <= new Date()) {
                            absent = Math.max(0, expected - present);
                        }

                        return { day: i + 1, dateFull: dateStr, onTime, late, absent };
                    });
                }

                setGraphData(dailyStats);

                // 3. Process Leaderboard & Overview
                const quickStats = employees.map(emp => {
                    const myStats = monthlyStatsMap[emp.id] || {};
                    const lateMins = myStats.lateMins || 0;
                    const lateCount = myStats.lateCount || 0;
                    const absentCount = myStats.absentCount || 0;
                    const otHours = myStats.otHours || 0;

                    let simpleScore = 100 - (lateCount * 5) - (absentCount * 20);
                    if (simpleScore < 0) simpleScore = 0;

                    return { ...emp, lateMins, simpleScore, lateCount, otHours };
                });

                const totalLateMins = quickStats.reduce((acc, curr) => acc + curr.lateMins, 0);
                const totalOTHours = quickStats.reduce((acc, curr) => acc + curr.otHours, 0);
                const topLate = [...quickStats].filter(e => e.lateMins > 0).sort((a, b) => b.lateMins - a.lateMins).slice(0, 3);
                const topGood = [...quickStats].sort((a, b) => b.simpleScore - a.simpleScore).slice(0, 3);

                // Calculated Attendance Rate
                // Calculate total workdays in month * expected employees
                let totalPossibleWorkDays = 0;
                for (let i = 1; i <= daysInMonth; i++) {
                    const d = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), i);
                    const dateStr = toISODate(d);
                    if (d <= new Date()) {
                        if (hasSchedules) {
                            totalPossibleWorkDays += (scheduleMap[dateStr] || 0);
                        } else {
                            totalPossibleWorkDays += totalActiveStaff;
                        }
                    }
                }
                const totalActualPresent = dailyStats.reduce((acc, curr) => acc + (curr.onTime + curr.late), 0);

                const attRate = totalPossibleWorkDays > 0 ? (totalActualPresent / totalPossibleWorkDays) * 100 : 0;

                setOverview({ attendanceRate: attRate, totalLateMins, totalOTHours, totalEmployees: totalActiveStaff, topLate, topGood });
                setLoading(false);
            } catch (e) { console.error(e); setLoading(false); }
        };
        fetchOverview();
    }, [companyId, selectedMonth, monthlyStatsMap, statsLoading]);

    // ===============================================
    // 2. MANUAL: Insight (🔥 ส่วนที่อัปเกรดความฉลาด)
    // ===============================================
    const analyzeInsights = useCallback(async () => {
        setLoading(true);
        try {
            const { start, end } = getMonthRange(selectedMonth);
            const [usersSnap, attSnap, schSnap] = await Promise.all([
                getDocs(query(collection(db, "users"), where("companyId", "==", companyId))),
                getDocs(query(collection(db, "attendance_logs"), where("company_id", "==", companyId), where("clock_in", ">=", start), where("clock_in", "<=", end))),
                getDocs(query(collection(db, "schedules"), where("companyId", "==", companyId), where("date", ">=", start), where("date", "<=", end)))
            ]);

            const employees = usersSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role === 'employee');
            const attendances = attSnap.docs.map(d => {
                const data = d.data();
                return {
                    ...data,
                    userId: data.employee_id,
                    createdAt: data.clock_in ? new Date(data.clock_in) : null,
                    clockOut: data.clock_out ? new Date(data.clock_out) : null,
                    date: data.clock_in ? data.clock_in.split('T')[0] : ''
                };
            });
            const schedules = schSnap.docs.map(d => d.data());

            const analyzedList = employees.map(emp => {
                const myAtt = attendances.filter(a => a.userId === emp.id);
                // เรียงวันที่ให้ถูกต้องเพื่อเช็คการขาดงานติดต่อกัน (Streak)
                const mySch = schedules.filter(s => s.userId === emp.id).sort((a, b) => new Date(a.date) - new Date(b.date));

                let lateCount = 0, lateMins = 0, otHours = 0, absentCount = 0, earlyLeaveCount = 0;
                let mondayAbsent = 0, fridayAbsent = 0;
                let workDaysCount = 0; // จำนวนวันที่ต้องมาทำงานทั้งหมด

                // ตัวแปรสำหรับเช็ค Streak (ขาดติดต่อกัน)
                let currentAbsentStreak = 0;
                let maxAbsentStreak = 0;

                let score = 100;
                const incidents = [];

                // คำนวณค่าจ้างรายนาที
                const baseSalary = Number(emp.salary) || 0;
                const hourlyRate = emp.salaryType === 'daily' ? (baseSalary / 8) : (baseSalary / 30 / 8);
                const minuteRate = hourlyRate / 60;

                mySch.forEach(sch => {
                    const att = myAtt.find(a => a.date === sch.date);
                    const isPast = new Date(sch.date) < new Date();
                    const dayOfWeek = new Date(sch.date).getDay();
                    const dateObj = new Date(sch.date);
                    const dateShort = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;

                    if (sch.type === 'work') workDaysCount++;

                    if (att) {
                        // มาทำงาน -> Reset Streak
                        currentAbsentStreak = 0;

                        // 1. เช็คสาย
                        if (sch.startTime && att.createdAt) {
                            const shiftStart = new Date(`${sch.date}T${sch.startTime}`);
                            const clockIn = att.createdAt.toDate ? att.createdAt.toDate() : new Date(att.createdAt);
                            const diff = Math.floor((clockIn - shiftStart) / 60000);

                            if (diff > 10) {
                                lateCount++;
                                lateMins += diff;
                                score -= (diff > 60 ? 10 : 5);
                                incidents.push({ date: dateShort, type: 'late', val: `${diff} น.`, severity: diff > 60 ? 'high' : 'medium' });
                            }
                        }
                        // 2. เช็ค OT
                        if (sch.endTime && att.clockOut) {
                            const shiftEnd = new Date(`${sch.date}T${sch.endTime}`);
                            const clockOut = att.clockOut.toDate ? att.clockOut.toDate() : new Date(att.clockOut);
                            const diffOT = (clockOut - shiftEnd) / 3600000;
                            if (diffOT > 1) {
                                otHours += diffOT;
                                if (diffOT > 4) incidents.push({ date: dateShort, type: 'overwork', val: `${diffOT.toFixed(1)} ชม.`, severity: 'high' });
                            }
                        }
                    } else if (isPast && sch.type === 'work') {
                        // 3. เช็คขาดงาน
                        absentCount++;
                        currentAbsentStreak++; // เพิ่ม Streak
                        maxAbsentStreak = Math.max(maxAbsentStreak, currentAbsentStreak); // เก็บสถิติสูงสุด

                        score -= 20;
                        if (dayOfWeek === 1) mondayAbsent++;
                        if (dayOfWeek === 5) fridayAbsent++;
                        incidents.push({ date: dateShort, type: 'absent', val: 'ขาดงาน', severity: 'critical' });
                    }
                });

                if (score < 0) score = 0;
                const lostCost = (lateMins * minuteRate) + (absentCount * 8 * 60 * minuteRate);

                // --- 🔥 SMART ANALYSIS LOGIC (Priority System) ---
                const tags = [];
                let riskLevel = 'low';
                let insight = { title: "พฤติกรรมปกติ", text: "ปฏิบัติงานตามมาตรฐาน", color: "slate", icon: "Smiley" };

                // คำนวณ % การขาดงาน
                const absentRate = workDaysCount > 0 ? (absentCount / workDaysCount) * 100 : 0;

                // Priority 1: ระดับวิกฤต (Ghosting / หายตัว)
                if (absentRate >= 50) { // ถ้าขาดเกิน 50% ของวันทำงาน
                    tags.push({ text: 'วิกฤต', color: 'red' });
                    tags.push({ text: 'เสี่ยงละทิ้งงาน', color: 'red' });
                    riskLevel = 'high';
                    insight = {
                        title: "เสี่ยงละทิ้งหน้าที่ (Critical)",
                        text: `ขาดงานถึง ${absentCount} วัน (${absentRate.toFixed(0)}% ของเวลาทำงาน) เข้าข่ายละทิ้งหน้าที่`,
                        color: "red", icon: "WarningCircle"
                    };
                }
                // Priority 2: หยุดยาวติดต่อกัน (Consecutive)
                else if (maxAbsentStreak >= 3) {
                    tags.push({ text: 'หยุดยาว', color: 'orange' });
                    riskLevel = 'high';
                    insight = {
                        title: "ขาดงานต่อเนื่อง (Long Streak)",
                        text: `พบการขาดงานติดต่อกัน ${maxAbsentStreak} วัน โดยไม่แจ้งล่วงหน้า`,
                        color: "orange", icon: "WarningCircle"
                    };
                }
                // Priority 3: Pattern (ป่วยการเมือง) -> จะเช็คก็ต่อเมื่อไม่ใช่วิกฤต
                else if (mondayAbsent >= 2 || fridayAbsent >= 2) {
                    tags.push({ text: 'ป่วยการเมือง?', color: 'orange' });
                    riskLevel = 'medium';
                    insight = {
                        title: "Pattern Alert (หยุดยาว)",
                        text: `มักขาดงานช่วงหัว/ท้ายสัปดาห์ (จันทร์/ศุกร์ รวม ${mondayAbsent + fridayAbsent} ครั้ง)`,
                        color: "orange", icon: "Detective"
                    };
                }
                // Priority 4: ปัญหาเรื่องวินัยเวลา (สาย/OT)
                else if (lateCount >= 3) {
                    tags.push({ text: 'สายบ่อย', color: 'red' });
                    riskLevel = 'medium';
                    insight = { title: "สายสะสม", text: `สาย ${lateCount} ครั้ง (${lateMins} น.) คิดเป็นเงิน ${Math.floor(lateMins * minuteRate)} บาท`, color: "red", icon: "Clock" };
                } else if (otHours > 40) {
                    tags.push({ text: 'เสี่ยง Burnout', color: 'yellow' });
                    riskLevel = 'watch';
                    insight = { title: "เสี่ยงหมดไฟ", text: `OT สูงถึง ${otHours.toFixed(1)} ชม.`, color: "yellow", icon: "Fire" };
                }

                // Priority 5: คนดี
                if (score >= 95 && riskLevel === 'low') {
                    tags.push({ text: 'ดีเยี่ยม', color: 'emerald' });
                    insight = { title: "พนักงานดีเด่น", text: "วินัยดีเยี่ยม ไม่สาย ไม่ขาด", color: "emerald", icon: "Trophy" };
                }

                let grade = score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D';

                return {
                    ...emp,
                    stats: { lateCount, lateMins, otHours, absentCount, earlyLeaveCount },
                    incidents, lostCost, score, grade, tags, riskLevel, insight
                };
            });

            const topLate = [...analyzedList].sort((a, b) => b.stats.lateMins - a.stats.lateMins).slice(0, 3);
            const topGood = [...analyzedList].filter(e => e.score >= 90).sort((a, b) => b.score - a.score).slice(0, 3);

            setReportData(analyzedList);
            setOverview(prev => ({ ...prev, topLate, topGood }));
            setIsInsightGenerated(true);
            setLoading(false);

        } catch (e) { console.error(e); setLoading(false); }
    }, [companyId, selectedMonth]);

    // ===============================================
    // 3. DRILL-DOWN: Daily Attendance (Specific Date)
    // ===============================================
    const getDailyAttendance = useCallback(async (dateStr) => {
        // dateStr format: YYYY-MM-DD
        try {
            // 1. Use Cached Employees (Zero-Cost Read)
            let employees = employeesCache;

            // Fallback: If cache empty (shouldn't happen often), fetch
            if (employees.length === 0) {
                const usersSnap = await getDocs(query(collection(db, "users"),
                    where("companyId", "==", companyId),
                    where("role", "==", "employee"),
                    where("status", "==", "active")
                ));
                const uniqueUsersMap = new Map();
                usersSnap.docs.forEach(d => {
                    const data = d.data();
                    if (data.active === false) return;
                    if (!uniqueUsersMap.has(d.id)) uniqueUsersMap.set(d.id, { id: d.id, ...data });
                });
                employees = Array.from(uniqueUsersMap.values());
                setEmployeesCache(employees);
            }

            // 2. Fetch from BOTH sources in parallel
            const startOfDay = `${dateStr}T00:00:00`;
            const endOfDay = `${dateStr}T23:59:59`;

            const [dailySummarySnap, logsSnap] = await Promise.all([
                // Source A: daily_attendance (legacy zero-cost stats) — ใช้ doc ID = dateStr
                getDocs(query(
                    collection(db, 'companies', companyId, 'daily_attendance'),
                    where('date', '==', dateStr)
                )).catch(() => ({ docs: [] })),

                // Source B: attendance_logs (new domain) — range query
                getDocs(query(
                    collection(db, "attendance_logs"),
                    where("company_id", "==", companyId),
                    where("clock_in", ">=", startOfDay),
                    where("clock_in", "<=", endOfDay)
                )).catch(() => ({ docs: [] }))
            ]);

            // 3. Build attendanceMap from BOTH sources
            const attendanceMap = {};

            // Source A: daily_attendance → attendance sub-map { userId: { timeIn, status, ... } }
            dailySummarySnap.docs.forEach(d => {
                const data = d.data();
                const attMap = data.attendance || {};
                Object.entries(attMap).forEach(([userId, attData]) => {
                    attendanceMap[userId] = {
                        userId,
                        createdAt: attData.timeIn ? new Date(attData.timeIn) : null,
                        clockOut: attData.timeOut ? new Date(attData.timeOut) : null,
                        status: attData.status || 'on-time',
                        lateMins: attData.lateMins || attData.lateMinutes || 0
                    };
                });
            });

            // Source B: attendance_logs (overrides daily_attendance if both exist)
            logsSnap.docs.forEach(d => {
                const data = d.data();
                attendanceMap[data.employee_id] = {
                    userId: data.employee_id,
                    createdAt: data.clock_in ? new Date(data.clock_in) : null,
                    clockOut: data.clock_out ? new Date(data.clock_out) : null,
                    status: data.status || 'on-time',
                    lateMins: data.late_minutes || 0
                };
            });

            // 4. Merge with Employee List
            const dailyDetails = employees.map(emp => {
                const att = attendanceMap[emp.id];
                return {
                    id: emp.id,
                    name: emp.name,
                    avatar: emp.avatar,
                    hasAttendance: !!att,
                    clockIn: att?.createdAt ? (att.createdAt.toDate ? att.createdAt.toDate() : new Date(att.createdAt)) : null,
                    clockOut: att?.clockOut ? (att.clockOut.toDate ? att.clockOut.toDate() : new Date(att.clockOut)) : null,
                    status: att?.status || 'absent',
                    lateMins: att?.lateMins || 0
                };
            });

            return dailyDetails;

        } catch (error) {
            console.error("Error fetching daily details:", error);
            return [];
        }
    }, [companyId, employeesCache]);

    // ===============================================
    // 4. DRILL-DOWN: Individual Monthly History
    // ===============================================
    const getEmployeeMonthlyAttendance = useCallback(async (employeeId) => {
        try {
            const { start, end } = getMonthRange(selectedMonth);
            // Fetch logs
            // Fetch logs from attendance_logs
            const q = query(
                collection(db, "attendance_logs"),
                where("company_id", "==", companyId),
                where("employee_id", "==", employeeId),
                where("clock_in", ">=", start),
                where("clock_in", "<=", end)
            );
            const snap = await getDocs(q);
            const logs = snap.docs.map(d => {
                const data = d.data();
                return {
                    ...data,
                    userId: data.employee_id,
                    date: data.clock_in ? data.clock_in.split('T')[0] : '',
                    createdAt: data.clock_in ? new Date(data.clock_in) : null,
                    clockOut: data.clock_out ? new Date(data.clock_out) : null,
                    lateMins: data.late_minutes || 0,
                    status: data.status || 'on-time'
                };
            });

            // Sort by date desc
            return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (e) {
            console.error(e);
            return [];
        }
    }, [companyId, selectedMonth]);

    return { overview, graphData, reportData, loading, isInsightGenerated, analyzeInsights, getDailyAttendance, getEmployeeMonthlyAttendance };
}