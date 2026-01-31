import { useState, useEffect } from 'react';
import { db } from '@/shared/lib/firebase';
import {
    collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp, writeBatch
} from 'firebase/firestore';

/**
 * Hook for payroll management (admin perspective)
 * Full calculation logic for monthly payslips
 */
export function usePayrollAdmin(companyId, selectedMonth = new Date()) {
    const [payrollData, setPayrollData] = useState([]);
    const [summary, setSummary] = useState({ totalPay: 0, totalStaff: 0 });
    const [loading, setLoading] = useState(false);
    const [hasSavedData, setHasSavedData] = useState(false);
    const [isMonthPaid, setIsMonthPaid] = useState(false); // ✅ เช็คสถานะปิดงวด

    const getMonthId = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // 1. โหลดข้อมูลเมื่อเปลี่ยนเดือน
    useEffect(() => {
        if (!companyId) return;
        const checkSavedData = async () => {
            setLoading(true);
            const monthId = getMonthId(selectedMonth);
            const q = query(collection(db, "payslips"), where("companyId", "==", companyId), where("monthId", "==", monthId));
            const snap = await getDocs(q);

            if (!snap.empty) {
                const savedList = snap.docs.map(doc => ({ ...doc.data(), status: doc.data().status || 'saved' }));
                setPayrollData(savedList);
                calculateSummary(savedList);
                setHasSavedData(true);

                // ✅ เช็คว่าถ้าทุกคนสถานะ 'paid' แสดงว่าปิดงวดแล้ว
                const allPaid = savedList.length > 0 && savedList.every(p => p.status === 'paid');
                setIsMonthPaid(allPaid);
            } else {
                setPayrollData([]);
                setSummary({ totalPay: 0, totalStaff: 0 });
                setHasSavedData(false);
                setIsMonthPaid(false);
            }
            setLoading(false);
        };
        checkSavedData();
    }, [companyId, selectedMonth]);

    const calculateSummary = (list) => {
        const sum = list.reduce((acc, curr) => acc + (curr.netTotal || 0), 0);
        setSummary({ totalPay: sum, totalStaff: list.length });
    };

    // 2. ฟังก์ชันคำนวณ (Recalculate)
    const startCalculation = async () => {
        setLoading(true);
        try {
            const monthId = getMonthId(selectedMonth);
            const year = selectedMonth.getFullYear();
            const month = selectedMonth.getMonth(); // 0-11

            // ✅ 1. สร้างขอบเขตวันที่ของเดือนนั้น (Start - End)
            // เช่น "2025-01-01" ถึง "2025-01-31"
            const startDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            // หาวันสุดท้ายของเดือนแบบง่ายๆ (ใช้วันที่ 1 เดือนถัดไป ลบ 1 วัน หรือใช้ 31 ไปเลยก็ได้เพราะ string comparison รองรับ)
            // แต่เพื่อความชัวร์ใช้เทคนิคนี้:
            const lastDayObj = new Date(year, month + 1, 0);
            const endDay = `${year}-${String(month + 1).padStart(2, '0')}-${lastDayObj.getDate()}`;

            // ✅ 2. แก้ Query ให้ดึงเฉพาะช่วงวันที่กำหนด (Optimized Query)
            const [usersSnap, schedulesSnap, attendanceSnap, configDoc, savedPayslipsSnap] = await Promise.all([
                getDocs(query(collection(db, "users"), where("companyId", "==", companyId))),

                // แก้: เพิ่ม where date
                getDocs(query(collection(db, "schedules"),
                    where("companyId", "==", companyId),
                    where("date", ">=", startDay),
                    where("date", "<=", endDay)
                )),

                // แก้: เพิ่ม where date
                getDocs(query(collection(db, "attendance"),
                    where("companyId", "==", companyId),
                    where("date", ">=", startDay),
                    where("date", "<=", endDay)
                )),

                getDoc(doc(db, "companies", companyId)),
                getDocs(query(collection(db, "payslips"), where("companyId", "==", companyId), where("monthId", "==", monthId)))
            ]);

            const config = configDoc.exists() ? configDoc.data() : {};
            const deductionRules = config.settings?.deduction || {};
            const otRates = config.otTypes || [];

            const savedMap = {};
            savedPayslipsSnap.forEach(doc => { savedMap[doc.data().userId] = doc.data(); });

            const employees = usersSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(u => u.role === 'employee');

            const allSchedules = schedulesSnap.docs.map(d => d.data());
            const allAttendances = attendanceSnap.docs.map(d => d.data());

            const calculatedList = employees.map(user => {
                const salary = Number(user.salary) || 0;
                const salaryType = user.salaryType || 'monthly';

                // ✅ แก้ไข: รองรับ 'wht' และแปลงค่าให้ถูกต้อง
                let rawProfile = user.taxMode || user.deductionProfile || 'none';
                let freshDeductionProfile = 'none';

                if (rawProfile === 'sso' || rawProfile.includes('ประกันสังคม')) {
                    freshDeductionProfile = 'sso';
                } else if (['tax', 'wht'].includes(rawProfile) || rawProfile.includes('3%') || rawProfile.includes('ภาษี')) {
                    freshDeductionProfile = 'tax';
                } else if (rawProfile === 'sso_tax' || (rawProfile.includes('ประกัน') && rawProfile.includes('ภาษี'))) {
                    freshDeductionProfile = 'sso_tax';
                }

                const savedData = savedMap[user.id] || {};
                const customIncomes = savedData.customIncomes || [];
                const customDeductions = savedData.customDeductions || [];

                let totalIncome = 0; let totalDeduction = 0; let totalOTPay = 0; let totalIncentive = 0;
                let lateCount = 0, lateMinutes = 0, otHours = 0, absentCount = 0;
                const dailyDetails = [];

                const mySchedules = allSchedules.filter(s => s.userId === user.id);
                const myAttendance = allAttendances.filter(a => a.userId === user.id);
                mySchedules.sort((a, b) => new Date(a.date) - new Date(b.date));

                mySchedules.forEach(sch => {
                    if (sch.type === 'off' || sch.type === 'holiday') return;
                    const att = myAttendance.find(a => a.date === sch.date);
                    let dayIncome = 0, dayDeduction = 0, notes = [];

                    if (att && att.createdAt) {
                        if (salaryType === 'daily') { dayIncome += salary; totalIncome += salary; }
                        const shiftStart = new Date(`${sch.date}T${sch.startTime}`);
                        const clockIn = att.createdAt.toDate ? att.createdAt.toDate() : new Date(att.createdAt);
                        let diffMinutes = Math.floor((clockIn - shiftStart) / 1000 / 60);
                        if (diffMinutes > (Number(deductionRules.gracePeriod) || 0)) {
                            lateCount++; lateMinutes += diffMinutes;
                            const fine = diffMinutes * (Number(deductionRules.deductionPerMinute) || 0);
                            dayDeduction += fine; totalDeduction += fine; notes.push(`สาย ${diffMinutes} น.`);
                        }
                    } else { absentCount++; notes.push(`ขาดงาน`); }

                    if (sch.hasOT && sch.otType && sch.otHours > 0 && att && att.clockOut) {
                        const shiftEnd = new Date(`${sch.date}T${sch.endTime}`);
                        const clockOut = att.clockOut.toDate ? att.clockOut.toDate() : new Date(att.clockOut);
                        let actual = (clockOut - shiftEnd) / 1000 / 60;
                        if (actual < 0) actual = 0;
                        const approved = sch.otHours * 60;
                        const finalHours = Math.min(actual, approved) / 60;
                        if (finalHours > 0) {
                            const otTypeObj = otRates.find(t => t.id === sch.otType);
                            const rate = otTypeObj ? otTypeObj.rate : 1.5;
                            const hourlyWage = salaryType === 'daily' ? (salary / 8) : (salary / 30 / 8);
                            const otPay = hourlyWage * finalHours * rate;
                            totalOTPay += otPay; otHours += finalHours; dayIncome += otPay; notes.push(`OT ${finalHours.toFixed(1)} ชม.`);
                        }
                    }

                    if (sch.incentive) {
                        const inc = Number(sch.incentive);
                        totalIncentive += inc;
                        if (salaryType === 'daily') totalIncome += inc;
                        dayIncome += inc; notes.push(`Incentive`);
                    }

                    dailyDetails.push({
                        date: sch.date,
                        shift: `${sch.startTime}-${sch.endTime}`,
                        checkIn: att ? new Date(att.createdAt.toDate ? att.createdAt.toDate() : att.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-',
                        checkOut: att?.clockOut ? new Date(att.clockOut.toDate ? att.clockOut.toDate() : att.clockOut).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-',
                        income: dayIncome, deduction: dayDeduction, status: !att ? 'absent' : 'present', note: notes.join(', ')
                    });
                });

                const maxDed = Number(deductionRules.maxDeduction);
                if (maxDed > 0 && totalDeduction > maxDed) totalDeduction = maxDed;

                let baseSalaryCalc = salaryType === 'monthly' ? salary : totalIncome;
                if (salaryType === 'monthly') baseSalaryCalc += 0;

                let sso = 0; let tax = 0;
                if (freshDeductionProfile === 'sso' || freshDeductionProfile === 'sso_tax') sso = Math.min(baseSalaryCalc, 15000) * 0.05;
                if (freshDeductionProfile === 'tax' || freshDeductionProfile === 'sso_tax') tax = baseSalaryCalc * 0.03;

                const totalCustomIncome = customIncomes.reduce((s, i) => s + Number(i.amount), 0);
                const totalCustomDeduction = customDeductions.reduce((s, i) => s + Number(i.amount), 0);
                const netTotalCalc = baseSalaryCalc + totalOTPay + (salaryType === 'monthly' ? totalIncentive : 0) + totalCustomIncome - totalDeduction - sso - tax - totalCustomDeduction;

                return {
                    id: user.id, userId: user.id, name: user.name || 'พนักงาน', role: user.position || 'พนักงาน', avatar: user.avatar || null,
                    salaryType, baseSalary: baseSalaryCalc, otPay: totalOTPay, incentive: totalIncentive,
                    otHours, lateCount, lateMinutes, absentCount, lateDeduction: totalDeduction,
                    deductionProfile: freshDeductionProfile, socialSecurity: sso, tax: tax,
                    customIncomes, customDeductions,
                    netTotal: netTotalCalc,
                    status: savedData.status || 'draft', // คงสถานะเดิม ถ้ามี
                    dailyDetails
                };
            });

            calculateSummary(calculatedList);
            setPayrollData(calculatedList);
            setHasSavedData(false);
            setIsMonthPaid(false); // คำนวณใหม่ = เปิดงวดใหม่
            setLoading(false);

        } catch (err) { console.error("Calc Error:", err); setLoading(false); alert("Error: " + err.message); }
    };

    const savePayslip = async (payslipData) => {
        try {
            const monthId = getMonthId(selectedMonth);
            const docId = `payslip_${payslipData.userId}_${monthId}`;
            const { dailyDetails, ...dataToSave } = payslipData;
            await setDoc(doc(db, "payslips", docId), { ...dataToSave, companyId, monthId, updatedAt: serverTimestamp() }, { merge: true });
            setPayrollData(prev => prev.map(p => p.id === payslipData.userId ? { ...p, ...dataToSave, status: 'saved' } : p));
            return true;
        } catch (e) { throw e; }
    };

    // 3. ฟังก์ชันปิดงวด (Confirm Payment)
    const confirmMonthPayment = async () => {
        if (payrollData.length === 0) return;
        if (!window.confirm("ยืนยันการปิดงวดบัญชีเดือนนี้?\n\n- ข้อมูลจะถูกล็อกและแก้ไขไม่ได้\n- สถานะจะเปลี่ยนเป็น 'จ่ายแล้ว (Paid)'")) return;

        setLoading(true);
        try {
            const batch = writeBatch(db);
            const monthId = getMonthId(selectedMonth);

            payrollData.forEach(emp => {
                const docRef = doc(db, "payslips", `payslip_${emp.userId}_${monthId}`);
                const { dailyDetails, ...dataToSave } = emp;
                // อัปเดตสถานะเป็น 'paid'
                batch.set(docRef, { ...dataToSave, companyId, monthId, status: 'paid', updatedAt: serverTimestamp() }, { merge: true });
            });

            await batch.commit();
            setPayrollData(prev => prev.map(p => ({ ...p, status: 'paid' })));
            setIsMonthPaid(true);
            setLoading(false);
            alert("ปิดงวดเรียบร้อย! ข้อมูลถูกล็อกแล้ว 🔒");
        } catch (e) {
            console.error(e);
            setLoading(false);
            alert("เกิดข้อผิดพลาด: " + e.message);
        }
    };

    return { payrollData, summary, loading, hasSavedData, isMonthPaid, startCalculation, savePayslip, confirmMonthPayment };
}