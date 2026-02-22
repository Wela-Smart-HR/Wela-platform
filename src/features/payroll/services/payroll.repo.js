import { db } from '../../../shared/lib/firebase'; // Adjust path as needed
import {
    collection, doc, getDoc, getDocs, setDoc, updateDoc,
    query, where, orderBy, runTransaction, serverTimestamp, writeBatch
} from 'firebase/firestore';
import { PayrollCalculator } from './payroll.calculator';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

const COMPANY_TIMEZONE = 'Asia/Bangkok';

export const PayrollRepo = {

    /**
     * Create a new Payroll Cycle
     * @param {string} companyId 
     * @param {Object} cycleData { month, period, target }
     */
    async createCycle(companyId, cycleData) {
        // 1. Setup Dates
        const [year, month] = cycleData.month.split('-').map(Number);
        let startDay, endDay;

        if (cycleData.period === 'first') {
            startDay = `${year}-${String(month).padStart(2, '0')}-01`;
            endDay = `${year}-${String(month).padStart(2, '0')}-15`;
        } else if (cycleData.period === 'second') {
            startDay = `${year}-${String(month).padStart(2, '0')}-16`;
            const lastDay = new Date(year, month, 0).getDate();
            endDay = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        } else {
            startDay = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            endDay = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        }

        // 2. Fetch Data (Parallel)
        console.log("Fetching data for cycle:", { companyId, startDay, endDay });

        // Fix: Query BOTH Legacy ('attendance') AND New ('attendance_logs') collections
        const [usersSnap, legacySnap, newLogsSnap, companySnap] = await Promise.all([
            getDocs(query(collection(db, 'users'), where('companyId', '==', companyId))),
            getDocs(query(collection(db, 'attendance'),
                where('companyId', '==', companyId),
                where('date', '>=', startDay),
                where('date', '<=', endDay)
            )),
            getDocs(query(collection(db, 'attendance_logs'),
                where('company_id', '==', companyId)
                // ⚠️ NO Firestore date range here — old approved-adjustment records
                // were stored as '2026-02-01T09:00:00+07:00' (offset format).
                // Firestore string comparison is LEXICOGRAPHIC: '+07:00' records fall
                // OUTSIDE any UTC 'Z'-based range. We filter client-side instead.
            )),
            getDoc(doc(db, 'companies', companyId))
        ]);

        const companyConfig = companySnap.exists() ? companySnap.data() : {};

        // Robust Merge of Deduction Rules
        // Source of truth can be scattered in 'deduction' (consolidated), 'payrollConfig', or 'attendanceConfig'
        const deductionConfig = {
            ...companyConfig.deduction,
            deductionPerMinute: companyConfig.payrollConfig?.deductionPerMinute ?? companyConfig.deduction?.deductionPerMinute,
            maxDeduction: companyConfig.payrollConfig?.maxDeduction ?? companyConfig.deduction?.maxDeduction,
            gracePeriod: companyConfig.attendanceConfig?.gracePeriod ?? companyConfig.deduction?.gracePeriod
        };

        let employees = usersSnap.docs
            .map(d => {
                const data = d.data();
                // Normalize salaryType (Thai -> English)
                let sType = data.salaryType || data.type || 'monthly';
                if (sType === 'รายวัน') sType = 'daily';
                else if (sType === 'รายเดือน') sType = 'monthly';

                return { id: d.id, ...data, salaryType: sType };
            })
            .filter(u => u.role !== 'admin' && u.active !== false && u.status !== 'resigned');

        // Filter by Target Group (daily / monthly)
        if (cycleData.target && cycleData.target !== 'all') {
            employees = employees.filter(emp => emp.salaryType === cycleData.target);
        }

        // Deduplicate by Name (Handle dirty data)
        const seenNames = new Set();
        employees = employees.filter(emp => {
            const normalizedName = emp.name?.trim();
            if (!normalizedName) return false;
            if (seenNames.has(normalizedName)) {
                console.warn("Duplicate employee removed:", normalizedName, emp.id);
                return false;
            }
            seenNames.add(normalizedName);
            return true;
        });

        // Parse Logs
        const legacyLogs = legacySnap.docs.map(d => d.data());
        const allNewLogs = newLogsSnap.docs.map(d => d.data());

        // Client-side date filter for attendance_logs
        // ✅ BULLETPROOF: Use dayjs core functions instead of String manipulation
        // แปลง startDay (เช่น "2026-02-01") เป็นจุดเริ่มต้นของวันนั้นในเวลาประเทศไทย
        const rangeStart = dayjs.tz(startDay, COMPANY_TIMEZONE).startOf('day');
        // แปลง endDay (เช่น "2026-02-15") เป็นจุดสิ้นสุดของวันนั้นในเวลาประเทศไทย
        const rangeEnd = dayjs.tz(endDay, COMPANY_TIMEZONE).endOf('day');

        const newLogs = allNewLogs.filter(log => {
            if (!log.clock_in) return false;

            // 1. Normalize ข้อมูลให้เป็น dayjs object (รองรับทั้ง Timestamp และ String)
            let clockInDayjs;
            if (log.clock_in.toDate) {
                clockInDayjs = dayjs(log.clock_in.toDate()); // Firestore Timestamp
            } else {
                clockInDayjs = dayjs(log.clock_in); // String format
            }

            if (!clockInDayjs.isValid()) return false;

            // 2. เปรียบเทียบเวลาโดยใช้ .isBetween() อย่างปลอดภัย
            // '[]' หมายถึง inclusive (นับรวมขอบเขตหัวท้ายด้วย)
            return clockInDayjs.isBetween(rangeStart, rangeEnd, 'millisecond', '[]');
        });

        console.log('Payroll createCycle:', {
            legacy: legacyLogs.length,
            new: newLogs.length,
            totalNew: allNewLogs.length,
            dateRange: { startDay, endDay },
            timezoneInfo: { companyTimezone: COMPANY_TIMEZONE, rangeStart: rangeStart.format(), rangeEnd: rangeEnd.format() },
            sampleNewLogDates: allNewLogs.slice(0, 5).map(l => ({
                clockIn: l.clock_in,
                formatted: l.clock_in?.toDate ? l.clock_in.toDate().toISOString() : l.clock_in,
                isValid: l.clock_in ? (dayjs(l.clock_in.toDate ? l.clock_in.toDate() : l.clock_in).isValid()) : false
            }))
        });

        // 3. Batch Creation
        const batch = writeBatch(db);
        const cycleId = `${companyId}_${cycleData.month}_${cycleData.period}`;
        const cycleRef = doc(db, 'payroll_cycles', cycleId);

        let totalNet = 0;
        let count = 0;

        employees.forEach(emp => {
            // -- Core Calculation Logic --
            const baseSalary = Number(emp.salary) || 0;
            const salaryType = emp.salaryType || 'monthly';
            const dailyRate = salaryType === 'daily' ? baseSalary : (baseSalary / 30);
            const hourlyRate = dailyRate / 8;

            // map to store merged daily records
            const dayMap = {};

            // 1. Process Legacy Logs (Base)
            const empLegacy = legacyLogs.filter(a => a.userId === emp.id);
            console.log(`[Payroll][${emp.name}] legacy matched: ${empLegacy.length}/${legacyLogs.length}, new matched: ${newLogs.filter(a => a.employee_id === emp.id).length}/${newLogs.length}`);

            empLegacy.forEach(log => {
                const dateKey = log.date;
                if (!dateKey) return;

                if (!dayMap[dateKey]) {
                    dayMap[dateKey] = {
                        date: dateKey,
                        userId: emp.id,
                        checkIn: null,
                        checkOut: null,
                        status: 'present',
                        lateMinutes: 0,
                        otHours: 0
                    };
                }
                const entry = dayMap[dateKey];

                if (log.type === 'clock-in') {
                    // Extract HH:mm from localTimestamp (e.g. "2026-02-06T08:30:00")
                    entry.checkIn = log.localTimestamp?.split('T')[1]?.substring(0, 5) || null;
                    entry.status = log.status || entry.status;
                }
                if (log.type === 'clock-out') {
                    entry.checkOut = log.localTimestamp?.split('T')[1]?.substring(0, 5) || null;
                }

                // ✅ Handle retro-approved / retro records
                // ⚠️ Old approval code stored clockOut as Firestore Timestamp (NOT "HH:mm" string)
                //    Assigning Timestamp to entry.checkOut → UI displays nothing
                if (log.type === 'retro-approved' || log.type === 'retro' || log.type === 'adjustment') {
                    // Helper: converts Firestore Timestamp OR "HH:mm" string → "HH:mm" or null
                    const toTimeStr = (val) => {
                        if (!val) return null;
                        if (typeof val === 'string') return val.substring(0, 5);
                        const d = val.toDate ? val.toDate() : (val.seconds ? new Date(val.seconds * 1000) : null);
                        if (!d) return null;
                        return new Intl.DateTimeFormat('en-GB', {
                            timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false
                        }).format(d);
                    };
                    const rawIn = log.timeIn || log.clockIn || log.data?.timeIn || log.data?.clockIn;
                    const rawOut = log.timeOut || log.clockOut || log.data?.timeOut || log.data?.clockOut;
                    const t = toTimeStr(rawIn);
                    const o = toTimeStr(rawOut);
                    console.log('[Retro] date:', log.date, '→ checkIn:', t, ', checkOut:', o);
                    if (t) entry.checkIn = t;
                    if (o) entry.checkOut = o;
                    entry.status = log.status || 'present';
                }

                // Accumulate from ANY doc type
                if (log.lateMinutes) entry.lateMinutes += Number(log.lateMinutes);
                if (log.otHours) entry.otHours += Number(log.otHours);
            });

            // 2. Process New Logs (Overlay - Priorities over legacy if collision)
            // But usually dates won't overlap if migration is clean.
            // If overlap, we trust New System? Or Accumulate?
            // Safer to overwrite fields if exists, as New System is "Corrected".

            const empNew = newLogs.filter(a => a.employee_id === emp.id);
            empNew.forEach(log => {
                if (!log.clock_in) return;

                const d = log.clock_in.toDate ? log.clock_in.toDate() : new Date(log.clock_in);

                // ✅ Always extract date in Asia/Bangkok (UTC+7) — prevents "previous day" bug
                // e.g. UTC "2026-02-01T02:00:00Z" = Thai "2026-02-01 09:00" → dateKey "2026-02-01" ✓
                const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d);

                if (!dayMap[dateKey]) {
                    dayMap[dateKey] = {
                        date: dateKey,
                        userId: emp.id,
                        checkIn: null,
                        checkOut: null,
                        status: log.status || 'present', // Use log status
                        lateMinutes: 0,
                        otHours: 0
                    };
                }
                const entry = dayMap[dateKey];

                // ✅ Extract HH:mm in Asia/Bangkok — works for both UTC 'Z' and '+07:00' formats
                const timeStr = new Intl.DateTimeFormat('en-GB', {
                    timeZone: 'Asia/Bangkok',
                    hour: '2-digit', minute: '2-digit', hour12: false
                }).format(d);
                entry.checkIn = timeStr; // "HH:mm"

                if (log.clock_out) {
                    const outD = log.clock_out.toDate ? log.clock_out.toDate() : new Date(log.clock_out);
                    const outStr = new Intl.DateTimeFormat('en-GB', {
                        timeZone: 'Asia/Bangkok',
                        hour: '2-digit', minute: '2-digit', hour12: false
                    }).format(outD);
                    entry.checkOut = outStr;
                }

                // Map Fields (New -> Legacy Internal)
                entry.lateMinutes += Number(log.late_minutes || 0);

                // TODO: OT Hours if available in future
                // entry.otHours = Number(log.ot_hours || 0);
            });

            const empLogs = Object.values(dayMap); // 1 row per day merged
            console.log(`[Payroll][${emp.name}] dayMap has ${empLogs.length} days:`, empLogs.map(l => `${l.date}: ${l.checkIn || '?'}→${l.checkOut || '?'}`));

            // STEP 2: Calculate totals & enrich each day
            let workDays = 0;
            let totalOtHours = 0;
            let totalLateMinutes = 0;
            let totalDeductionAmount = 0;

            const enrichedLogs = empLogs.map(log => {
                let logIncome = 0;
                let logDeduction = 0;
                let logNotes = [];

                // Count work days (now 1 record = 1 day, safe)
                if (log.status !== 'absent' && log.checkIn) workDays++;

                // Track Totals
                if (log.lateMinutes > 0) totalLateMinutes += log.lateMinutes;
                if (log.otHours > 0) totalOtHours += log.otHours;

                // --- Per-Day Financials for auditing ---
                // 1. Daily Wage
                if (salaryType === 'daily' && log.status !== 'absent' && log.checkIn) {
                    logIncome += dailyRate;
                }

                // 2. OT Income
                if (cycleData.syncOT && log.otHours > 0) {
                    const otAmt = log.otHours * hourlyRate * 1.5;
                    logIncome += otAmt;
                    logNotes.push(`OT ${log.otHours}h`);
                }

                // 3. Late Deduction
                if (cycleData.syncDeduct && log.lateMinutes > 0) {
                    const fine = PayrollCalculator.calculateLateDeduction(log.lateMinutes, deductionConfig);
                    logDeduction += fine;
                    if (fine > 0) logNotes.push(`สาย ${log.lateMinutes} นาที`);
                    totalDeductionAmount += fine;
                }

                return {
                    ...log,
                    income: logIncome > 0 ? logIncome : 0,
                    deduction: logDeduction > 0 ? logDeduction : 0,
                    note: logNotes.join(', ')
                };
            });

            // Financials
            let salaryPay = baseSalary;
            if (salaryType === 'monthly') {
                if (cycleData.period === 'first' || cycleData.period === 'second') {
                    salaryPay = baseSalary / 2;
                }
            } else if (salaryType === 'daily') {
                salaryPay = workDays * dailyRate;
            }

            // OT Calculation (Total Level)
            let otPay = 0;
            if (cycleData.syncOT && totalOtHours > 0) {
                otPay = totalOtHours * hourlyRate * 1.5;
            }

            // Deduction Calculation (Sum of Daily Deductions respects daily caps / grace periods)
            let deductionAmount = totalDeductionAmount;

            // Tax & SSO: Only if profile enabled
            let sso = 0;
            let tax = 0;
            const dedProfile = emp.deductionProfile || 'none';

            if (dedProfile === 'sso' || dedProfile === 'sso_tax') {
                sso = PayrollCalculator.calculateSSO(baseSalary);
            }
            // Tax: 3% Fixed (As per legacy logic request)
            if (['tax', 'wht', 'sso_tax'].includes(dedProfile)) {
                tax = PayrollCalculator.calculateTax(salaryPay, 0.03);
            }

            const net = PayrollCalculator.calculateNet({
                salary: salaryPay,
                ot: otPay,
                incentive: 0,
                deductions: deductionAmount,
                sso,
                tax
            });

            totalNet += net;
            count++;

            // Create Payslip Doc
            const payslipId = `${emp.id}_${cycleId}`;
            const payslipRef = doc(db, 'payslips', payslipId);

            batch.set(payslipRef, {
                id: payslipId,
                cycleId,
                employeeId: emp.id,
                companyId,
                employeeSnapshot: {
                    name: emp.name || 'Unknown',
                    role: emp.position || 'Staff',
                    department: emp.department || '-',
                    type: salaryType,
                    avatar: emp.avatar || null,
                    deductionProfile: dedProfile,
                    baseSalary
                },
                financials: {
                    salary: salaryPay,
                    ot: otPay,
                    incentive: 0,
                    deductions: deductionAmount,
                    sso,
                    tax,
                    net
                },
                customItems: [],
                payments: [],
                paymentStatus: 'pending',
                paidAmount: 0,
                logsSnapshot: enrichedLogs, // Save enriched logs
                updatedAt: serverTimestamp()
            });
        });

        // Generate human-readable title
        const periodMap = { 'full': 'ทั้งเดือน', 'first': 'ครึ่งเดือนแรก', 'second': 'ครึ่งเดือนหลัง' };
        const mObj = new Date(year, month - 1, 1);
        const monthName = mObj.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
        const cycleTitle = `งวด ${monthName} (${periodMap[cycleData.period] || 'ทั้งเดือน'})`;

        // Save Cycle
        batch.set(cycleRef, {
            ...cycleData,
            id: cycleId,
            title: cycleTitle,
            companyId,
            status: 'draft',
            summary: { totalNet, totalPaid: 0, count },
            startDate: startDay,
            endDate: endDay,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        await batch.commit();
        return cycleId;
    },

    /**
     * Delete a Cycle and ALL its Payslips (Clean Slate)
     * ใช้สำหรับลบรอบบัญชีที่สร้างผิดหรือข้อมูลซ้ำ
     * @param {string} cycleId 
     */
    async deleteCycle(cycleId) {
        // 1. Find all payslips for this cycle
        const q = query(collection(db, 'payslips'), where('cycleId', '==', cycleId));
        const snap = await getDocs(q);

        // 2. Batch delete all payslips + cycle doc
        const batch = writeBatch(db);

        snap.docs.forEach(d => {
            batch.delete(doc(db, 'payslips', d.id));
        });

        // Delete the cycle itself
        batch.delete(doc(db, 'payroll_cycles', cycleId));

        await batch.commit();
        console.log(`Deleted cycle ${cycleId} and ${snap.docs.length} payslips`);
        return { deletedPayslips: snap.docs.length };
    },

    /**
     * Lock a Cycle (ปิดงวด - Prevent further edits)
     * Updates cycle status to 'locked' and all payslips' paymentStatus to 'locked'
     * @param {string} cycleId 
     */
    async lockCycle(cycleId) {
        // 1. Get all payslips for this cycle
        const q = query(
            collection(db, 'payslips'),
            where('cycleId', '==', cycleId)
        );
        const snap = await getDocs(q);

        // 2. Batch update
        const batch = writeBatch(db);

        // Lock the cycle itself
        batch.update(doc(db, 'payroll_cycles', cycleId), {
            status: 'locked',
            lockedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // Lock all payslips
        snap.docs.forEach(d => {
            batch.update(doc(db, 'payslips', d.id), {
                paymentStatus: 'locked',
                updatedAt: serverTimestamp()
            });
        });

        await batch.commit();
        console.log(`Locked cycle ${cycleId} and ${snap.docs.length} payslips`);
    },

    /**
     * Get Cycles for Company
     */
    async getCycles(companyId) {
        const q = query(
            collection(db, 'payroll_cycles'),
            where('companyId', '==', companyId),
            orderBy('month', 'desc')
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    /**
     * Get Payslips for a Cycle
     */
    async getPayslips(cycleId) {
        const q = query(
            collection(db, 'payslips'),
            where('cycleId', '==', cycleId)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    /**
     * Update Payslip (Alias for savePayslip for clearer semantics in UI)
     */
    async updatePayslip(payslipId, data) {
        return this.savePayslip(data);
    },

    /**
     * Save Payslip (Snapshot)
     * @param {Object} payslip 
     */
    async savePayslip(payslip) {
        const ref = doc(db, 'payslips', payslip.id);
        // Ensure financials are numbers (not Decimals) for Firestore
        await setDoc(ref, {
            ...payslip,
            updatedAt: serverTimestamp()
        }, { merge: true });
    },

    /**
     * Add Payment with Transaction (Concurrency Control)
     * @param {string} payslipId 
     * @param {Object} payment { amount, date, method, note }
     */
    async addPayment(payslipId, payment) {
        const psRef = doc(db, 'payslips', payslipId);

        await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(psRef);
            if (!sfDoc.exists()) throw "Payslip does not exist!";

            const data = sfDoc.data();
            const currentPaid = (data.payments || []).reduce((acc, p) => acc + p.amount, 0);
            const netTotal = data.financials?.net || 0;

            // Validation: Cannot pay more than remaining
            if (currentPaid + payment.amount > netTotal) {
                throw new Error(`ยอดจ่ายเกิน! (คงเหลือ: ${netTotal - currentPaid}, จ่าย: ${payment.amount})`);
            }

            const newPayments = [...(data.payments || []), { ...payment, id: Date.now().toString() }];
            const newPaidTotal = currentPaid + payment.amount;

            const newStatus = newPaidTotal >= netTotal ? 'paid' : 'partial';

            transaction.update(psRef, {
                payments: newPayments,
                paymentStatus: newStatus,
                paidAmount: newPaidTotal,
                updatedAt: serverTimestamp()
            });
        });
    },

    /**
     * Batch Lock Cycle
     */
    async lockCycle(cycleId) {
        const batch = writeBatch(db);
        const cycleRef = doc(db, 'payroll_cycles', cycleId);

        // Lock Cycle
        batch.update(cycleRef, { status: 'locked' });

        // Ideally should lock all payslips too, but usually UI restriction is enough for non-critical
        await batch.commit();
    },
    /**
     * Rebuild a Payroll Cycle (Safe Rebuild with Lock Check)
     * ป้องกันการ rebuild cycle ที่จ่ายเงินไปแล้ว
     * @param {string} cycleId 
     */
    async rebuildCycle(cycleId) {
        // 1. Check if cycle is locked (already paid)
        const cycleRef = doc(db, 'payroll_cycles', cycleId);
        const cycleSnap = await getDoc(cycleRef);

        if (!cycleSnap.exists()) {
            throw new Error('Cycle not found');
        }

        const cycleData = cycleSnap.data();

        // 🚨 CRITICAL: Prevent rebuild if cycle is locked or paid
        if (cycleData.status === 'locked') {
            throw new Error('Cannot rebuild locked cycle - payments have been processed');
        }

        // 2. Get all payslips for this cycle to delete them
        const payslipsQ = query(collection(db, 'payslips'), where('cycleId', '==', cycleId));
        const payslipsSnap = await getDocs(payslipsQ);

        // 3. Delete all existing payslips
        const batch = writeBatch(db);
        payslipsSnap.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        console.log(`Deleted ${payslipsSnap.size} existing payslips for rebuild`);

        // 4. Recreate cycle with same parameters
        const [year, month] = cycleData.month.split('-').map(Number);
        const cycleParams = {
            month: cycleData.month,
            period: cycleData.period,
            target: cycleData.target || 'all'
        };

        // 5. Call createCycle with same parameters
        return await this.createCycle(cycleData.companyId, cycleParams);
    },

    /**
     * Validate Payroll Data Integrity
     * ตรวจสอบความสมบูรณ์ของข้อมูลใน cycle
     */
    async validateCycleData(cycleId) {
        const cycleRef = doc(db, 'payroll_cycles', cycleId);
        const cycleSnap = await getDoc(cycleRef);
        const cycleData = cycleSnap.data();

        const payslipsQ = query(collection(db, 'payslips'), where('cycleId', '==', cycleId));
        const payslipsSnap = await getDocs(payslipsQ);

        const issues = [];
        const expectedDays = this._getExpectedDays(cycleData.startDate, cycleData.endDate);

        payslipsSnap.forEach(payslipDoc => {
            const payslip = payslipDoc.data();
            const logs = payslip.logsSnapshot || [];

            // ตรวจสอบว่ามีข้อมูลทุกวันในช่วงเวลา
            const actualDays = logs.map(l => l.date);
            const missingDays = expectedDays.filter(day => !actualDays.includes(day));

            if (missingDays.length > 0) {
                issues.push({
                    employee: payslip.employeeSnapshot?.name,
                    employeeId: payslip.employeeId,
                    missingDays,
                    totalExpected: expectedDays.length,
                    totalActual: actualDays.length,
                    completionRate: ((actualDays.length / expectedDays.length) * 100).toFixed(1) + '%'
                });
            }
        });

        return {
            isValid: issues.length === 0,
            totalEmployees: payslipsSnap.size,
            issuesCount: issues.length,
            issues,
            summary: {
                totalExpectedDays: expectedDays.length,
                cycleInfo: {
                    id: cycleId,
                    startDate: cycleData.startDate,
                    endDate: cycleData.endDate,
                    status: cycleData.status
                }
            }
        };
    },

    /**
     * Helper: Get expected days in date range
     */
    _getExpectedDays(startDate, endDate) {
        const days = [];
        const start = dayjs(startDate);
        const end = dayjs(endDate);

        let current = start;
        while (current.isBefore(end) || current.isSame(end, 'day')) {
            days.push(current.format('YYYY-MM-DD'));
            current = current.add(1, 'day');
        }

        return days;
    },

    async getStaffCount(companyId) {
        const q = query(
            collection(db, 'users'),
            where('companyId', '==', companyId)
        );
        const snap = await getDocs(q);
        // Filter client-side to handle missing 'active' field
        return snap.docs.filter(d => {
            const data = d.data();
            return data.role !== 'admin' && data.active !== false && data.status !== 'resigned';
        }).length;
    }
};
