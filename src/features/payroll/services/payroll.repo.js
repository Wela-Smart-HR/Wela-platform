import { db } from '../../../shared/lib/firebase'; // Adjust path as needed
import {
    collection, doc, getDoc, getDocs, setDoc, updateDoc,
    query, where, orderBy, runTransaction, serverTimestamp, writeBatch
} from 'firebase/firestore';
import { PayrollCalculator } from './payroll.calculator';

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
                where('company_id', '==', companyId),
                where('clock_in', '>=', startDay + 'T00:00:00.000Z'), // Approx ISO check
                where('clock_in', '<=', endDay + 'T23:59:59.999Z')
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
        const newLogs = newLogsSnap.docs.map(d => d.data());

        console.log("Debug CreateCycle:", {
            empCount: employees.length,
            legacyCount: legacyLogs.length,
            newCount: newLogs.length
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

                // clock_in is ISO string (e.g. 2026-02-06T08:31:00.000Z)
                const d = new Date(log.clock_in);
                // Convert to Local Date String YYYY-MM-DD (matches legacy key format)
                // Use DateUtils logic? Or simple split if we assume UTC+7 consistency.
                // Legacy key relies on 'date' field which is usually YYYY-MM-DD.
                // To match, we should use local date.
                // Hack: offset timezone?
                // Simple: d.toLocaleDateString('en-CA') uses local timezone usually if environment is set?
                // No, safely format it manually to avoid timezone issues:
                // Assume logic runs in client timezone (Browser).

                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const dateKey = `${year}-${month}-${day}`;

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

                // Extract HH:mm
                const hh = String(d.getHours()).padStart(2, '0');
                const mm = String(d.getMinutes()).padStart(2, '0');
                entry.checkIn = `${hh}:${mm}`;

                if (log.clock_out) {
                    const outD = new Date(log.clock_out);
                    const oh = String(outD.getHours()).padStart(2, '0');
                    const om = String(outD.getMinutes()).padStart(2, '0');
                    entry.checkOut = `${oh}:${om}`;
                }

                // Map Fields (New -> Legacy Internal)
                entry.lateMinutes += Number(log.late_minutes || 0);

                // TODO: OT Hours if available in future
                // entry.otHours = Number(log.ot_hours || 0);
            });

            const empLogs = Object.values(dayMap); // 1 row per day merged

            // STEP 2: Calculate totals & enrich each day
            let workDays = 0;
            let totalOtHours = 0;
            let totalLateMinutes = 0;

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

            // Deduction Calculation (Total Level - respects Max Cap)
            let deductionAmount = 0;
            if (cycleData.syncDeduct && totalLateMinutes > 0) {
                deductionAmount = PayrollCalculator.calculateLateDeduction(totalLateMinutes, deductionConfig);
            }

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
