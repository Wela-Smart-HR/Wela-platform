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
                // stats.leaveCount++; // Moved to end to avoid double counting
            } else if (schedule && (schedule.type === 'off' || schedule.type === 'holiday')) {
                status = schedule.type;
            } else if (isWorkDay) {
                // 🟡 CASE: วันทำงานปกติ
                if (mainRecord) {
                    status = mainRecord.status || 'on-time'; // ยึด Status จาก Record
                    // Adjusted = Manual Fix = On Time (usually)
                    if (status === 'adjusted') status = 'on-time';
                }
                else if (dateKey < formatDateLocal(new Date())) status = 'absent';
                else if (dateKey === formatDateLocal(new Date())) status = 'today';
                else status = 'upcoming';
            } else {
                // 🔵 CASE: วันหยุด / OT
                if (mainRecord) status = 'ot';
            }

            // --- Logic คำนวณเงิน ---
            // Helper to format date for comparison
            function formatDateLocal(d) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }

            const isPastOrToday = dateObj <= today;
            const hasActivity = hasRecord || status === 'late' || status === 'absent' || status === 'adjusted' || status === 'on-time';

            // Calculate Wage
            let wage = config.dailyWage || (config.baseSalary ? Math.round(config.baseSalary / 30) : 0);

            if (status === 'leave') {
                // Leave Logic (Check if paid leave - assuming yes for now or based on type)
                // For simplified logic: Leave = Wage (if paid)
                // stats.leaveCount incremented below
                dailyIncome = wage;
            }
            else if (isWorkDay && (hasActivity || status === 'absent')) {
                if (isMonthly) {
                    dailyIncome = wage;
                    if (status === 'absent' && dateKey < formatDateLocal(today)) {
                        // Monthly employee: Absent = Deduct? Or just NO extra? 
                        // Typically Monthly gets full salary unless deducted.
                        // Let's assume No Deduction for Absent unless specified, 
                        // BUT for "Daily Calculation" visualization, we might show 0 if Absent?
                        // Let's keep distinct: Monthly = Fixed Wage per day accumulated.
                        // If user wants strict "No Work No Pay" for Monthly, logic needs config.
                        // For now: Late Deduction applies. Absent... let's say "No Pay" for that day in breakdown?
                        // Actually, commonly: Monthly = Full Pay. Absent = Deduct.
                        // deduction += wage; // If we want to deduct.
                    }
                } else {
                    // Daily: No work = No pay
                    if (mainRecord || status === 'leave') dailyIncome = wage;
                }
            }

            // 2. Incentive & OT (Always add if schedule says so and worked)
            if (schedule && hasRecord) {
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

            // 3. 🚨 คำนวณหักมาสาย (Only if NOT adjusted)
            if (clockInRecord && isWorkDay && schedule && schedule.startTime && status !== 'adjusted' && status !== 'on-time') {
                // ... existing late logic ...
                // If status was already 'adjusted' or 'on-time' from Repo, skip recalc
                // But if status is 'late' from Repo or we want to calc:
                const actualTime = clockInRecord.createdAt.toDate();
                // สร้างเวลาเข้างานมาตรฐานจาก Schedule
                const [schedH, schedM] = schedule.startTime.split(':').map(Number);
                const standardTime = new Date(actualTime);
                standardTime.setHours(schedH, schedM, 0, 0);

                // หาผลต่าง (ms)
                const diffMs = actualTime - standardTime;

                if (diffMs > 0) {
                    const diffMins = Math.floor(diffMs / 60000);
                    if (diffMins > (config.gracePeriod || 0)) {
                        // It is LATE
                        lateMinutes = diffMins;
                        status = 'late';

                        let calcDeduction = (lateMinutes - (config.gracePeriod || 0)) * (config.deductionPerMinute || 0);
                        if (config.maxDeduction > 0 && calcDeduction > config.maxDeduction) calcDeduction = config.maxDeduction;

                        deduction = Math.round(calcDeduction);
                        dailyIncome -= deduction;

                        stats.totalLateMinutes += lateMinutes;
                        stats.totalDeduction += deduction;
                    }
                }
            }

            // Final Stats Aggregation
            if (status === 'leave') stats.leaveCount++;
            else if (status === 'late') stats.lateCount++;
            else if (status === 'absent' && dateKey < formatDateLocal(today)) stats.absentCount++;
            else if (status === 'on-time' || status === 'adjusted') stats.onTimeCount++;

            if (isWorkDay) stats.totalWorkDays++;
            if (hasRecord) stats.actualWorkDays++;

            if (dailyIncome < 0) dailyIncome = 0;
            currentAccumulatedIncome += dailyIncome;

            // ✅ เก็บข้อมูลลง Array
            dailyBreakdown.push({
                date: dateObj,
                status: status,
                deduction: deduction,
                hasRecord: hasRecord,
                clockIn: clockInRecord,
                clockOut: clockOutRecord,
                isWorkDay: isWorkDay,
                lateMinutes: lateMinutes,
                income: dailyIncome,
                // ✅ Add details for UI
                leaveType: schedule?.leaveType || null,
                note: schedule?.note || null
            });
        }

        stats.estimatedIncome = currentAccumulatedIncome;
        const totalActive = stats.totalWorkDays || 1;
        stats.attendanceRate = Math.round((stats.actualWorkDays / totalActive) * 100);

        return { stats, graphData, dailyBreakdown };

    }, [records, schedules, config, currentMonth, userType]);

    return result;
};