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
        const [usersSnap, attendanceSnap] = await Promise.all([
            getDocs(query(collection(db, 'users'), where('companyId', '==', companyId))),
            getDocs(query(collection(db, 'attendance'),
                where('companyId', '==', companyId),
                where('date', '>=', startDay),
                where('date', '<=', endDay)
            ))
        ]);

        let employees = usersSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(u => u.role !== 'admin' && u.active !== false && u.status !== 'resigned');

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

        const attendanceLogs = attendanceSnap.docs.map(d => d.data());
        console.log("Debug CreateCycle:", { empCount: employees.length, logCount: attendanceLogs.length });

        // 3. Batch Creation
        const batch = writeBatch(db);
        const cycleId = `${companyId}_${cycleData.month}_${cycleData.period}`;
        const cycleRef = doc(db, 'payroll_cycles', cycleId);

        let totalNet = 0;
        let count = 0;

        employees.forEach(emp => {
            // -- Core Calculation Logic --
            const empLogs = attendanceLogs.filter(a => a.userId === emp.id);
            const baseSalary = Number(emp.salary) || 0;
            const salaryType = emp.salaryType || 'monthly';
            const dailyRate = salaryType === 'daily' ? baseSalary : (baseSalary / 30); // Approx

            // Calc Work Days / OT
            let workDays = 0;
            let otHours = 0;
            let lateMins = 0;
            let absentCount = 0;

            empLogs.forEach(log => {
                if (log.status === 'present') workDays++;
                if (log.status === 'late') lateMins += (log.lateMinutes || 0);
            });

            // Financials
            const salaryPay = salaryType === 'daily' ? (workDays * dailyRate) : baseSalary;
            const otPay = 0;
            const deductionAmount = 0;

            const sso = PayrollCalculator.calculateSSO(baseSalary);
            const tax = PayrollCalculator.calculateTax(salaryPay, 0.03); // Fixed 3% for now

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
                logsSnapshot: empLogs,
                updatedAt: serverTimestamp()
            });
        });

        // Save Cycle
        batch.set(cycleRef, {
            ...cycleData,
            id: cycleId,
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
            const netTotal = data.netTotal || 0;

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
            where('companyId', '==', companyId),
            where('active', '!=', false)
        );
        const snap = await getDocs(q);
        return snap.size;
    }
};
