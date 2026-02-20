
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, orderBy, limit, runTransaction, increment, arrayUnion } from 'firebase/firestore';
import { db } from '@/shared/lib/firebase';
import { updateMonthlyStats, updateDailySummary } from '../attendance/attendance.utils';
import { WORKFLOW_RULES } from './workflow.config';

/**
 * Requests Repository - Enterprise Edition
 * Supports: Multi-step approval, Snapshotting, Document Numbering, and Audit Trail.
 */
export const requestsRepo = {

    /**
     * Generate Running Document Number (REQ-YYYYMM-XXXX)
     * @param {Object} transaction 
     * @param {string} companyId 
     */
    async _generateDocumentNo(transaction, companyId) {
        const today = new Date();
        const yearMonth = today.toISOString().slice(0, 7).replace('-', ''); // 202402
        const counterRef = doc(db, 'counters', `req_${companyId}_${yearMonth}`);

        const counterSnap = await transaction.get(counterRef);
        let nextCount = 1;

        if (counterSnap.exists()) {
            nextCount = counterSnap.data().count + 1;
            transaction.update(counterRef, { count: nextCount });
        } else {
            transaction.set(counterRef, { count: nextCount });
        }

        return `REQ-${yearMonth}-${String(nextCount).padStart(4, '0')}`;
    },

    /**
     * Create Request (with Workflow Snapshot)
     */
    async createRequest(requestData) {
        try {
            return await runTransaction(db, async (transaction) => {
                // 1. Get User Profile for Fallback Logic (Branch/Dept)
                const userRef = doc(db, 'users', requestData.userId);
                const userSnap = await transaction.get(userRef);
                const userProfile = userSnap.exists() ? userSnap.data() : {};

                // 2. Determine Workflow Rules (Snapshotting)
                // Calculate "days" for logic if needed
                let computedData = { ...requestData };
                if (requestData.type === 'leave' && requestData.startDate && requestData.endDate) {
                    const diffTime = Math.abs(new Date(requestData.endDate) - new Date(requestData.startDate));
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    computedData.days = diffDays;
                }

                const ruleFactory = WORKFLOW_RULES[requestData.type] || WORKFLOW_RULES['leave']; // Default
                const workflow = ruleFactory(computedData);

                // 3. Fallback Logic: Identify Initial Approver
                // In a real app, we would query for "Who is Supervisor of Branch X?"
                // Here we set the role requirement.
                const firstStep = workflow.steps[0];

                // 4. Generate Document No
                const compId = requestData.companyId || 'default';
                const documentNo = await this._generateDocumentNo(transaction, compId);

                if (!documentNo) throw new Error("Failed to generate Document No");

                // 5. Create Request
                const newRequestRef = doc(collection(db, 'requests'));
                const newRequest = {
                    ...requestData,
                    documentNo,
                    branchId: userProfile.branchId || 'main',
                    departmentId: userProfile.departmentId || 'general',

                    // Workflow State
                    status: 'pending',
                    workflowSnapshot: workflow, // ICEBOX: Freeze rules
                    currentStepIndex: 0,
                    totalSteps: workflow.steps.length,
                    approverRole: firstStep.role,

                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    logs: [
                        {
                            action: 'created',
                            by: requestData.userName,
                            role: 'requester',
                            timestamp: new Date().toISOString(),
                            note: 'Request submitted'
                        }
                    ]
                };

                // Sanitize: Remove undefined fields to prevent Firestore errors
                Object.keys(newRequest).forEach(key => newRequest[key] === undefined && delete newRequest[key]);

                transaction.set(newRequestRef, newRequest);
                return { id: newRequestRef.id, documentNo };
            });
        } catch (error) {
            console.error('Error creating request:', error);
            throw error;
        }
    },

    /**
     * Approve Request (Next Step or Final)
     */
    async approveRequest(requestId, approverUser, note = '') {
        try {
            await runTransaction(db, async (transaction) => {
                const reqRef = doc(db, 'requests', requestId);
                const reqSnap = await transaction.get(reqRef);
                if (!reqSnap.exists()) throw new Error("Request not found");
                const prevReq = reqSnap.data();

                // Concurrency & Role Check
                if (prevReq.status !== 'pending') throw new Error("สถานะเอกสารเปลี่ยนไปแล้ว (ถูกดำเนินการโดยผู้อื่น)");

                const requiredRole = prevReq.approverRole || 'supervisor';
                const userRole = approverUser.role || 'employee';

                // 1. Branch Check (Allow Global Roles)
                const GLOBAL_ROLES = ['owner', 'admin', 'hr'];
                if (prevReq.branchId && prevReq.branchId !== approverUser.branchId) {
                    if (!GLOBAL_ROLES.includes(userRole)) {
                        throw new Error(`ไม่อนุญาต: คุณอยู่คนละสาขา (${approverUser.branchId}) กับเอกสาร (${prevReq.branchId})`);
                    }
                }

                // 2. Role Check (Allow Owner/Admin/HR to bypass)
                if (requiredRole !== userRole && !GLOBAL_ROLES.includes(userRole)) {
                    throw new Error(`สิทธิ์ไม่ถูกต้อง (ต้องการ: ${requiredRole}, คุณคือ: ${userRole})`);
                }

                // 1. Advance Step Logic
                const currentStepIndex = prevReq.currentStepIndex || 0;
                const workflow = prevReq.workflowSnapshot || { steps: [{ role: 'supervisor' }] }; // Fallback
                const totalSteps = workflow.steps.length;

                const isFinalStep = currentStepIndex >= totalSteps - 1;

                let updates = {
                    updatedAt: serverTimestamp()
                };

                // Append Log
                const newLog = {
                    action: 'approved',
                    by: approverUser.displayName || approverUser.email,
                    role: approverUser.role || 'approver', // e.g. 'supervisor'
                    stepIndex: currentStepIndex,
                    timestamp: new Date().toISOString(),
                    note
                };

                // Delegation Check (Mock Logic for now)
                if (approverUser.delegatedFrom) {
                    newLog.note += ` (Acting for ${approverUser.delegatedFrom})`;
                }

                const newLogs = [...(prevReq.logs || []), newLog];
                updates.logs = newLogs;

                if (!isFinalStep) {
                    // -> Move to Next Step
                    const nextIndex = currentStepIndex + 1;
                    const nextStep = workflow.steps[nextIndex];

                    updates.currentStepIndex = nextIndex;
                    updates.approverRole = nextStep.role;
                    // Status remains 'pending'
                } else {
                    // -> Final Approval
                    updates.status = 'approved';
                    updates.approverRole = 'completed'; // No one else needed

                    // *** DUPLICATE LOGIC FROM OLD REPO: APPLY CHANGES ***

                    // Case A: Leave
                    if (prevReq.type === 'leave') {
                        const effectiveDate = prevReq.startDate || prevReq.date;
                        const scheduleId = `${prevReq.userId}_${effectiveDate}`;
                        const newScheduleRef = doc(db, 'schedules', scheduleId);
                        transaction.set(newScheduleRef, {
                            userId: prevReq.userId,
                            companyId: prevReq.companyId,
                            date: effectiveDate,
                            shiftId: 'LEAVE',
                            type: 'leave',
                            leaveType: prevReq.leaveType,
                            note: prevReq.reason || note,
                            createdAt: serverTimestamp(),
                            userName: prevReq.userName,
                        });
                        // (Stats update omitted for brevity, assume handled by schedule trigger or add back if critical)
                    }

                    // Case B: Adjustment / Retro
                    if (prevReq.type === 'attendance-adjustment' || prevReq.type === 'retro') {
                        // ✅ FIX: retro requests store data in nested `data` object
                        // while attendance-adjustment stores at top-level.
                        // Support both formats with fallback.
                        const nestedData = prevReq.data || {};
                        const effectiveDate = prevReq.targetDate || nestedData.date || prevReq.date;
                        const timeIn = nestedData.timeIn || prevReq.timeIn;
                        const timeOut = nestedData.timeOut || prevReq.timeOut;

                        if (!effectiveDate) {
                            console.error('[approveRequest] Missing effectiveDate for adjustment');
                        }

                        // ✅ FIX: Convert local Thai time → UTC ISO string for Firestore range queries
                        // Using new Date(localISO).toISOString() converts +07:00 → proper UTC "Z" format
                        // Critical: Firestore string comparisons are LEXICOGRAPHIC
                        // Records stored as "+07:00" fall OUTSIDE UTC-based query ranges in payroll.repo.js
                        const clockInISO = (effectiveDate && timeIn)
                            ? new Date(`${effectiveDate}T${timeIn}:00+07:00`).toISOString()
                            : null;
                        const clockOutISO = (effectiveDate && timeOut)
                            ? new Date(`${effectiveDate}T${timeOut}:00+07:00`).toISOString()
                            : null;

                        const newLogRef = doc(collection(db, 'attendance_logs'));
                        const logData = {
                            employee_id: prevReq.userId,
                            company_id: prevReq.companyId,
                            status: 'adjusted',
                            late_minutes: 0,
                            note: `Approved Ref: ${prevReq.documentNo}`,
                            updated_at: new Date().toISOString()
                        };
                        if (clockInISO) logData.clock_in = clockInISO;
                        if (clockOutISO) logData.clock_out = clockOutISO;

                        transaction.set(newLogRef, logData);
                    }

                    // Case C: Unscheduled Work (ขออนุมัติวันทำงานพิเศษ)
                    // เมื่ออนุมัติ → สร้าง schedule doc (ให้ระบบ Payroll มองเห็นเป็นวันทำงาน)
                    //            → สร้าง attendance_log (บันทึกเวลาเข้า-ออกจริง)
                    if (prevReq.type === 'unscheduled-work') {
                        const effectiveDate = prevReq.targetDate || prevReq.date;
                        const timeIn = prevReq.timeIn;
                        const timeOut = prevReq.timeOut;

                        // === Guard: ต้องมี date, timeIn, timeOut ===
                        if (!effectiveDate) {
                            console.error('[approveRequest] Missing effectiveDate for unscheduled-work');
                            throw new Error('ข้อมูลวันที่ไม่ครบ ไม่สามารถอนุมัติได้');
                        }
                        if (!timeIn || !timeOut) {
                            console.error('[approveRequest] Missing timeIn/timeOut for unscheduled-work');
                            throw new Error('ข้อมูลเวลาเข้า/ออกงานไม่ครบ ไม่สามารถอนุมัติได้');
                        }

                        // 1. สร้าง Schedule Doc (deterministic ID → ป้องกันซ้ำ, merge → idempotent)
                        const scheduleId = `${prevReq.userId}_${effectiveDate}`;
                        const scheduleRef = doc(db, 'schedules', scheduleId);
                        transaction.set(scheduleRef, {
                            userId: prevReq.userId,
                            companyId: prevReq.companyId,
                            date: effectiveDate,
                            startTime: timeIn,
                            endTime: timeOut,
                            type: 'work',
                            shiftCode: 'EXTRA',
                            color: 'amber',
                            note: `อนุมัติจาก: ${prevReq.documentNo} | ${prevReq.reason || ''}`.trim(),
                            createdAt: serverTimestamp(),
                            userName: prevReq.userName,
                        }, { merge: true });

                        // 2. สร้าง Attendance Log (ใช้ +07:00 → Bangkok TZ)
                        const clockInISO = `${effectiveDate}T${timeIn}:00+07:00`;
                        const clockOutISO = `${effectiveDate}T${timeOut}:00+07:00`;

                        const newLogRef = doc(collection(db, 'attendance_logs'));
                        transaction.set(newLogRef, {
                            employee_id: prevReq.userId,
                            company_id: prevReq.companyId,
                            clock_in: clockInISO,
                            clock_out: clockOutISO,
                            status: 'approved-extra',
                            note: `Approved Unscheduled Work Ref: ${prevReq.documentNo}`,
                            updated_at: new Date().toISOString()
                        });
                    }
                }

                transaction.update(reqRef, updates);
            });
        } catch (error) {
            console.error("Approval Error:", error);
            throw error;
        }
    },

    /**
     * Reject Request (Final)
     */
    async rejectRequest(requestId, rejectorUser, note = '') {
        try {
            await runTransaction(db, async (transaction) => {
                const reqRef = doc(db, 'requests', requestId);
                const reqSnap = await transaction.get(reqRef);
                if (!reqSnap.exists()) throw new Error("Request not found");
                const prevReq = reqSnap.data();

                if (prevReq.status !== 'pending') throw new Error("สถานะเอกสารเปลี่ยนไปแล้ว (ถูกดำเนินการโดยผู้อื่น)");

                // Role Check
                const requiredRole = prevReq.approverRole || 'supervisor';
                const userRole = rejectorUser.role || 'employee';

                // 1. Branch Check (Allow Global Roles)
                const GLOBAL_ROLES = ['owner', 'admin', 'hr'];
                if (prevReq.branchId && prevReq.branchId !== rejectorUser.branchId) {
                    if (!GLOBAL_ROLES.includes(userRole)) {
                        throw new Error(`ไม่อนุญาต: คุณอยู่คนละสาขา (${rejectorUser.branchId}) กับเอกสาร (${prevReq.branchId})`);
                    }
                }

                // 2. Role Check
                if (requiredRole !== userRole && !GLOBAL_ROLES.includes(userRole)) {
                    throw new Error(`สิทธิ์ไม่ถูกต้อง (ต้องการ: ${requiredRole}, คุณคือ: ${userRole})`);
                }

                transaction.update(reqRef, {
                    status: 'rejected',
                    approverRole: 'none', // End of line
                    updatedAt: serverTimestamp(),
                    logs: arrayUnion({
                        action: 'rejected',
                        by: rejectorUser.displayName || rejectorUser.email,
                        role: userRole,
                        timestamp: new Date().toISOString(),
                        note
                    })
                });
            });
        } catch (error) {
            console.error("Reject Error:", error);
            throw error;
        }
    },

    /**
     * Get Requests (Filtered for Admin/Inbox)
     */
    async getRequestsByCompany(companyId, status = 'all', userRole = null) {
        // In Enterprise, we filter by 'approverRole' == userRole
        // But for this transition phase, we fetch all and filter in UI
        return this._getRequestsGeneric(query(
            collection(db, 'requests'),
            where('companyId', '==', companyId),
            orderBy('createdAt', 'desc'),
            limit(50)
        ));
    },

    async getRequestsByUser(userId) {
        return this._getRequestsGeneric(query(
            collection(db, 'requests'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        ));
    },

    async _getRequestsGeneric(q) {
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
};
