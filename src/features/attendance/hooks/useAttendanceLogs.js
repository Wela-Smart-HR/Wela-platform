import { useState, useEffect } from 'react';
import { attendanceRepo } from '../../../di/attendanceDI';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

/**
 * 📊 useAttendanceLogs
 * จัดการเรื่องการดึงข้อมูล Real-time (Logs & Schedules)
 * 
 * @param {string} userId
 * @param {Date} currentMonth
 */
export function useAttendanceLogs(userId, currentMonth) {
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [todaySchedule, setTodaySchedule] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        setLoading(true);

        const year = currentMonth.getFullYear();
        const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(year, currentMonth.getMonth() + 1, 0).getDate();

        // Date strings for query
        const startOfMonthStr = `${year}-${month}-01`;
        const endOfMonthStr = `${year}-${month}-${lastDay}`; // Just date string check

        // Date objects for Repo (Exact Range)
        const startOfMonthDate = new Date(year, currentMonth.getMonth(), 1);
        const endOfMonthDate = new Date(year, currentMonth.getMonth() + 1, 0, 23, 59, 59);

        // 1. Subscribe to Attendance Logs (Repo handles merging)
        const unsubLogs = attendanceRepo.subscribeToLogs(
            userId,
            startOfMonthDate,
            endOfMonthDate,
            (logs) => {
                setAttendanceLogs(logs);
                setLoading(false);
            }
        );

        // 2. Subscribe to Schedules
        const qSch = query(
            collection(db, "schedules"),
            where("userId", "==", userId),
            where("date", ">=", startOfMonthStr),
            where("date", "<=", endOfMonthStr)
        );

        const unsubSch = onSnapshot(qSch, (snapshot) => {
            const schDocs = snapshot.docs.map(doc => doc.data());
            setSchedules(schDocs);

            // Calculate Today Schedule
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const todaySch = schDocs.find(s => s.date === todayStr);
            setTodaySchedule(todaySch);
        });

        return () => {
            unsubLogs();
            unsubSch();
        };

    }, [userId, currentMonth]);

    return {
        attendanceLogs,
        schedules,
        todaySchedule,
        loading
    };
}
