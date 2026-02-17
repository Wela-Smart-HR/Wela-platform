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
        // ID Format: company_month_period (e.g. comp123_2026-02_full)
        const cycleId = `${companyId}_${cycleData.month}_${cycleData.period}`;
        const cycleRef = doc(db, 'payroll_cycles', cycleId);

        await setDoc(cycleRef, {
            ...cycleData,
            id: cycleId,
            companyId,
            status: 'draft',
            summary: { totalNet: 0, totalPaid: 0, count: 0 },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        return cycleId;
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
    }
};
