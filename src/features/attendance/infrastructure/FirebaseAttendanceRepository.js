import { AttendanceRepository } from '../application/repositories/AttendanceRepository.js';
import { AttendanceLog } from '../domain/AttendanceLog.js';
import { DateUtils } from '../../../shared/kernel/DateUtils.js';

// Import db จากไฟล์ config เดิมของคุณ
// Import db จากไฟล์ config
import { db } from '../../../shared/lib/firebase.js';
import { doc, setDoc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

/**
 * Firebase Implementation
 * ตัวเชื่อมต่อ Firestore ของจริง
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
            employee_id: data.employee_id,
            clock_in: data.clock_in ? data.clock_in.toISOString() : null, // แปลง Date เป็น String สำหรับ Firestore
            clock_out: data.clock_out ? data.clock_out.toISOString() : null,
            location: data.location || null,
            clock_out_location: data.clock_out_location || null,
            status: data.status,
            late_minutes: data.late_minutes,
            updated_at: new Date().toISOString()
        };
    }

    /**
     * แปลงจาก Firestore Data -> Domain Entity
     */
    toDomain(docId, data) {
        if (!data) return null;

        // สร้าง Domain Object ผ่าน Factory Method เพื่อ Validate ข้อมูล
        const logOrError = AttendanceLog.create({
            id: docId,
            employeeId: data.employee_id,
            clockIn: data.clock_in ? new Date(data.clock_in) : null,
            clockOut: data.clock_out ? new Date(data.clock_out) : null,
            location: data.location || null,
            clockOutLocation: data.clock_out_location || null,
            status: data.status,
            lateMinutes: data.late_minutes
        });

        if (logOrError.isFailure) {
            console.error(`[Data Corruption] Log ID ${docId} is invalid:`, logOrError.error);
            return null; // หรือ throw error ตามนโยบาย
        }

        return logOrError.getValue();
    }

    // --- Implementation ---

    async save(attendanceLog) {
        const data = this.toPersistence(attendanceLog);
        // ใช้ setDoc เพื่อระบุ ID เอง (UUID ที่เราสร้าง) หรือทับข้อมูลเดิม
        await setDoc(doc(db, this.collectionName, attendanceLog.id), data);
    }

    async findById(id) {
        const docRef = doc(db, this.collectionName, id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) return null;
        return this.toDomain(docSnap.id, docSnap.data());
    }

    async findLatestByEmployee(employeeId, date) {
        // หาใบลงเวลาของ "Business Date" นั้นๆ
        // หมายเหตุ: Query นี้อาจต้องทำ Composite Index ใน Firebase (employee_id + clock_in)

        // เพื่อความง่ายและแม่นยำในกะข้ามคืน เราจะดึงช่วงเวลามาเช็ค
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

            // แปลงข้อมูลกลับเป็น Domain Primitives เพื่อส่งให้ UI
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // แปลง timestamp string กลับเป็น Date object ถ้าจำเป็น
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