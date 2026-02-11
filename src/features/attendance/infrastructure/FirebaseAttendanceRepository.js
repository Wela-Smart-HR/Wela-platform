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

        const q = query(
            collection(db, this.collectionName),
            where("employee_id", "==", employeeId),
            where("clock_in", ">=", startOfDay.toISOString()),
            where("clock_in", "<", endOfDay.toISOString()),
            orderBy("clock_in", "desc"),
            limit(1)
        );

        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return null;

        const docSnap = querySnapshot.docs[0];
        return this.toDomain(docSnap.id, docSnap.data());
    }

    /**
     * ดึงประวัติการลงเวลา
     */
    async getRecordsByUser(userId, startDate, endDate) {
        try {
            const q = query(
                collection(db, this.collectionName),
                where("employee_id", "==", userId),
                where("clock_in", ">=", startDate.toISOString()),
                where("clock_in", "<=", endDate.toISOString()),
                orderBy("clock_in", "desc")
            );

            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    clock_in: data.clock_in ? new Date(data.clock_in) : null,
                    clock_out: data.clock_out ? new Date(data.clock_out) : null
                };
            });
        } catch (error) {
            console.error("Repo Error:", error);
            throw error;
        }
    }
}