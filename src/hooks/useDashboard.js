import { useState, useEffect } from 'react';
import { db } from '../shared/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';

export function useDashboard(currentUser) {
  // --- STATE ข้อมูล Dashboard ---
  const [todayRecord, setTodayRecord] = useState({ in: null, out: null });
  const [missingPunch, setMissingPunch] = useState(null);
  const [absentAlert, setAbsentAlert] = useState(null); // Alert สาย/ขาดงาน
  const [loading, setLoading] = useState(true);

  // --- STATE แจ้งเตือน (Bell) ---
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // --- 1. LOGIC ดึงข้อมูล Dashboard & Alert ---
  useEffect(() => {
    if (!currentUser) return;

    const fetchData = async () => {
      try {
        const todayDate = new Date();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // 1.1 เช็คข้อมูลตอกบัตรวันนี้
        const qToday = query(
          collection(db, "attendance"),
          where("userId", "==", currentUser.uid),
          where("createdAt", ">=", todayStart),
          orderBy("createdAt", "asc")
        );

        const todaySnap = await getDocs(qToday);
        let inTime = null;
        let outTime = null;

        if (!todaySnap.empty) {
          const docs = todaySnap.docs.map(d => d.data());
          const firstIn = docs.find(d => d.type === 'clock-in' || d.type === 'normal' || d.type === 'extra-work');
          if (firstIn) inTime = firstIn.createdAt.toDate();

          const lastOut = docs.reverse().find(d => d.type === 'clock-out');
          if (lastOut) outTime = lastOut.createdAt.toDate();
        }
        setTodayRecord({ in: inTime, out: outTime });

        // ----------------------------------------------------
        // ✅ 1.2 เช็คว่า "มีตารางงาน" แต่ "ยังไม่ตอกบัตร" ไหม?
        // ----------------------------------------------------
        if (!inTime) {
          // แปลงวันที่วันนี้เป็น YYYY-MM-DD
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
          }
        } else {
          setAbsentAlert(null);
        }

        // 1.3 เช็ค "Missing Punch" (ลืมตอกออกเมื่อวาน)
        const qLastAction = query(
          collection(db, "attendance"),
          where("userId", "==", currentUser.uid),
          where("createdAt", "<", todayStart),
          orderBy("createdAt", "desc"),
          limit(1)
        );

        const lastSnap = await getDocs(qLastAction);
        if (!lastSnap.empty) {
          const lastDoc = lastSnap.docs[0].data();
          // ถ้า Action ล่าสุดคือเข้างาน (แล้วข้ามวันมาแล้ว) แปลว่าลืมออก
          if (lastDoc.actionType === 'clock-in' || lastDoc.type === 'normal' || lastDoc.type === 'extra-work') {
            setMissingPunch({
              date: lastDoc.createdAt.toDate(),
              id: lastSnap.docs[0].id
            });
          } else {
            setMissingPunch(null);
          }
        } else {
          setMissingPunch(null);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

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
    loading,
    notifications,
    unreadCount
  };
}