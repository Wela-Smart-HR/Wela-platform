import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalConfig } from '../../contexts/ConfigContext';
import { db } from '../../shared/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const COMPANY_TIMEZONE = 'Asia/Bangkok';

export function useDashboard() {
    const { currentUser } = useAuth();
    const { companyConfig } = useGlobalConfig();

    // --- STATE ---
    const [stats, setStats] = useState({
        totalEmployees: 0,
        activeNow: 0,
        lateToday: 0,
        payrollForecast: 0
    });
    const [loading, setLoading] = useState(true);

    const companyName = companyConfig?.name || "My Company";

    useEffect(() => {
        if (!currentUser?.companyId) return;

        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // 1. Total Employees
                const usersQ = query(
                    collection(db, 'users'),
                    where('companyId', '==', currentUser.companyId)
                );
                const usersSnap = await getDocs(usersQ);
                let totalEmployees = 0;
                usersSnap.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.role !== 'admin' && data.active !== false && data.status !== 'resigned') {
                        totalEmployees++;
                    }
                });

                // 2. Payroll Forecast (Latest Cycle)
                let payrollForecast = 0;
                const cyclesQ = query(
                    collection(db, 'payroll_cycles'),
                    where('companyId', '==', currentUser.companyId),
                    orderBy('month', 'desc'),
                    limit(1)
                );
                const cyclesSnap = await getDocs(cyclesQ);
                if (!cyclesSnap.empty) {
                    const latestCycle = cyclesSnap.docs[0].data();
                    payrollForecast = latestCycle.summary?.totalNet || 0;
                }

                // 3. Active Now & Late Today
                const todayStr = dayjs().tz(COMPANY_TIMEZONE).format('YYYY-MM-DD');
                const logsQ = query(
                    collection(db, 'attendance_logs'),
                    where('company_id', '==', currentUser.companyId),
                    where('shift_date', '==', todayStr)
                );
                const logsSnap = await getDocs(logsQ);

                const checkedInUsers = new Set();
                const lateUsers = new Set();

                logsSnap.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.clock_in != null) {
                        checkedInUsers.add(data.employee_id);
                        if (data.status === 'late') {
                            lateUsers.add(data.employee_id);
                        }
                    }
                });

                setStats({
                    totalEmployees,
                    payrollForecast,
                    activeNow: checkedInUsers.size,
                    lateToday: lateUsers.size
                });
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [currentUser?.companyId]);

    return {
        companyName,
        stats,
        loading
    };
}
