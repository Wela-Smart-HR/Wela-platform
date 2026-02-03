import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { useGPS } from './useGPS'; // ตรวจสอบ path ให้ตรงกับโฟลเดอร์ของคุณ

export function useMyAttendance(userId, companyId, currentMonth) {
    // --- State ---
    const [companyConfig, setCompanyConfig] = useState({
        location: null,
        radius: 350,
        greeting: { onTime: 'สวัสดีครับ', late: 'สายแล้วนะ' },
        deduction: { gracePeriod: 5, deductionPerMinute: 10, maxDeduction: 300, employmentType: 'daily' }
    });
    const [todayRecord, setTodayRecord] = useState(null);
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [todaySchedule, setTodaySchedule] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- 1. Setup GPS ---
    // ส่ง config เข้าไปเพื่อให้ useGPS รู้เป้าหมาย
    const {
        currentLocation,
        locationStatus,
        distance,
        gpsErrorMsg,
        startGPS,
        stopGPS
    } = useGPS({
        targetLocation: companyConfig.location,
        radius: companyConfig.radius
    });

    // --- 2. Fetch Company Config & Start GPS ---
    useEffect(() => {
        if (!companyId) return;

        const fetchConfig = async () => {
            try {
                // Fetch basic company info
                const companyDoc = await getDoc(doc(db, "companies", companyId));
                let config = {
                    location: { lat: 13.7563, lng: 100.5018 }, // Default fallback
                    radius: 350,
                    greeting: { onTime: 'บันทึกเวลาสำเร็จ!', late: 'มาสายนะเรา' },
                    deduction: { gracePeriod: 5, deductionPerMinute: 10, maxDeduction: 300, employmentType: 'daily' }
                };

                if (companyDoc.exists()) {
                    const data = companyDoc.data();
                    if (data.settings?.location) config.location = data.settings.location;
                    if (data.settings?.radius) config.radius = Number(data.settings.radius);
                }

                // Fetch Greeting Config
                const greetingDoc = await getDoc(doc(db, "companies", companyId, "settings", "greeting"));
                if (greetingDoc.exists()) {
                    const gData = greetingDoc.data();
                    config.greeting = {
                        onTime: gData.onTimeMessage || config.greeting.onTime,
                        late: gData.lateMessage || config.greeting.late
                    };
                }

                // Fetch Deduction Config
                const deductionDoc = await getDoc(doc(db, "companies", companyId, "settings", "deduction"));
                if (deductionDoc.exists()) {
                    config.deduction = deductionDoc.data();
                }

                setCompanyConfig(config);

                // ✅ เริ่มจับ GPS หลังจากได้ Config แล้วเท่านั้น
                startGPS(true);

            } catch (err) {
                console.error("Error fetching config:", err);
            }
        };

        fetchConfig();
        // Cleanup GPS handle โดย useGPS hook เอง
    }, [companyId]); // เอา startGPS ออกจาก deps เพื่อกัน Loop

    // --- 3. Real-time Subscription: Logs & Schedule ---
    useEffect(() => {
        if (!userId || !currentMonth) return;

        const year = currentMonth.getFullYear();
        const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(year, currentMonth.getMonth() + 1, 0).getDate();

        const startOfMonthDate = new Date(year, currentMonth.getMonth(), 1);
        const startOfMonthStr = `${year}-${month}-01`;
        const endOfMonthStr = `${year}-${month}-${lastDay}`;

        // 3.1 Attendance Logs
        const qAtt = query(
            collection(db, "attendance"),
            where("userId", "==", userId),
            where("createdAt", ">=", startOfMonthDate),
            orderBy("createdAt", "desc")
        );

        const unsubAtt = onSnapshot(qAtt,
            (snapshot) => {
                const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Client-side filter เพื่อความชัวร์เรื่อง Timezone
                const filtered = docs.filter(d => {
                    const date = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
                    return date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear();
                });
                setAttendanceLogs(filtered);
                setLoading(false);
            },
            (error) => {
                console.error("Firebase Error (Logs):", error);
                setLoading(false); // 🆘 สำคัญมาก: ถ้า Error ต้องปิด Loading ด้วย ไม่งั้นหน้าค้าง!
            }
        );

        // 3.2 Schedules
        const qSch = query(
            collection(db, "schedules"),
            where("userId", "==", userId),
            where("date", ">=", startOfMonthStr),
            where("date", "<=", endOfMonthStr)
        );

        const unsubSch = onSnapshot(qSch,
            (snapshot) => {
                const schDocs = snapshot.docs.map(doc => doc.data());
                setSchedules(schDocs);

                // Find today's schedule
                const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
                const todaySch = schDocs.find(s => s.date === todayStr);
                setTodaySchedule(todaySch);
            },
            (error) => {
                console.error("Firebase Error (Schedules):", error);
                // Note: We don't necessarily stop loading here if logs are still loading, but good to know
            }
        );

        // 3.3 Today's Record (for UI status)
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const qToday = query(
            collection(db, "attendance"),
            where("userId", "==", userId),
            where("createdAt", ">=", todayStart),
            orderBy("createdAt", "desc"),
            limit(1)
        );
        const unsubToday = onSnapshot(qToday,
            (snapshot) => {
                if (!snapshot.empty) {
                    setTodayRecord(snapshot.docs[0].data());
                } else {
                    setTodayRecord(null);
                }
            },
            (error) => {
                console.error("Firebase Error (Today Record):", error);
            }
        );

        return () => { unsubAtt(); unsubSch(); unsubToday(); };
    }, [userId, currentMonth]);

    // --- 4. Actions ---

    const retryGps = () => {
        startGPS(true);
    };

    const saveAttendance = async (data, type, isLate) => {
        if (!navigator.onLine) {
            // Offline Logic
            try {
                const offlineQueue = JSON.parse(localStorage.getItem('offlineAttendance')) || [];
                offlineQueue.push(data);
                localStorage.setItem('offlineAttendance', JSON.stringify(offlineQueue));
                return { success: true, offline: true, message: "บันทึกแบบ Offline แล้ว", isLate };
            } catch (err) {
                return { success: false, message: "Save Error: " + err.message };
            }
        }

        try {
            await addDoc(collection(db, "attendance"), data);
            const message = (type === 'clock-in')
                ? (isLate ? companyConfig.greeting.late : companyConfig.greeting.onTime)
                : 'เลิกงานแล้ว พักผ่อนเยอะๆ นะครับ';
            return { success: true, offline: false, message, isLate };
        } catch (err) {
            console.error(err);
            return { success: false, message: err.message };
        }
    };

    const clockIn = async ({ scheduleData } = {}) => {
        // ✅ SECURITY CHECK: ต้องมีพิกัด
        if (!currentLocation) return { success: false, message: "กำลังค้นหาพิกัด GPS..." };

        // ✅ SECURITY CHECK: ต้องอยู่ในระยะ (Double Lock)
        if (locationStatus === 'out-of-range') {
            return { success: false, message: `คุณอยู่นอกพื้นที่ (${Math.round(distance || 0)} ม.) ไม่สามารถตอกบัตรได้` };
        }

        const now = new Date();
        let isLate = false;

        // Late Check Logic
        if (scheduleData?.startTime) {
            const [sh, sm] = scheduleData.startTime.split(':').map(Number);
            const scheduleTime = new Date();
            // ใช้ Grace Period จาก Config
            scheduleTime.setHours(sh, sm + (companyConfig.deduction?.gracePeriod || 0), 0, 0);

            if (now > scheduleTime) isLate = true;
        }

        const data = {
            companyId,
            userId,
            type: 'normal',
            actionType: 'clock-in',
            status: isLate ? 'late' : 'on-time',
            location: { lat: currentLocation.lat, lng: currentLocation.lng, address: currentLocation.address },
            createdAt: serverTimestamp(),
            localTimestamp: now.toISOString()
        };

        return await saveAttendance(data, 'clock-in', isLate);
    };

    const clockOut = async () => {
        // ✅ SECURITY CHECK
        if (!currentLocation) return { success: false, message: "กำลังค้นหาพิกัด GPS..." };

        if (locationStatus === 'out-of-range') {
            return { success: false, message: `คุณอยู่นอกพื้นที่ (${Math.round(distance || 0)} ม.) ไม่สามารถตอกบัตรได้` };
        }

        const now = new Date();
        const data = {
            companyId,
            userId,
            type: 'normal',
            actionType: 'clock-out',
            status: 'completed',
            location: { lat: currentLocation.lat, lng: currentLocation.lng, address: currentLocation.address },
            createdAt: serverTimestamp(),
            localTimestamp: now.toISOString()
        };

        return await saveAttendance(data, 'clock-out', false);
    };

    const submitRetroRequest = async (form) => {
        try {
            await addDoc(collection(db, "requests"), {
                companyId,
                userId,
                userName: form.userName || 'Unknown',
                type: 'retro',
                status: 'pending',
                data: { ...form },
                reason: form.reason,
                createdAt: serverTimestamp()
            });
            return { success: true, message: "ส่งคำขอเรียบร้อยรออนุมัติ" };
        } catch (err) {
            return { success: false, message: err.message };
        }
    };

    // --- Return API ---
    return {
        // Data
        companyConfig,
        todayRecord,
        attendanceLogs,
        schedules,
        todaySchedule,
        loading,

        // GPS
        location: currentLocation,
        locationStatus,
        distance,
        gpsError: gpsErrorMsg,
        retryGps,

        // Actions
        clockIn,
        clockOut,
        submitRetroRequest
    };
}