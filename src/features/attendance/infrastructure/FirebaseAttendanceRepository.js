import { AttendanceRepository } from '../application/repositories/AttendanceRepository.js';
import { AttendanceLog } from '../domain/AttendanceLog.js';
import { Location } from '../domain/value-objects/Location.js';
import { DateUtils } from '../../../shared/kernel/DateUtils.js';

import { db } from '../../../shared/lib/firebase.js';
import { doc, setDoc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

/**
 * Firebase Implementation
 * ตัวเชื่อมต่อ Firestore — แปลงระหว่าง Domain Entity ↔ Firestore Document
 */
export class FirebaseAttendanceRepository extends AttendanceRepository {

    constructor() {
        super();
        this.collectionName = 'attendance_logs';
    }

    /**
     * แปลงจาก Domain Entity -> Firestore Data
     */
    toPersistence(attendanceLog) {
        const data = attendanceLog.toPrimitives();
        return {
            company_id: data.company_id,
            employee_id: data.employee_id,
            clock_in: data.clock_in ? data.clock_in.toISOString() : null,
            clock_out: data.clock_out ? data.clock_out.toISOString() : null,
            clock_in_location: data.clock_in_location || null,  // ✅ New field name
            clock_out_location: data.clock_out_location || null,
            status: data.status,
            late_minutes: data.late_minutes,
            work_minutes: data.work_minutes || 0,               // ✅ New: persist calculated value
            updated_at: new Date().toISOString()
        };
    }

    /**
     * แปลงจาก Firestore Data -> Domain Entity
     * รองรับ Backward Compatibility:
     * - doc เก่าที่มี field "location" → map เป็น clockInLocation
     * - doc ใหม่ที่มี "clock_in_location" → ใช้ตรงๆ
     */
    toDomain(docId, data) {
        if (!data) return null;

        // ✅ Backward Compat: doc เก่าใช้ "location", doc ใหม่ใช้ "clock_in_location"
        const clockInLocRaw = data.clock_in_location || data.location || null;
        const clockOutLocRaw = data.clock_out_location || null;

        const logOrError = AttendanceLog.create({
            id: docId,
            companyId: data.company_id,
            employeeId: data.employee_id,
            clockIn: data.clock_in ? new Date(data.clock_in) : null,
            clockOut: data.clock_out ? new Date(data.clock_out) : null,
            clockInLocation: clockInLocRaw ? Location.fromPersistence(clockInLocRaw) : null,
            clockOutLocation: clockOutLocRaw ? Location.fromPersistence(clockOutLocRaw) : null,
            status: data.status,
            lateMinutes: data.late_minutes
        });

        if (logOrError.isFailure) {
            console.error(`[Data Corruption] Log ID ${docId} is invalid:`, logOrError.error);
            return null;
        }

        return logOrError.getValue();
    }

    // --- Implementation ---

    async save(attendanceLog) {
        const data = this.toPersistence(attendanceLog);
        await setDoc(doc(db, this.collectionName, attendanceLog.id), data);
    }

    async findById(id) {
        const docRef = doc(db, this.collectionName, id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) return null;
        return this.toDomain(docSnap.id, docSnap.data());
    }

    async findLatestByEmployee(employeeId, date) {
        const startOfDay = DateUtils.getBusinessDate(date);
        const endOfDay = new Date(startOfDay);
        endOfDay.setHours(startOfDay.getHours() + 24);

        // 1. Try finding in NEW collection
        const q = query(
            collection(db, this.collectionName),
            where("employee_id", "==", employeeId),
            where("clock_in", ">=", startOfDay.toISOString()),
            where("clock_in", "<", endOfDay.toISOString()),
            orderBy("clock_in", "desc"),
            limit(1)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            return this.toDomain(docSnap.id, docSnap.data());
        }

        // 2. FALLBACK: Try finding in LEGACY collection ('attendance')
        console.warn(`[Repo] New log not found for ${employeeId} on ${date.toDateString()}. Checking legacy 'attendance'...`);

        try {
            const legacyQ = query(
                collection(db, 'attendance'),
                where("userId", "==", employeeId),
                where("createdAt", ">=", startOfDay),
                where("createdAt", "<", endOfDay),
                orderBy("createdAt", "asc") // Sort ASC to pair In/Out correctly
            );

            const legacySnap = await getDocs(legacyQ);
            if (legacySnap.empty) return null;

            // Merge Legacy Docs (Separate In/Out) into One Domain Entity
            return this._mergeLegacyDocsToDomain(legacySnap.docs);

        } catch (err) {
            console.error("[Repo] Legacy Fallback Error:", err);
            return null;
        }
    }

    /**
     * ดึงประวัติการลงเวลา (Merge New + Legacy)
     */
    async getRecordsByUser(userId, startDate, endDate) {
        try {
            // 1. Fetch NEW Logs
            const q = query(
                collection(db, this.collectionName),
                where("employee_id", "==", userId),
                where("clock_in", ">=", startDate.toISOString()),
                where("clock_in", "<=", endDate.toISOString()),
                orderBy("clock_in", "desc")
            );
            const newSnap = await getDocs(q);
            const newLogs = newSnap.docs.map(d => this.toDomain(d.id, d.data())).filter(Boolean);

            // 2. Fetch LEGACY Logs
            // Note: We fetch a bit wider range or exact range. Firestore standard query.
            const legacyQ = query(
                collection(db, 'attendance'),
                where("userId", "==", userId),
                where("createdAt", ">=", startDate),
                where("createdAt", "<=", endDate),
                orderBy("createdAt", "desc")
            );
            const legacySnap = await getDocs(legacyQ);

            // 3. Convert Legacy Docs -> Domain Entities
            // Legacy stores atomic events (Clock In doc, Clock Out doc). 
            // We need to group them by "Day" or "Session" to match Domain Entity.
            const legacyLogs = this._processLegacySnapshots(legacySnap.docs);

            // 4. Merge & Deduplicate
            // Strategy: Verify if 'date' already exists in newLogs. If so, use newLogs.
            // (Assuming new system migration writes back to new collection)
            const methods = {};

            // Add New Logs first (Priority)
            newLogs.forEach(log => {
                const key = log.clockIn.toDateString();
                methods[key] = log;
            });

            // Add Legacy Logs if not exists
            legacyLogs.forEach(log => {
                const key = log.clockIn.toDateString();
                if (!methods[key]) {
                    methods[key] = log;
                }
            });

            // Convert back to array & Sort
            return Object.values(methods).sort((a, b) => b.clockIn - a.clockIn);

        } catch (error) {
            console.error("Repo Error:", error);
            throw error;
        }
    }

    // ==========================================
    // 🛠️ LEGACY HELPERS
    // ==========================================

    /**
     * Convert list of legacy docs (In/Out mixed) into Domain Entities
     */
    _processLegacySnapshots(docs) {
        const groups = {}; // Key: YYYY-MM-DD

        docs.forEach(doc => {
            const data = doc.data();
            // Use 'date' field if avail (added recently in legacy repo), else derive from createdAt
            let dateKey = data.date;
            if (!dateKey && data.createdAt) {
                dateKey = data.createdAt.toDate().toISOString().split('T')[0];
            }

            if (!dateKey) return;

            if (!groups[dateKey]) groups[dateKey] = { in: null, out: null, companyId: data.companyId, userId: data.userId };

            if (data.type === 'clock-in' || data.actionType === 'clock-in') {
                groups[dateKey].in = data;
                groups[dateKey].inId = doc.id;
            } else if (data.type === 'clock-out' || data.actionType === 'clock-out') {
                groups[dateKey].out = data;
            }
        });

        // Convert Groups to Domain objects
        return Object.values(groups).map(g => {
            if (!g.in) return null; // Must have at least Clock In

            const clockInTime = g.in.createdAt ? g.in.createdAt.toDate() : new Date(g.in.localTimestamp);
            const clockOutTime = g.out ? (g.out.createdAt ? g.out.createdAt.toDate() : new Date(g.out.localTimestamp)) : null;

            return AttendanceLog.create({
                id: g.inId, // Use ClockIn Doc ID as Identity
                companyId: g.companyId,
                employeeId: g.userId,
                clockIn: clockInTime,
                clockOut: clockOutTime,
                clockInLocation: g.in.location ? Location.fromPersistence(g.in.location) : null,
                clockOutLocation: g.out?.location ? Location.fromPersistence(g.out.location) : null,
                status: g.in.status || 'on-time', // Legacy might not have status, default
                lateMinutes: 0 // Legacy calculation complicated, default 0
            }).getValue();
        }).filter(Boolean);
    }

    /**
     * Merge specific legacy docs (e.g. for findLatest) into one Domain Entity
     */
    _mergeLegacyDocsToDomain(docs) {
        // Assume docs are from SAME Day, sorted ASC
        const inDoc = docs.find(d => {
            const data = d.data();
            return data.type === 'clock-in' || data.actionType === 'clock-in';
        });

        if (!inDoc) return null; // No Clock In found

        const outDoc = docs.find(d => {
            const data = d.data();
            return data.type === 'clock-out' || data.actionType === 'clock-out';
        });

        const inData = inDoc.data();
        const outData = outDoc ? outDoc.data() : null;

        const clockInTime = inData.createdAt ? inData.createdAt.toDate() : new Date(inData.localTimestamp);
        const clockOutTime = outData ? (outData.createdAt ? outData.createdAt.toDate() : new Date(outData.localTimestamp)) : null;

        return AttendanceLog.create({
            id: inDoc.id,
            companyId: inData.companyId,
            employeeId: inData.userId,
            clockIn: clockInTime,
            clockOut: clockOutTime,
            clockInLocation: inData.location ? Location.fromPersistence(inData.location) : null,
            clockOutLocation: outData?.location ? Location.fromPersistence(outData.location) : null,
            status: inData.status || 'on-time',
            lateMinutes: 0
        }).getValue();
    }
}