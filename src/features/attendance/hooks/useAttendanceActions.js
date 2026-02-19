import { useState, useCallback } from 'react';
import { attendanceService, attendanceRepo } from '../../../di/attendanceDI';
import { offlineService } from '../offline.service';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

/**
 * ⚡ useAttendanceActions
 * จัดการ Action ทั้งหมด (Clock In/Out, Request)
 */
export function useAttendanceActions({
    userId,
    companyId,
    location,
    locationStatus,
    distance,
    isOffline,
    companyConfig,
    onSuccess // callback เช่น loadTodayRecord
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * ลงเวลาเข้า
     */
    const clockIn = useCallback(async (options = {}) => {
        setLoading(true);
        setError(null);

        try {
            // Validate Location
            if (!location) {
                throw new Error('ไม่สามารถระบุตำแหน่งได้ กรุณารอสักครู่');
            }
            if (locationStatus === 'out-of-range') {
                throw new Error(`คุณอยู่นอกรัศมีบริษัท (${distance} เมตร)`);
            }

            // คำนวณเวลาเข้างานตามกะ (Fixed Logic: No Grace Period added here)
            let scheduleTime = null;
            if (options.scheduleData?.startTime) {
                const [sh, sm] = options.scheduleData.startTime.split(':').map(Number);
                scheduleTime = new Date();
                scheduleTime.setHours(sh, sm, 0, 0);
            }

            const attendanceData = {
                companyId,
                userId,
                actionType: 'clock-in',
                location: {
                    lat: location.lat,
                    lng: location.lng,
                    address: location.address
                },
                localTimestamp: new Date().toISOString(),
                shiftStart: scheduleTime ? scheduleTime.toISOString() : null
            };

            // Offline Check
            if (isOffline) {
                await offlineService.addToQueue(attendanceData);
                if (onSuccess) onSuccess({ ...attendanceData, _offline: true });

                return {
                    success: true,
                    isLate: false,
                    message: 'บันทึกไว้ในเครื่อง จะอัปโหลดเมื่อมีเน็ต',
                    offline: true
                };
            }

            // Online Call
            const result = await attendanceService.clockIn(
                userId,
                companyId,
                attendanceData.location,
                new Date(attendanceData.localTimestamp),
                scheduleTime
            );

            if (result.isFailure) {
                throw new Error(result.error);
            }

            // Refresh Data
            if (onSuccess) await onSuccess();

            const newLog = result.getValue();
            const isLate = newLog.status === 'late';

            return {
                success: true,
                isLate: isLate,
                message: isLate
                    ? (companyConfig?.greeting?.late || 'มาสายนะ')
                    : (companyConfig?.greeting?.onTime || 'บันทึกสำเร็จ!')
            };

        } catch (err) {
            console.error('[Action] ClockIn Error:', err);
            setError(err.message);
            return { success: false, message: err.message };
        } finally {
            setLoading(false);
        }
    }, [userId, companyId, location, locationStatus, distance, isOffline, companyConfig, onSuccess]);

    /**
     * ลงเวลาออก
     */
    const clockOut = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            if (!location) {
                throw new Error('ไม่สามารถระบุตำแหน่งได้ กรุณารอสักครู่');
            }

            const now = new Date();
            const attendanceData = {
                companyId,
                userId,
                actionType: 'clock-out',
                location: {
                    lat: location.lat,
                    lng: location.lng,
                    address: location.address
                },
                localTimestamp: now.toISOString()
            };

            if (isOffline) {
                await offlineService.addToQueue(attendanceData);
                // Can't infer full log state easily offline, pass minimal update
                if (onSuccess) onSuccess({ clockOut: now, _offline: true });

                return {
                    success: true,
                    message: 'บันทึกไว้ในเครื่อง จะอัปโหลดเมื่อมีเน็ต',
                    offline: true
                };
            }

            const result = await attendanceService.clockOut(userId, attendanceData.location);

            if (result.isFailure) {
                throw new Error(result.error);
            }

            const finalLog = result.getValue();
            if (onSuccess) await onSuccess();

            return {
                success: true,
                message: `เลิกงานแล้ว! (ทำไป ${finalLog.workMinutes} นาที)`
            };

        } catch (err) {
            console.error('[Action] ClockOut Error:', err);
            setError(err.message);
            return { success: false, message: err.message };
        } finally {
            setLoading(false);
        }
    }, [userId, companyId, location, isOffline, onSuccess]);

    /**
     * ส่งคำขอแก้ไขย้อนหลัง
     */
    const submitRetroRequest = useCallback(async (data) => {
        if (!userId || !companyId) {
            return { success: false, message: 'ไม่พบ userId หรือ companyId' };
        }

        try {
            // Note: Keeping logic simple here, or move to Service/Repo if preferred.
            // But requests collection is simple.
            await addDoc(collection(db, "requests"), {
                companyId,
                userId,
                userName: data.userName || '',
                type: 'retro',
                status: 'pending',
                date: data.date,
                timeIn: data.timeIn,
                timeOut: data.timeOut,
                location: data.location || '',
                reason: data.reason,
                createdAt: serverTimestamp()
            });

            return { success: true, message: 'ส่งคำขอแก้เวลาเรียบร้อยแล้ว' };
        } catch (err) {
            console.error('[Action] Retro Request Error:', err);
            return { success: false, message: 'เกิดข้อผิดพลาด: ' + err.message };
        }
    }, [userId, companyId]);

    /**
     * Proxy to Repo for History
     */
    const getHistory = useCallback(async (startDate, endDate) => {
        return attendanceRepo.getRecordsByUser(userId, startDate, endDate);
    }, [userId]);

    /**
     * สั่งปิดกะแบบ Manual (สำหรับเคสลืมออกงาน)
     */
    const closeStaleShift = useCallback(async (logId, time, reason) => {
        setLoading(true);
        try {
            const result = await attendanceService.closeStaleShift(userId, logId, time, reason);
            if (result.isFailure) throw new Error(result.error);
            if (onSuccess) await onSuccess();
            return { success: true };
        } catch (err) {
            console.error('[Action] CloseStaleShift Error:', err);
            return { success: false, message: err.message };
        } finally {
            setLoading(false);
        }
    }, [userId, onSuccess]);

    return {
        loading,
        error,
        clockIn,
        clockOut,
        submitRetroRequest,
        getHistory,
        closeStaleShift
    };
}
