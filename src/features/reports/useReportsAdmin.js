import { useState, useEffect, useCallback } from 'react';
import { db } from '@/shared/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

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

    // 1. AUTO: Overview (เหมือนเดิมเป๊ะ ไม่ต้องแก้ส่วนนี้)
    useEffect(() => {
        if (!companyId) return;
        const fetchOverview = async () => {
            setLoading(true);
            try {
                const { start, end, daysInMonth } = getMonthRange(selectedMonth);
                const [attSnap, schSnap, usersSnap] = await Promise.all([
                    getDocs(query(collection(db, "attendance"), where("companyId", "==", companyId), where("date", ">=", start), where("date", "<=", end))),
                    getDocs(query(collection(db, "schedules"), where("companyId", "==", companyId), where("date", ">=", start), where("date", "<=", end))),
                    getDocs(query(collection(db, "users"), where("companyId", "==", companyId)))
                ]);

                const attendances = attSnap.docs.map(d => d.data());
                const schedules = schSnap.docs.map(d => d.data());
                const employees = usersSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role === 'employee');

                let totalWorkDays = 0, totalPresentDays = 0;
                const dailyStats = Array.from({ length: daysInMonth }, (_, i) => {
                    const dayStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                    const schForDay = schedules.filter(s => s.date === dayStr && s.type === 'work');
                    const attForDay = attendances.filter(a => a.date === dayStr);

                    const late = attForDay.filter(a => {
                        const sch = schForDay.find(s => s.userId === a.userId);
                        if (!sch || !sch.startTime || !a.createdAt) return false;
                        const shiftStart = new Date(`${dayStr}T${sch.startTime}`);
                        const clockIn = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                        return (clockIn - shiftStart) / 60000 > 10;
                    }).length;

                    const present = attForDay.length;
                    const isPast = new Date(dayStr) < new Date();
                    const absent = isPast ? Math.max(0, schForDay.length - present) : 0;

                    totalWorkDays += schForDay.length;
                    totalPresentDays += present;
                    return { day: i + 1, dateFull: dayStr, onTime: Math.max(0, present - late), late, absent };
                });
                setGraphData(dailyStats);

                const quickStats = employees.map(emp => {
                    const myAtt = attendances.filter(a => a.userId === emp.id);
                    const mySch = schedules.filter(s => s.userId === emp.id);
                    let lateMins = 0, lateCount = 0, absentCount = 0, otHours = 0;

                    mySch.forEach(sch => {
                        const att = myAtt.find(a => a.date === sch.date);
                        const isPast = new Date(sch.date) < new Date();

                        if (att) {
                            if (sch.startTime && att.createdAt) {
                                const shiftStart = new Date(`${sch.date}T${sch.startTime}`);
                                const clockIn = att.createdAt.toDate ? att.createdAt.toDate() : new Date(att.createdAt);
                                const diff = Math.floor((clockIn - shiftStart) / 60000);
                                if (diff > 10) { lateMins += diff; lateCount++; }
                            }
                            if (sch.endTime && att.clockOut) {
                                const shiftEnd = new Date(`${sch.date}T${sch.endTime}`);
                                const clockOut = att.clockOut.toDate ? att.clockOut.toDate() : new Date(att.clockOut);
                                const diffOT = (clockOut - shiftEnd) / 3600000;
                                if (diffOT > 1) otHours += diffOT;
                            }
                        } else if (isPast && sch.type === 'work') {
                            absentCount++;
                        }
                    });
                    let simpleScore = 100 - (lateCount * 5) - (absentCount * 20);
                    if (simpleScore < 0) simpleScore = 0;
                    return { ...emp, lateMins, simpleScore, lateCount, otHours };
                });

                const totalLateMins = quickStats.reduce((acc, curr) => acc + curr.lateMins, 0);
                const totalOTHours = quickStats.reduce((acc, curr) => acc + curr.otHours, 0);
                const topLate = [...quickStats].filter(e => e.lateMins > 0).sort((a, b) => b.lateMins - a.lateMins).slice(0, 3);
                const topGood = [...quickStats].sort((a, b) => b.simpleScore - a.simpleScore).slice(0, 3);
                const attRate = totalWorkDays > 0 ? (totalPresentDays / totalWorkDays) * 100 : 0;

                setOverview({ attendanceRate: attRate, totalLateMins, totalOTHours, totalEmployees: employees.length, topLate, topGood });
                setLoading(false);
                setIsInsightGenerated(false);
                setReportData([]);
            } catch (e) { console.error(e); setLoading(false); }
        };
        fetchOverview();
    }, [companyId, selectedMonth]);

    // ===============================================
    // 2. MANUAL: Insight (🔥 ส่วนที่อัปเกรดความฉลาด)
    // ===============================================
    const analyzeInsights = useCallback(async () => {
        setLoading(true);
        try {
            const { start, end } = getMonthRange(selectedMonth);
            const [usersSnap, attSnap, schSnap] = await Promise.all([
                getDocs(query(collection(db, "users"), where("companyId", "==", companyId))),
                getDocs(query(collection(db, "attendance"), where("companyId", "==", companyId), where("date", ">=", start), where("date", "<=", end))),
                getDocs(query(collection(db, "schedules"), where("companyId", "==", companyId), where("date", ">=", start), where("date", "<=", end)))
            ]);

            const employees = usersSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role === 'employee');
            const attendances = attSnap.docs.map(d => d.data());
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

    return { overview, graphData, reportData, loading, isInsightGenerated, analyzeInsights };
}