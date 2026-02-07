import { useMemo } from 'react';

export const useSalaryCalculator = (records, schedules, config, currentMonth, userType = 'daily') => {

    const result = useMemo(() => {
        let stats = {
            totalWorkDays: 0, actualWorkDays: 0,
            lateCount: 0, absentCount: 0, leaveCount: 0, onTimeCount: 0,
            totalLateMinutes: 0, totalDeduction: 0,
            estimatedIncome: 0, monthlyGoal: 0,
            incentive: 0, otPay: 0
        };

        let graphData = [];
        let dailyBreakdown = [];
        let currentAccumulatedIncome = 0;

        const isMonthly = ['monthly', 'รายเดือน', 'salary', 'fulltime'].includes(String(userType || '').toLowerCase());
        const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
        const today = new Date();

        // 1. คำนวณ Goal
        if (isMonthly) {
            stats.monthlyGoal = config.baseSalary || (config.dailyWage * 30);
        } else {
            stats.monthlyGoal = config.dailyWage * 26;
        }

        // 2. วนลูปรายวัน
        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            dateObj.setHours(0, 0, 0, 0);

            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getDate()).padStart(2, '0');
            const dateKey = `${year}-${month}-${d}`;

            // ✅ Fix: Explicitly find Clock In and Clock Out records
            const clockInRecord = records.find(r => {
                const rd = r.createdAt.toDate();
                return rd.getDate() === day && rd.getMonth() === currentMonth.getMonth() && r.type === 'clock-in';
            });

            const clockOutRecord = records.find(r => {
                const rd = r.createdAt.toDate();
                return rd.getDate() === day && rd.getMonth() === currentMonth.getMonth() && r.type === 'clock-out';
            });

            const schedule = schedules.find(s => s.date === dateKey);

            // Fallback for calculating status if only have one record or legacy data
            const anyRecord = clockInRecord || clockOutRecord || records.find(r => r.createdAt.toDate().getDate() === day && r.createdAt.toDate().getMonth() === currentMonth.getMonth());

            let status = 'off';
            let dailyIncome = 0;
            let deduction = 0;
            let lateMinutes = 0;
            let hasRecord = !!anyRecord;

            // Use clockInRecord for status determination if available, otherwise fallback
            const mainRecord = clockInRecord || anyRecord;

            const dayOfWeek = dateObj.getDay();
            let isWorkDay = (schedule && schedule.type === 'work') ? true : (dayOfWeek !== 0 && dayOfWeek !== 6);
            if (schedule && (schedule.type === 'off' || schedule.type === 'holiday')) isWorkDay = false;

            // --- Logic กำหนด Status ---
            if (schedule && schedule.type === 'leave') {
                // 🟢 CASE: วันลา (Leave)
                status = 'leave';
                stats.leaveCount++;
            } else if (isWorkDay) {
                // 🟡 CASE: วันทำงานปกติ
                if (mainRecord) {
                    status = mainRecord.status || 'on-time'; // ยึด Status จาก Record
                }
                else if (dateObj < new Date().setHours(0, 0, 0, 0)) status = 'absent';
                else if (dateObj.getTime() === new Date().setHours(0, 0, 0, 0)) status = 'today';
                else status = 'upcoming';
            } else {
                // 🔵 CASE: วันหยุด / OT
                if (mainRecord) status = 'ot';
            }

            // --- Logic คำนวณเงิน ---
            const isPastOrToday = dateObj <= today;
            const hasActivity = hasRecord || status === 'late' || status === 'absent';

            if ((isPastOrToday || hasActivity) && status !== 'upcoming') {

                // 1. ฐานเงินเดือน
                let wage = config.dailyWage || (config.baseSalary ? Math.round(config.baseSalary / 30) : 0);

                if (isMonthly) {
                    dailyIncome = wage;
                    if (status === 'absent') {
                        stats.absentCount++;
                    }
                } else {
                    if (mainRecord) dailyIncome = wage;
                    if (status === 'absent') stats.absentCount++;
                }

                // 2. Incentive & OT
                if (schedule) {
                    if (schedule.incentive) {
                        const inc = Number(schedule.incentive);
                        dailyIncome += inc;
                        stats.incentive += inc;
                    }
                    if (schedule.otHours > 0) {
                        const hourlyRate = wage / 8;
                        let multiplier = schedule.otType === 'ot_1_5' ? 1.5 : schedule.otType === 'ot_2_0' ? 2.0 : 3.0;
                        if (!schedule.otType) multiplier = 1.0;

                        const otAmt = Math.round(hourlyRate * schedule.otHours * multiplier);
                        dailyIncome += otAmt;
                        stats.otPay += otAmt;
                    }
                }

                // 3. 🚨 คำนวณหักมาสาย
                if (clockInRecord && isWorkDay && schedule && schedule.startTime) {
                    const actualTime = clockInRecord.createdAt.toDate();

                    // สร้างเวลาเข้างานมาตรฐานจาก Schedule
                    const [schedH, schedM] = schedule.startTime.split(':').map(Number);
                    const standardTime = new Date(actualTime);
                    standardTime.setHours(schedH, schedM, 0, 0);

                    // หาผลต่าง (ms)
                    const diffMs = actualTime - standardTime;

                    if (diffMs > 0) {
                        // แปลงเป็นนาที
                        const diffMins = Math.floor(diffMs / 60000);
                        lateMinutes = diffMins;

                        // ตรวจสอบเงื่อนไขการหักเงิน
                        if (lateMinutes > (config.gracePeriod || 0)) {
                            status = 'late';

                            let calcDeduction = (lateMinutes - (config.gracePeriod || 0)) * (config.deductionPerMinute || 0);

                            if (config.maxDeduction > 0 && calcDeduction > config.maxDeduction) {
                                calcDeduction = config.maxDeduction;
                            }

                            deduction = Math.round(calcDeduction);
                            dailyIncome -= deduction;

                            stats.totalLateMinutes += lateMinutes;
                            stats.totalDeduction += deduction;
                        }
                    }
                }

                if (status === 'late') stats.lateCount++;
                else if (status === 'on-time') stats.onTimeCount++;

                if (isWorkDay) stats.totalWorkDays++;
                if (hasRecord) stats.actualWorkDays++;

                if (dailyIncome < 0) dailyIncome = 0;
                currentAccumulatedIncome += dailyIncome;
            }

            if (schedule && schedule.type === 'leave') {
                stats.leaveCount++;
                status = 'leave';
            }

            // ✅ เก็บข้อมูลลง Array
            dailyBreakdown.push({
                date: dateObj,
                status: status,
                deduction: deduction,
                hasRecord: hasRecord,
                clockIn: clockInRecord,
                clockOut: clockOutRecord,
                isWorkDay: isWorkDay,
                lateMinutes: lateMinutes, // จำนวนนาทีที่สาย
                income: dailyIncome
            });
        }

        stats.estimatedIncome = currentAccumulatedIncome;
        const totalActive = stats.totalWorkDays || 1;
        stats.attendanceRate = Math.round((stats.actualWorkDays / totalActive) * 100);

        return { stats, graphData, dailyBreakdown };

    }, [records, schedules, config, currentMonth, userType]);

    return result;
};