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

            // ✅ FIX: Logic ใหม่ รองรับทั้ง Session-Based (New) และ Event-Based (Legacy)
            // ค้นหา Record เดียวที่ตรงกับวันนี้ (เพราะ useMyAttendance รวมร่างมาให้แล้ว)
            const mainRecord = records.find(r => {
                // เช็คเวลาเข้างานเป็นหลัก
                const dateVal = r.clockIn || (r.createdAt?.toDate ? r.createdAt.toDate() : (r.createdAt instanceof Date ? r.createdAt : null));

                if (!dateVal) return false;

                return dateVal.getDate() === day &&
                    dateVal.getMonth() === currentMonth.getMonth() &&
                    dateVal.getFullYear() === currentMonth.getFullYear();
            });

            // แยกส่วน Clock In / Clock Out จาก Main Record เดียวกัน
            const clockInRecord = mainRecord;
            const clockOutRecord = mainRecord;

            const schedule = schedules.find(s => s.date === dateKey);

            let status = 'off';
            let dailyIncome = 0;
            let deduction = 0;
            let lateMinutes = 0;
            let hasRecord = !!mainRecord; // แค่มี Main Record ก็ถือว่ามาทำงาน

            const dayOfWeek = dateObj.getDay();
            let isWorkDay = (schedule && schedule.type === 'work') ? true : (dayOfWeek !== 0 && dayOfWeek !== 6);
            if (schedule && (schedule.type === 'off' || schedule.type === 'holiday')) isWorkDay = false;

            // --- Logic กำหนด Status ---
            if (schedule && schedule.type === 'leave') {
                status = 'leave';
            } else if (schedule && (schedule.type === 'off' || schedule.type === 'holiday')) {
                status = schedule.type;
            } else if (isWorkDay) {
                if (mainRecord) {
                    // ✅ ใช้ Status จาก Record เป็นหลัก (ถ้ามี)
                    status = mainRecord.status || 'on-time';
                    if (status === 'adjusted') status = 'on-time';
                }
                else if (dateKey < formatDateLocal(new Date())) status = 'absent';
                else if (dateKey === formatDateLocal(new Date())) status = 'today';
                else status = 'upcoming';
            } else {
                if (mainRecord) status = 'ot';
            }

            // --- Logic คำนวณเงิน ---
            function formatDateLocal(d) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }

            const hasActivity = hasRecord || status === 'late' || status === 'absent' || status === 'adjusted' || status === 'on-time';

            // Calculate Wage
            let wage = config.dailyWage || (config.baseSalary ? Math.round(config.baseSalary / 30) : 0);

            if (status === 'leave') {
                dailyIncome = wage;
            }
            else if (isWorkDay && (hasActivity || status === 'absent')) {
                if (isMonthly) {
                    dailyIncome = wage;
                } else {
                    if (mainRecord || status === 'leave') dailyIncome = wage;
                }
            }

            // 2. Incentive & OT
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

            // 3. 🚨 คำนวณหักมาสาย
            if (clockInRecord && isWorkDay && schedule && schedule.startTime && status !== 'adjusted' && status !== 'on-time') {
                // ... Logic คำนวณสายคงเดิม ...
                const actualTime = clockInRecord.clockIn || (clockInRecord.createdAt?.toDate ? clockInRecord.createdAt.toDate() : clockInRecord.createdAt);

                const [schedH, schedM] = schedule.startTime.split(':').map(Number);
                const standardTime = new Date(actualTime);
                standardTime.setHours(schedH, schedM, 0, 0);

                const diffMs = actualTime - standardTime;

                if (diffMs > 0) {
                    const diffMins = Math.floor(diffMs / 60000);
                    if (diffMins > (config.gracePeriod || 0)) {
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

            dailyBreakdown.push({
                date: dateObj,
                status: status,
                deduction: deduction,
                hasRecord: hasRecord,
                // ✅ ส่งข้อมูลที่ถูกต้องกลับไปให้ UI
                clockIn: clockInRecord ? (clockInRecord.clockIn || clockInRecord.createdAt) : null,
                clockOut: clockOutRecord ? (clockOutRecord.clockOut) : null,
                clockInLocation: mainRecord?.clockInLocation || mainRecord?.location, // Map Location
                isWorkDay: isWorkDay,
                lateMinutes: lateMinutes,
                income: dailyIncome,
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