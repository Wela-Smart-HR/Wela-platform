/**
 * ===================================================
 * ⏰ useMyAttendance - Hook หลักสำหรับลงเวลา (Employee)
 * ===================================================
 * 
 * 📋 สารบัญ (Table of Contents)
 * ===================================================
 * 
 * 📦 STATE (Lines ~40-70)
 * ├── todayRecord         - ข้อมูลลงเวลาวันนี้
 * ├── attendanceLogs      - ประวัติรายเดือน (real-time)
 * ├── schedules           - ตารางเวลารายเดือน (real-time)  
 * ├── todaySchedule       - ตารางเวลาวันนี้
 * ├── location            - ตำแหน่ง GPS { lat, lng }
 * ├── locationStatus      - สถานะ GPS: 'loading'|'ok'|'error'|'out-of-range'
 * ├── distance            - ระยะห่างจากบริษัท (เมตร)
 * ├── companyConfig       - ค่า config บริษัท
 * ├── loading/error       - สถานะโหลด
 * └── isOffline           - ออนไลน์/ออฟไลน์
 * 
 * 🚀 FUNCTIONS (ค้นหาได้จากชื่อ)
 * ├── initialize()            (Line ~84)  - เริ่มต้นระบบ (โหลด config, GPS)
 * ├── fetchLogsAndSchedules() (Line ~142) - ดึงประวัติ real-time
 * ├── startGpsTracking()      (Line ~207) - เริ่มติดตาม GPS
 * ├── retryGps()              (Line ~295) - ลอง GPS ใหม่
 * ├── loadTodayRecord()       (Line ~312) - โหลดข้อมูลวันนี้
 * ├── clockIn()               (Line ~326) - ✅ ลงเวลาเข้า
 * ├── clockOut()              (Line ~407) - ✅ ลงเวลาออก
 * ├── syncOfflineData()       (Line ~468) - ✅ Sync ข้อมูล offline
 * ├── getHistory()            (Line ~499) - ดึงประวัติช่วงเวลา
 * └── submitRetroRequest()    (Line ~520) - ✅ ส่งขอแก้เวลาย้อนหลัง
 * 
 * 💡 แก้แต่ละฟังก์ชันแยกกันได้ ไม่กระทบส่วนอื่น!
 * 
 * 📁 ใช้งานร่วมกับ:
 * ├── gps.service.js       → ติดตามตำแหน่ง
 * ├── offline.service.js   → จัดการข้อมูลเมื่อไม่มีเน็ต
 * ├── attendance.config.js → ดึง config บริษัท
 * └── attendance.repo.js   → บันทึกลง Firebase
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// === Services & Repo ===
import { gpsService } from './gps.service';
import { offlineService } from './offline.service';
import { attendanceConfigService } from './attendance.config';
import { attendanceRepo } from './attendance.repo';

// ============================
// 🎯 Main Hook
// ============================

/**
 * Hook สำหรับระบบลงเวลาพนักงาน
 * 
 * @param {string} userId - ID ผู้ใช้
 * @param {string} companyId - ID บริษัท
 * @returns {Object} state และ functions
 */
export function useMyAttendance(userId, companyId, currentMonth = new Date()) {
    // ============================
    // 📦 STATE ทั้งหมด
    // ============================

    // --- ข้อมูลวันนี้ ---
    const [todayRecord, setTodayRecord] = useState(null);

    // --- Attendance Logs & Schedules ---
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [todaySchedule, setTodaySchedule] = useState(null);

    // --- GPS ---
    const [location, setLocation] = useState(null);
    const [locationStatus, setLocationStatus] = useState('loading');
    const [distance, setDistance] = useState(null);
    const [gpsError, setGpsError] = useState('');

    // --- Config บริษัท ---
    const [companyConfig, setCompanyConfig] = useState(null);

    // --- สถานะทั่วไป ---
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    // --- Refs (เก็บค่าที่ไม่ต้อง re-render) ---
    const gpsRef = useRef(null);  // เก็บ GPS watcher

    // ============================
    // 🚀 INITIALIZATION
    // ============================

    /**
     * เรียกเมื่อ component mount
     * - โหลด config บริษัท
     * - เริ่มติดตาม GPS
     * - โหลดข้อมูลวันนี้
     * - ตั้ง listener สำหรับ online/offline
     */
    useEffect(() => {
        if (!userId || !companyId) return;

        let cleanupNetwork = null;

        const initialize = async () => {
            try {
                // 1. โหลด config บริษัท
                const config = await attendanceConfigService.getCompanyConfig(companyId);
                setCompanyConfig(config);

                // 2. เริ่มติดตาม GPS (ถ้าเปิดใช้)
                if (config.gpsEnabled !== false) {
                    startGpsTracking(config);
                }

                // 3. โหลดข้อมูลวันนี้
                await loadTodayRecord();

                // 4. Sync ข้อมูล offline (ถ้ามี)
                if (offlineService.isOnline() && offlineService.getPendingCount() > 0) {
                    await syncOfflineData();
                }

            } catch (err) {
                console.error('[useMyAttendance] Init error:', err);
                setError(err.message);
            }
        };

        initialize();

        // ===== ตั้ง Network Listener =====
        cleanupNetwork = offlineService.subscribeToNetworkStatus(
            // เมื่อออนไลน์
            () => {
                setIsOffline(false);
                syncOfflineData(); // sync ข้อมูลที่ค้างอยู่
            },
            // เมื่อออฟไลน์
            () => {
                setIsOffline(true);
            }
        );

        // ===== Cleanup เมื่อ unmount =====
        return () => {
            // หยุด GPS
            if (gpsRef.current) {
                gpsRef.current.stop();
                gpsRef.current = null;
            }
            // ยกเลิก network listener
            cleanupNetwork?.();
        };
    }, [userId, companyId]);

    // ============================
    // 📊 FETCH LOGS & SCHEDULES (Real-time)
    // ============================
    useEffect(() => {
        if (!userId) return;

        const fetchLogsAndSchedules = async () => {
            try {
                const { db } = await import('@/shared/lib/firebase');
                const { collection, query, where, orderBy, onSnapshot } = await import('firebase/firestore');

                const year = currentMonth.getFullYear();
                const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
                const lastDay = new Date(year, currentMonth.getMonth() + 1, 0).getDate();
                const startOfMonthDate = new Date(year, currentMonth.getMonth(), 1);
                const startOfMonthStr = `${year}-${month}-01`;
                const endOfMonthStr = `${year}-${month}-${lastDay}`;

                // === Attendance Logs (Real-time) ===
                const qAtt = query(
                    collection(db, "attendance"),
                    where("userId", "==", userId),
                    where("createdAt", ">=", startOfMonthDate),
                    orderBy("createdAt", "desc")
                );

                const unsubAtt = onSnapshot(qAtt, (snapshot) => {
                    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    const filtered = docs.filter(d => {
                        const date = d.createdAt.toDate();
                        return date.getMonth() === currentMonth.getMonth() &&
                            date.getFullYear() === currentMonth.getFullYear();
                    });
                    setAttendanceLogs(filtered);
                });

                // === Schedules (Real-time) ===
                const qSch = query(
                    collection(db, "schedules"),
                    where("userId", "==", userId),
                    where("date", ">=", startOfMonthStr),
                    where("date", "<=", endOfMonthStr)
                );

                const unsubSch = onSnapshot(qSch, (snapshot) => {
                    const schDocs = snapshot.docs.map(doc => doc.data());
                    setSchedules(schDocs);

                    // คำนวณ todaySchedule
                    const today = new Date();
                    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                    const todaySch = schDocs.find(s => s.date === todayStr);
                    setTodaySchedule(todaySch);
                });

                return () => {
                    unsubAtt();
                    unsubSch();
                };
            } catch (err) {
                console.error('[useMyAttendance] Fetch logs error:', err);
            }
        };

        const cleanup = fetchLogsAndSchedules();
        return () => cleanup?.then(fn => fn?.());
    }, [userId, currentMonth]);

    // ============================
    // 📍 GPS FUNCTIONS
    // ============================

    /**
     * เริ่มติดตาม GPS
     * @param {Object} config - config บริษัท
     */
    const startGpsTracking = useCallback((config) => {
        setLocationStatus('loading');
        setGpsError('');

        const { watchId, stop } = gpsService.startTracking({
            highAccuracy: true,

            // เมื่อได้ตำแหน่ง
            onSuccess: (pos) => {
                setLocation(pos);

                // คำนวณระยะห่างจากบริษัท
                if (config?.location) {
                    const dist = gpsService.calculateDistance(
                        pos.lat, pos.lng,
                        config.location.lat, config.location.lng
                    );
                    setDistance(Math.round(dist));

                    // เช็คว่าอยู่ในรัศมีไหม
                    if (dist <= (config.radius || 350)) {
                        setLocationStatus('ok');
                    } else {
                        setLocationStatus('out-of-range');
                    }
                } else {
                    setLocationStatus('ok');
                }
            },

            // เมื่อเกิด error
            onError: (errInfo) => {
                setLocationStatus('error');
                setGpsError(errInfo.message);

                // ลอง fallback เป็น low accuracy
                if (errInfo.shouldFallback) {
                    console.log('[GPS] ลอง low accuracy...');
                    startGpsTrackingLowAccuracy(config);
                }
            }
        });

        // เก็บ reference
        gpsRef.current = { watchId, stop };
    }, []);

    /**
     * ลอง GPS แบบ low accuracy (fallback)
     */
    const startGpsTrackingLowAccuracy = useCallback((config) => {
        const { watchId, stop } = gpsService.startTracking({
            highAccuracy: false,

            onSuccess: (pos) => {
                setLocation(pos);
                setLocationStatus('ok');

                if (config?.location) {
                    const dist = gpsService.calculateDistance(
                        pos.lat, pos.lng,
                        config.location.lat, config.location.lng
                    );
                    setDistance(Math.round(dist));

                    if (dist <= (config.radius || 350)) {
                        setLocationStatus('ok');
                    } else {
                        setLocationStatus('out-of-range');
                    }
                }
            },

            onError: (errInfo) => {
                setLocationStatus('error');
                setGpsError(errInfo.message);
            }
        });

        gpsRef.current = { watchId, stop };
    }, []);

    /**
     * ลอง GPS ใหม่ (เมื่อ user กดปุ่ม retry)
     */
    const retryGps = useCallback(() => {
        // หยุด watcher เก่า
        if (gpsRef.current) {
            gpsRef.current.stop();
        }
        // เริ่มใหม่
        if (companyConfig) {
            startGpsTracking(companyConfig);
        }
    }, [companyConfig, startGpsTracking]);

    // ============================
    // ⏰ CLOCK IN/OUT FUNCTIONS
    // ============================

    /**
     * โหลดข้อมูลลงเวลาวันนี้
     */
    const loadTodayRecord = async () => {
        if (!userId) return;

        try {
            const record = await attendanceRepo.getTodayRecord(userId);
            setTodayRecord(record);
        } catch (err) {
            console.error('[useMyAttendance] Load today error:', err);
        }
    };

    /**
     * ลงเวลาเข้า
     * 
     * @param {Object} options - ตัวเลือกเสริม
     * @param {Object} options.scheduleData - ข้อมูลกะ (สำหรับคำนวณสาย)
     * @returns {Promise<Object>} { success, isLate, message }
     */
    const clockIn = async (options = {}) => {
        setLoading(true);
        setError(null);

        try {
            // ตรวจสอบว่ามีตำแหน่งไหม
            if (!location) {
                throw new Error('ไม่สามารถระบุตำแหน่งได้ กรุณารอสักครู่');
            }

            // ตรวจสอบว่าอยู่ในรัศมีไหม
            if (locationStatus === 'out-of-range') {
                throw new Error(`คุณอยู่นอกรัศมีบริษัท (${distance} เมตร)`);
            }

            // คำนวณว่าสายหรือไม่
            let isLate = false;
            const now = new Date();

            if (options.scheduleData?.startTime) {
                const [sh, sm] = options.scheduleData.startTime.split(':').map(Number);
                const scheduleTime = new Date();
                scheduleTime.setHours(sh, sm + (companyConfig?.deduction?.gracePeriod || 0), 0, 0);

                if (now > scheduleTime) {
                    isLate = true;
                }
            }

            // เตรียมข้อมูล
            const attendanceData = {
                companyId,
                userId,
                actionType: 'clock-in',
                status: isLate ? 'late' : 'on-time',
                location: {
                    lat: location.lat,
                    lng: location.lng
                },
                localTimestamp: now.toISOString()
            };

            // ===== ถ้า Offline → เก็บไว้ใน Queue =====
            if (!offlineService.isOnline()) {
                offlineService.addToQueue(attendanceData);
                setTodayRecord({ ...attendanceData, _offline: true });
                return {
                    success: true,
                    isLate,
                    message: 'บันทึกไว้ในเครื่อง จะอัปโหลดเมื่อมีเน็ต',
                    offline: true
                };
            }

            // ===== Online → บันทึกเลย =====
            await attendanceRepo.clockIn(attendanceData);
            await loadTodayRecord();

            return {
                success: true,
                isLate,
                message: isLate
                    ? (companyConfig?.greeting?.late || 'มาสายนะ')
                    : (companyConfig?.greeting?.onTime || 'บันทึกสำเร็จ!')
            };

        } catch (err) {
            setError(err.message);
            return { success: false, message: err.message };
        } finally {
            setLoading(false);
        }
    };

    /**
     * ลงเวลาออก
     * 
     * @returns {Promise<Object>} { success, message }
     */
    const clockOut = async () => {
        setLoading(true);
        setError(null);

        try {
            // ตรวจสอบว่ามีตำแหน่งไหม
            if (!location) {
                throw new Error('ไม่สามารถระบุตำแหน่งได้ กรุณารอสักครู่');
            }

            const now = new Date();

            const attendanceData = {
                companyId,
                userId,
                actionType: 'clock-out',
                status: 'completed',
                location: {
                    lat: location.lat,
                    lng: location.lng
                },
                localTimestamp: now.toISOString()
            };

            // ===== ถ้า Offline =====
            if (!offlineService.isOnline()) {
                offlineService.addToQueue(attendanceData);
                setTodayRecord(prev => ({ ...prev, clockOut: now, _offline: true }));
                return {
                    success: true,
                    message: 'บันทึกไว้ในเครื่อง จะอัปโหลดเมื่อมีเน็ต',
                    offline: true
                };
            }

            // ===== Online =====
            await attendanceRepo.clockOut(attendanceData);
            await loadTodayRecord();

            return {
                success: true,
                message: 'เลิกงานแล้ว!'
            };

        } catch (err) {
            setError(err.message);
            return { success: false, message: err.message };
        } finally {
            setLoading(false);
        }
    };

    // ============================
    // 🔄 SYNC OFFLINE DATA
    // ============================

    /**
     * Sync ข้อมูลที่บันทึกไว้ขณะ offline
     */
    const syncOfflineData = async () => {
        const result = await offlineService.syncPendingData(
            // ฟังก์ชันอัปโหลดแต่ละ item
            async (item) => {
                if (item.actionType === 'clock-in') {
                    await attendanceRepo.clockIn(item);
                } else {
                    await attendanceRepo.clockOut(item);
                }
            },
            // callback ความคืบหน้า
            (progress) => {
                console.log(`[Sync] ${progress.current}/${progress.total}`);
            }
        );

        // โหลดข้อมูลใหม่หลัง sync
        if (result.success > 0) {
            await loadTodayRecord();
        }

        return result;
    };

    // ============================
    // 📋 HISTORY FUNCTIONS
    // ============================

    /**
     * ดึงประวัติการลงเวลา
     * 
     * @param {Date} startDate - วันเริ่มต้น
     * @param {Date} endDate - วันสิ้นสุด
     * @returns {Promise<Array>} รายการลงเวลา
     */
    const getHistory = async (startDate, endDate) => {
        try {
            setLoading(true);
            const records = await attendanceRepo.getRecordsByUser(userId, startDate, endDate);
            return records;
        } catch (err) {
            console.error('[useMyAttendance] Get history error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // ============================
    // 📦 RETURN
    // ============================

    // ===================================================
    // 📝 SUBMIT RETRO REQUEST (ขอแก้ไขย้อนหลัง)
    // ===================================================
    const submitRetroRequest = useCallback(async (data) => {
        if (!userId || !companyId) {
            return { success: false, message: 'ไม่พบ userId หรือ companyId' };
        }

        try {
            const { db } = await import('@/shared/lib/firebase');
            const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');

            await addDoc(collection(db, "requests"), {
                companyId,
                userId,
                userName: data.userName || '',
                type: 'retro',
                status: 'pending',
                data: {
                    date: data.date,
                    timeIn: data.timeIn,
                    timeOut: data.timeOut,
                    location: data.location || ''
                },
                reason: data.reason,
                createdAt: serverTimestamp()
            });

            return { success: true, message: 'ส่งคำขอแก้เวลาเรียบร้อยแล้ว' };
        } catch (err) {
            console.error('[submitRetroRequest] Error:', err);
            return { success: false, message: 'เกิดข้อผิดพลาด: ' + err.message };
        }
    }, [userId, companyId]);

    // ===================================================
    // 🎯 RETURN
    // ===================================================

    return {
        // === ข้อมูล ===
        todayRecord,
        attendanceLogs,   // ✅ ประวัติรายเดือน
        schedules,        // ✅ ตารางเวลารายเดือน
        todaySchedule,    // ✅ ตารางเวลาวันนี้

        // === GPS ===
        location,
        locationStatus,
        distance,
        gpsError,
        retryGps,

        // === Config ===
        companyConfig,

        // === สถานะ ===
        loading,
        error,
        isOffline,
        pendingOfflineCount: offlineService.getPendingCount(),

        // === Actions ===
        clockIn,
        clockOut,
        syncOfflineData,
        submitRetroRequest,  // ✅ ส่งขอแก้ไขย้อนหลัง
        getHistory,
        reload: loadTodayRecord
    };
}
