import { useState, useEffect } from 'react';
import { db } from '../shared/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { useTodayCheckIn } from '../features/attendance/hooks/useTodayCheckIn';
import { attendanceService } from '../di/attendanceDI';

export function useDashboard(currentUser) {
  // --- STATE ข้อมูล Dashboard ---
  const [absentAlert, setAbsentAlert] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // --- 1. NEW Centralized Logic ---
  const {
    todayRecord: hookRecord,
    isCheckedIn,
    isStuck,
    staleCheckIn,
    loading: attLoading
  } = useTodayCheckIn(currentUser?.uid);

  // Map to Legacy Format for UI Compatibility
  const todayRecord = {
    in: hookRecord?.clockIn || null,
    out: hookRecord?.clockOut || null
  };

  const missingPunch = isStuck && staleCheckIn ? {
    date: staleCheckIn.clockIn,
    id: staleCheckIn.id
  } : null;

  // --- 2. Absent Alert Logic ---
  useEffect(() => {
    if (!currentUser || attLoading || isCheckedIn) {
      setAbsentAlert(null);
      return;
    }

    const checkAbsent = async () => {
      const todayDate = new Date();
      const year = todayDate.getFullYear();
      const month = String(todayDate.getMonth() + 1).padStart(2, '0');
      const day = String(todayDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      const qSchedule = query(
        collection(db, "schedules"),
        where("userId", "==", currentUser.uid),
        where("date", "==", dateKey)
      );

      const scheduleSnap = await getDocs(qSchedule);

      if (!scheduleSnap.empty) {
        const schedule = scheduleSnap.docs[0].data();
        if (schedule.type === 'work' && schedule.startTime) {
          const [sh, sm] = schedule.startTime.split(':').map(Number);
          const scheduleTime = new Date();
          scheduleTime.setHours(sh, sm, 0, 0);

          // ถ้าเลยเวลาเข้างานแล้ว -> แจ้งเตือน!
          if (new Date() > scheduleTime) {
            setAbsentAlert(schedule);
          }
        }
      } else {
        setAbsentAlert(null);
      }
    };

    checkAbsent();
  }, [currentUser, isCheckedIn, attLoading]);

  // --- 2. LOGIC ดึงแจ้งเตือน (Bell) ---
  useEffect(() => {
    if (!currentUser) return;

    // ดึงเฉพาะคำขอที่ได้รับการอนุมัติหรือปฏิเสธแล้ว
    const q = query(
      collection(db, "requests"),
      where("userId", "==", currentUser.uid),
      where("status", "in", ["approved", "rejected"]),
      orderBy("updatedAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(docs);
      setUnreadCount(docs.length);
    }, (error) => console.log("Noti Error:", error));

    return () => unsubscribe();
  }, [currentUser]);

  // ส่งค่ากลับไปให้ UI
  return {
    todayRecord,
    missingPunch,
    absentAlert,
    loading: attLoading,
    notifications,
    unreadCount,
    isStuck,
    staleCheckIn,
    closeShift: (logId, time, reason) => attendanceService.closeStaleShift(currentUser?.uid, logId, time, reason)
  };
}