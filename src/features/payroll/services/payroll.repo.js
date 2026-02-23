import { db } from '../../../shared/lib/firebase'; // Adjust path as needed
import {
    collection, doc, getDoc, getDocs, setDoc, updateDoc,
    query, where, orderBy, runTransaction, serverTimestamp, writeBatch
} from 'firebase/firestore';
import { PayrollCalculator } from './payroll.calculator';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

const COMPANY_TIMEZONE = 'Asia/Bangkok';

/**
 * Calculate late minutes with current grace period and shift-specific rules
 * @param {string} checkIn - Check-in time in HH:mm format
 * @param {string} scheduleStart - Schedule start time in HH:mm format
 * @param {number} gracePeriod - Grace period in minutes
 * @param {Object} shiftConfig - Shift-specific configuration (optional)
 * @returns {number} Late minutes after applying grace period
 */
function calculateLateMinutesWithGracePeriod(checkIn, scheduleStart, gracePeriod = 0, shiftConfig = null) {
    if (!checkIn) return 0;
    
    // Use shift-specific rules if available, otherwise use provided parameters
    const effectiveGracePeriod = shiftConfig?.gracePeriod ?? gracePeriod;
    const effectiveScheduleStart = shiftConfig?.startTime ?? scheduleStart;
    
    // Convert times to minutes since midnight
    const toMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };
    
    const checkInMinutes = toMinutes(checkIn);
    const scheduleMinutes = toMinutes(effectiveScheduleStart);
    
    // Calculate late minutes
    const lateMinutes = Math.max(0, checkInMinutes - scheduleMinutes);
    
    // Apply grace period
    return Math.max(0, lateMinutes - effectiveGracePeriod);
}

/**
 * Get shift configuration for a specific employee and date
 * @param {Object} shiftConfigs - All shift configurations from company
 * @param {Object} employee - Employee data
 * @param {Object} schedule - Schedule data for the specific date
 * @param {Object} defaultShift - Default shift configuration
 * @returns {Object} Shift configuration to use
 */
function getShiftConfig(shiftConfigs, employee, schedule, defaultShift) {
    // Priority: 1. Schedule-specific shift, 2. Employee default shift, 3. Company default shift
    if (schedule?.shiftType && shiftConfigs[schedule.shiftType]) {
        return { ...defaultShift, ...shiftConfigs[schedule.shiftType] };
    }
    
    if (employee?.defaultShift && shiftConfigs[employee.defaultShift]) {
        return { ...defaultShift, ...shiftConfigs[employee.defaultShift] };
    }
    
    return defaultShift;
}

/**
 * คำนวณเวลา OT จริงๆ โดยตรวจสอบเวลาออกงานจริง (รองรับกะข้ามคืน)
 * @param {string} checkIn - เวลาเข้างาน (HH:mm)
 * @param {string} checkOut - เวลาออกงาน (HH:mm) 
 * @param {string} shiftEnd - เวลาออกกะ (HH:mm)
 * @param {number} scheduledOTHours - ชั่วโมง OT ที่กำหนดใน schedule
 * @returns {number} ชั่วโมง OT ที่คำนวณได้จริง
 */
function calculateActualOTHours(checkIn, checkOut, shiftEnd, scheduledOTHours) {
    if (!checkIn || !checkOut || !shiftEnd || scheduledOTHours <= 0) {
        return 0;
    }

    // แปลงเวลาเป็นนาที
    const toMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const checkInMinutes = toMinutes(checkIn);
    let checkOutMinutes = toMinutes(checkOut);
    let shiftEndMinutes = toMinutes(shiftEnd);

    // 🚨 ARCHITECTURE FIX: จัดการเคสข้ามคืน (Cross-day Shift)
    // 1. ถ้าเวลาออกงานน้อยกว่าเวลาเข้างาน แปลว่าข้ามไปอีกวัน ให้บวก 24 ชม. (1440 นาที)
    if (checkOutMinutes < checkInMinutes) {
        checkOutMinutes += 1440;
    }
    
    // 2. ถ้าเวลาจบกะน้อยกว่าเวลาเข้างาน แปลว่ากะงานคร่อมวัน ให้บวก 24 ชม. (1440 นาที)
    if (shiftEndMinutes < checkInMinutes) {
        shiftEndMinutes += 1440;
    }

    // ตรวจสอบว่าออกงานเลยเวลาออกกะหรือไม่
    if (checkOutMinutes <= shiftEndMinutes) {
        return 0; // ออกก่อน หรือ ออกตรงเวลาพอดี ไม่มี OT
    }

    // คำนวณเวลา OT จริง (นาที)
    const actualOTMinutes = checkOutMinutes - shiftEndMinutes;
    const actualOTHours = actualOTMinutes / 60;

    // จำกัดไม่ให้เกินเวลา OT ที่ระบุมา (ป้องกันพนักงานนั่งแช่เอา OT)
    return Math.min(actualOTHours, scheduledOTHours);
}

export const PayrollRepo = {

    /**
     * Create a new Payroll Cycle
     * @param {string} companyId 
     * @param {Object} cycleData { month, period, target }
     */
    async createCycle(companyId, cycleData) {
        // 1. Setup Dates
        const [year, month] = cycleData.month.split('-').map(Number);
        let startDay, endDay;

        if (cycleData.period === 'first') {
            startDay = `${year}-${String(month).padStart(2, '0')}-01`;
            endDay = `${year}-${String(month).padStart(2, '0')}-15`;
        } else if (cycleData.period === 'second') {
            startDay = `${year}-${String(month).padStart(2, '0')}-16`;
            const lastDay = new Date(year, month, 0).getDate();
            endDay = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        } else {
            startDay = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            endDay = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        }

        // 2. Fetch Data (Parallel)
        console.log("Fetching data for cycle:", { companyId, startDay, endDay });

        const [usersSnap, legacySnap, newLogsSnap, schedulesSnap, companySnap] = await Promise.all([
            getDocs(query(collection(db, 'users'), where('companyId', '==', companyId))),
            getDocs(query(collection(db, 'attendance'),
                where('companyId', '==', companyId),
                where('date', '>=', startDay),
                where('date', '<=', endDay)
            )),
            getDocs(query(collection(db, 'attendance_logs'),
                where('company_id', '==', companyId)
            )),
            getDocs(query(collection(db, 'schedules'),
                where('companyId', '==', companyId),
                where('date', '>=', startDay),
                where('date', '<=', endDay)
            )),
            getDoc(doc(db, 'companies', companyId))
        ]);

        const companyConfig = companySnap.exists() ? companySnap.data() : {};

        const deductionConfig = {
            ...companyConfig.deduction,
            deductionPerMinute: companyConfig.payrollConfig?.deductionPerMinute ?? companyConfig.deduction?.deductionPerMinute,
            maxDeduction: companyConfig.payrollConfig?.maxDeduction ?? companyConfig.deduction?.maxDeduction,
            gracePeriod: companyConfig.deduction?.gracePeriod ?? companyConfig.attendanceConfig?.gracePeriod ?? 0
        };

        const shiftConfigs = companyConfig.shifts || {};
        const defaultShift = {
            startTime: '09:30',
            endTime: '18:00',
            gracePeriod: deductionConfig.gracePeriod,
            deductionPerMinute: deductionConfig.deductionPerMinute,
            maxDeduction: deductionConfig.maxDeduction
        };

        let employees = usersSnap.docs
            .map(d => {
                const data = d.data();
                let sType = data.salaryType || data.type || 'monthly';
                if (sType === 'รายวัน') sType = 'daily';
                else if (sType === 'รายเดือน') sType = 'monthly';

                return { id: d.id, ...data, salaryType: sType };
            })
            .filter(u => u.role !== 'admin' && u.active !== false && u.status !== 'resigned');

        if (cycleData.target && cycleData.target !== 'all') {
            employees = employees.filter(emp => emp.salaryType === cycleData.target);
        }

        const seenNames = new Set();
        employees = employees.filter(emp => {
            const normalizedName = emp.name?.trim();
            if (!normalizedName) return false;
            if (seenNames.has(normalizedName)) {
                return false;
            }
            seenNames.add(normalizedName);
            return true;
        });

        const legacyLogs = legacySnap.docs.map(d => d.data());
        const allNewLogs = newLogsSnap.docs.map(d => d.data());
        const schedulesData = schedulesSnap.docs.map(d => d.data());

        const rangeStart = dayjs.tz(startDay, COMPANY_TIMEZONE).startOf('day');
        const rangeEnd = dayjs.tz(endDay, COMPANY_TIMEZONE).endOf('day');

        const newLogs = allNewLogs.filter(log => {
            if (!log.clock_in) return false;
            let clockInDayjs;
            if (log.clock_in.toDate) {
                clockInDayjs = dayjs(log.clock_in.toDate());
            } else {
                clockInDayjs = dayjs(log.clock_in);
            }
            if (!clockInDayjs.isValid()) return false;
            return clockInDayjs.isBetween(rangeStart, rangeEnd, 'millisecond', '[]');
        });

        const batch = writeBatch(db);
        const cycleId = `${companyId}_${cycleData.month}_${cycleData.period}`;
        const cycleRef = doc(db, 'payroll_cycles', cycleId);

        let totalNet = 0;
        let count = 0;

        employees.forEach(emp => {
            const baseSalary = Number(emp.salary) || 0;
            const salaryType = emp.salaryType || 'monthly';
            const dailyRate = salaryType === 'daily' ? baseSalary : (baseSalary / 30);
            const hourlyRate = dailyRate / 8;

            const dayMap = {};

            const empLegacy = legacyLogs.filter(a => a.userId === emp.id);
            const empSchedules = schedulesData.filter(s => s.userId === emp.id);

            empLegacy.forEach(log => {
                const dateKey = log.date;
                if (!dateKey) return;

                if (!dayMap[dateKey]) {
                    dayMap[dateKey] = {
                        date: dateKey,
                        userId: emp.id,
                        checkIn: null,
                        checkOut: null,
                        status: 'present',
                        lateMinutes: 0,
                        otHours: 0
                    };
                }
                const entry = dayMap[dateKey];

                if (log.type === 'clock-in') {
                    entry.checkIn = log.localTimestamp?.split('T')[1]?.substring(0, 5) || null;
                    entry.status = log.status || entry.status;
                }
                if (log.type === 'clock-out') {
                    entry.checkOut = log.localTimestamp?.split('T')[1]?.substring(0, 5) || null;
                }

                if (log.type === 'retro-approved' || log.type === 'retro' || log.type === 'adjustment') {
                    const toTimeStr = (val) => {
                        if (!val) return null;
                        if (typeof val === 'string') return val.substring(0, 5);
                        const d = val.toDate ? val.toDate() : (val.seconds ? new Date(val.seconds * 1000) : null);
                        if (!d) return null;
                        return new Intl.DateTimeFormat('en-GB', {
                            timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false
                        }).format(d);
                    };
                    const rawIn = log.timeIn || log.clockIn || log.data?.timeIn || log.data?.clockIn;
                    const rawOut = log.timeOut || log.clockOut || log.data?.timeOut || log.data?.clockOut;
                    const t = toTimeStr(rawIn);
                    const o = toTimeStr(rawOut);
                    if (t) entry.checkIn = t;
                    if (o) entry.checkOut = o;
                    entry.status = log.status || 'present';
                }

                if (log.lateMinutes) entry.lateMinutes += Number(log.lateMinutes);
                if (log.otHours) entry.otHours += Number(log.otHours);
            });

            const empNew = newLogs.filter(a => a.employee_id === emp.id);
            empNew.forEach(log => {
                if (!log.clock_in) return;
                const d = log.clock_in.toDate ? log.clock_in.toDate() : new Date(log.clock_in);
                const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d);

                if (!dayMap[dateKey]) {
                    dayMap[dateKey] = {
                        date: dateKey,
                        userId: emp.id,
                        checkIn: null,
                        checkOut: null,
                        status: log.status || 'present',
                        lateMinutes: 0,
                        otHours: 0
                    };
                }
                const entry = dayMap[dateKey];

                const timeStr = new Intl.DateTimeFormat('en-GB', {
                    timeZone: 'Asia/Bangkok',
                    hour: '2-digit', minute: '2-digit', hour12: false
                }).format(d);
                entry.checkIn = timeStr;

                if (log.clock_out) {
                    const outD = log.clock_out.toDate ? log.clock_out.toDate() : new Date(log.clock_out);
                    const outStr = new Intl.DateTimeFormat('en-GB', {
                        timeZone: 'Asia/Bangkok',
                        hour: '2-digit', minute: '2-digit', hour12: false
                    }).format(outD);
                    entry.checkOut = outStr;
                }

                entry.lateMinutes += Number(log.late_minutes || 0);
            });

            empSchedules.forEach(schedule => {
                if (!schedule.date) return;
                const dateKey = schedule.date;

                if (!dayMap[dateKey]) {
                    dayMap[dateKey] = {
                        date: dateKey,
                        userId: emp.id,
                        checkIn: null,
                        checkOut: null,
                        status: schedule.type || 'present',
                        lateMinutes: 0,
                        otHours: 0
                    };
                }
                const entry = dayMap[dateKey];

                if (schedule.type === 'work') {
                    entry.scheduleStartTime = schedule.startTime || null;
                    entry.scheduleEndTime = schedule.endTime || null;
                } else if (schedule.type === 'leave') {
                    entry.status = 'leave';
                } else if (schedule.type === 'off') {
                    entry.status = 'off';
                }

                entry.scheduleOT = {
                    hasOT: schedule.otType ? true : false,
                    otType: schedule.otType || null,
                    otHours: Number(schedule.otHours) || 0
                };
                entry.scheduleIncentive = Number(schedule.incentive) || 0;
            });

            const empLogs = Object.values(dayMap);

            let workDays = 0;
            let totalOtHours = 0;
            let totalOtPay = 0;
            let totalIncentive = 0;
            let totalLateMinutes = 0;
            let totalDeductionAmount = 0;

            const enrichedLogs = empLogs.map(log => {
                let logIncome = 0;
                let logDeduction = 0;
                let logNotes = [];

                if (log.status !== 'absent' && log.checkIn) workDays++;
                if (log.lateMinutes > 0) totalLateMinutes += log.lateMinutes;
                if (log.otHours > 0) totalOtHours += log.otHours;

                if (salaryType === 'daily' && log.status !== 'absent' && log.checkIn) {
                    logIncome += dailyRate;
                }

                if (log.scheduleOT && log.scheduleOT.hasOT && log.scheduleOT.otHours > 0) {
                    const shiftEnd = log.scheduleEndTime || "18:00"; 
                    
                    const actualOTHours = calculateActualOTHours(
                        log.checkIn,
                        log.checkOut,
                        shiftEnd,
                        log.scheduleOT.otHours
                    );
                    
                    if (actualOTHours > 0) {
                        const otType = companyConfig.otTypes?.find(ot => ot.id === log.scheduleOT.otType);
                        const multiplier = otType?.rate || 1.5;
                        const otAmt = actualOTHours * hourlyRate * multiplier;
                        logIncome += otAmt;
                        logNotes.push(`OT ${actualOTHours.toFixed(1)}h (x${multiplier}, กำหนด ${log.scheduleOT.otHours}h)`);
                        
                        totalOtHours += actualOTHours;
                        totalOtPay += otAmt; 
                    } else {
                        logNotes.push(`OT 0h (ออกงานไม่เกินเวลา, กำหนด ${log.scheduleOT.otHours}h)`);
                    }
                }

                if (log.scheduleIncentive && log.scheduleIncentive > 0) {
                    logIncome += log.scheduleIncentive;
                    logNotes.push(`เบี้ยขยัน ${log.scheduleIncentive}`);
                    totalIncentive += log.scheduleIncentive;
                }

                // 
                let dailyDeductionMinutes = 0;
                let dailyDeductionAmount = 0;

                if (cycleData.syncDeduct && log.checkIn) {
                    console.log(' Deduction Debug - Employee:', emp.name, 'Date:', log.date);
                    console.log('  syncDeduct:', cycleData.syncDeduct);
                    console.log('  checkIn:', log.checkIn);
                    
                    const shiftConfig = getShiftConfig(shiftConfigs, emp, log, defaultShift);
                    console.log('  shiftConfig:', shiftConfig);
                    
                    // 
                    const effectiveStartTime = log.scheduleStartTime || shiftConfig.startTime || '09:30';
                    const effectiveGracePeriod = Number(shiftConfig.gracePeriod) || 0;
                    
                    console.log('  effectiveStartTime:', effectiveStartTime);
                    console.log('  effectiveGracePeriod:', effectiveGracePeriod);
                    
                    const actualLateMinutes = calculateLateMinutesWithGracePeriod(
                        log.checkIn, 
                        effectiveStartTime, 
                        effectiveGracePeriod,
                        shiftConfig
                    );
                    
                    console.log('  actualLateMinutes:', actualLateMinutes);
                    
                    if (actualLateMinutes > 0) {
                        const shiftDeductionConfig = {
                            gracePeriod: effectiveGracePeriod,
                            deductionPerMinute: Number(shiftConfig.deductionPerMinute) || 0,
                            maxDeduction: Number(shiftConfig.maxDeduction) || 0
                        };
                        
                        console.log('  shiftDeductionConfig:', shiftDeductionConfig);
                        
                        const fine = PayrollCalculator.calculateLateDeduction(actualLateMinutes, shiftDeductionConfig);
                        
                        console.log('  calculated fine:', fine);
                        
                        logDeduction += fine;
                        logNotes.push(` ${actualLateMinutes} (${effectiveStartTime}+${effectiveGracePeriod}m)`);
                        totalDeductionAmount += fine;

                        // 
                        dailyDeductionMinutes = actualLateMinutes;
                        dailyDeductionAmount = fine;
                        
                        console.log('  Deduction applied:', fine);
                    } else {
                        console.log('  No deduction - actualLateMinutes = 0');
                    }
                } else {
                    console.log(' Deduction Debug - Employee:', emp.name, 'Date:', log.date);
                    console.log('  syncDeduct:', cycleData.syncDeduct, 'checkIn:', log.checkIn);
                    console.log('  Deduction skipped - syncDeduct false or no checkIn');
                }

                return {
                    ...log,
                    income: logIncome > 0 ? logIncome : 0,
                    deduction: logDeduction > 0 ? logDeduction : 0,
                    note: logNotes.join(', '),
                    incomeBreakdown: {
                        dailyWage: (salaryType === 'daily' && log.status !== 'absent' && log.checkIn) ? dailyRate : 0,
                        ot: (log.scheduleOT && log.scheduleOT.hasOT && log.scheduleOT.otHours > 0) ? {
                            scheduled: log.scheduleOT.otHours,
                            actual: calculateActualOTHours(log.checkIn, log.checkOut, log.scheduleEndTime, log.scheduleOT.otHours),
                            rate: companyConfig.otTypes?.find(ot => ot.id === log.scheduleOT.otType)?.rate || 1.5,
                            amount: (log.scheduleOT && log.scheduleOT.hasOT && log.scheduleOT.otHours > 0) ? 
                                calculateActualOTHours(log.checkIn, log.checkOut, log.scheduleEndTime, log.scheduleOT.otHours) * hourlyRate * (companyConfig.otTypes?.find(ot => ot.id === log.scheduleOT.otType)?.rate || 1.5) : 0
                        } : null,
                        incentive: (log.scheduleIncentive && log.scheduleIncentive > 0) ? log.scheduleIncentive : 0
                    },
                    // 🛡️ ARCHITECTURE FIX: ส่ง object ตรงๆ ห้ามใช้ function ซ้อนทับให้เปลือง memory
                    deductionBreakdown: {
                        late: (dailyDeductionMinutes > 0) ? {
                            minutes: dailyDeductionMinutes,
                            amount: dailyDeductionAmount
                        } : null
                    }
                };
            });

            let salaryPay = baseSalary;
            if (salaryType === 'monthly') {
                if (cycleData.period === 'first' || cycleData.period === 'second') {
                    salaryPay = baseSalary / 2;
                }
            } else if (salaryType === 'daily') {
                salaryPay = workDays * dailyRate;
            }

            let otPay = cycleData.syncOT ? totalOtPay : 0;
            let deductionAmount = totalDeductionAmount;

            let sso = 0;
            let tax = 0;
            const dedProfile = emp.deductionProfile || 'none';

            if (dedProfile === 'sso' || dedProfile === 'sso_tax') {
                sso = PayrollCalculator.calculateSSO(baseSalary);
            }
            if (['tax', 'wht', 'sso_tax'].includes(dedProfile)) {
                tax = PayrollCalculator.calculateTax(salaryPay, 0.03);
            }

            const net = PayrollCalculator.calculateNet({
                salary: salaryPay,
                ot: otPay,
                incentive: totalIncentive,
                deductions: deductionAmount,
                sso,
                tax
            });

            totalNet += net;
            count++;

            const payslipId = `${emp.id}_${cycleId}`;
            const payslipRef = doc(db, 'payslips', payslipId);

            batch.set(payslipRef, {
                id: payslipId,
                cycleId,
                employeeId: emp.id,
                companyId,
                employeeSnapshot: {
                    name: emp.name || 'Unknown',
                    role: emp.position || 'Staff',
                    department: emp.department || '-',
                    type: salaryType,
                    avatar: emp.avatar || null,
                    deductionProfile: dedProfile,
                    baseSalary
                },
                financials: {
                    salary: salaryPay,
                    ot: otPay,
                    incentive: totalIncentive,
                    deductions: deductionAmount,
                    sso,
                    tax,
                    net
                },
                customItems: [],
                payments: [],
                paymentStatus: 'pending',
                paidAmount: 0,
                logsSnapshot: enrichedLogs, 
                updatedAt: serverTimestamp()
            });
        });

        const periodMap = { 'full': 'ทั้งเดือน', 'first': 'ครึ่งเดือนแรก', 'second': 'ครึ่งเดือนหลัง' };
        const mObj = new Date(year, month - 1, 1);
        const monthName = mObj.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
        const cycleTitle = `งวด ${monthName} (${periodMap[cycleData.period] || 'ทั้งเดือน'})`;

        batch.set(cycleRef, {
            ...cycleData,
            id: cycleId,
            title: cycleTitle,
            companyId,
            status: 'draft',
            summary: { totalNet, totalPaid: 0, count },
            startDate: startDay,
            endDate: endDay,
            syncDeduct: cycleData.syncDeduct || false,
            syncOT: cycleData.syncOT || false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        await batch.commit();
        return cycleId;
    },

    async deleteCycle(cycleId) {
        const q = query(collection(db, 'payslips'), where('cycleId', '==', cycleId));
        const snap = await getDocs(q);

        const batch = writeBatch(db);

        snap.docs.forEach(d => {
            batch.delete(doc(db, 'payslips', d.id));
        });

        batch.delete(doc(db, 'payroll_cycles', cycleId));

        await batch.commit();
        console.log(`Deleted cycle ${cycleId} and ${snap.docs.length} payslips`);
        return { deletedPayslips: snap.docs.length };
    },

    async lockCycle(cycleId) {
        const q = query(
            collection(db, 'payslips'),
            where('cycleId', '==', cycleId)
        );
        const snap = await getDocs(q);

        const batch = writeBatch(db);

        batch.update(doc(db, 'payroll_cycles', cycleId), {
            status: 'locked',
            lockedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        snap.docs.forEach(d => {
            batch.update(doc(db, 'payslips', d.id), {
                paymentStatus: 'locked',
                updatedAt: serverTimestamp()
            });
        });

        await batch.commit();
        console.log(`Locked cycle ${cycleId} and ${snap.docs.length} payslips`);
    },

    async getCycles(companyId) {
        const q = query(
            collection(db, 'payroll_cycles'),
            where('companyId', '==', companyId),
            orderBy('month', 'desc')
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async getPayslips(cycleId) {
        const q = query(
            collection(db, 'payslips'),
            where('cycleId', '==', cycleId)
        );
        const snap = await getDocs(q);
        const payslips = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const cycleRef = doc(db, 'payroll_cycles', cycleId);
        const cycleSnap = await getDoc(cycleRef);
        const cycleData = cycleSnap.exists() ? cycleSnap.data() : { syncDeduct: false };
        
        return payslips.map(payslip => ({
            ...payslip,
            cycleData: cycleData
        }));
    },

    async updatePayslip(payslipId, data) {
        return this.savePayslip(data);
    },

    async savePayslip(payslip) {
        const ref = doc(db, 'payslips', payslip.id);
        await setDoc(ref, {
            ...payslip,
            updatedAt: serverTimestamp()
        }, { merge: true });
    },

    async addPayment(payslipId, payment) {
        const psRef = doc(db, 'payslips', payslipId);

        await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(psRef);
            if (!sfDoc.exists()) throw "Payslip does not exist!";

            const data = sfDoc.data();
            const currentPaid = (data.payments || []).reduce((acc, p) => acc + p.amount, 0);
            const netTotal = data.financials?.net || 0;

            if (currentPaid + payment.amount > netTotal) {
                throw new Error(`ยอดจ่ายเกิน! (คงเหลือ: ${netTotal - currentPaid}, จ่าย: ${payment.amount})`);
            }

            const newPayments = [...(data.payments || []), { ...payment, id: Date.now().toString() }];
            const newPaidTotal = currentPaid + payment.amount;

            const newStatus = newPaidTotal >= netTotal ? 'paid' : 'partial';

            transaction.update(psRef, {
                payments: newPayments,
                paymentStatus: newStatus,
                paidAmount: newPaidTotal,
                updatedAt: serverTimestamp()
            });
        });
    },

    async batchApprovePayments(cycleId) {
        const q = query(
            collection(db, 'payslips'),
            where('cycleId', '==', cycleId)
        );
        const snap = await getDocs(q);

        const batch = writeBatch(db);
        let updatedCount = 0;

        snap.docs.forEach(doc => {
            const data = doc.data();
            const net = data.financials?.net || 0;
            const currentPaid = (data.payments || []).reduce((sum, p) => sum + p.amount, 0);
            
            if (data.paymentStatus !== 'paid' && currentPaid < net) {
                const remainingAmount = net - currentPaid;
                
                batch.update(doc.ref, {
                    payments: [
                        ...(data.payments || []),
                        {
                            id: Date.now().toString(),
                            amount: remainingAmount,
                            date: new Date().toISOString(),
                            method: 'batch_approval',
                            note: 'ยืนยันการจ่ายทั้งรอบ'
                        }
                    ],
                    paymentStatus: 'paid',
                    paidAmount: net,
                    updatedAt: serverTimestamp()
                });
                updatedCount++;
            }
        });

        await batch.commit();
        console.log(`Batch approved ${updatedCount} payments for cycle ${cycleId}`);
        return { updatedCount };
    },

    async rebuildCycle(cycleId) {
        const cycleRef = doc(db, 'payroll_cycles', cycleId);
        const cycleSnap = await getDoc(cycleRef);

        if (!cycleSnap.exists()) {
            throw new Error('Cycle not found');
        }

        const cycleData = cycleSnap.data();

        if (cycleData.status === 'locked') {
            throw new Error('Cannot rebuild locked cycle - payments have been processed');
        }

        const payslipsQ = query(collection(db, 'payslips'), where('cycleId', '==', cycleId));
        const payslipsSnap = await getDocs(payslipsQ);

        const batch = writeBatch(db);
        payslipsSnap.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        console.log(`Deleted ${payslipsSnap.size} existing payslips for rebuild`);

        const cycleParams = {
            month: cycleData.month,
            period: cycleData.period,
            target: cycleData.target || 'all'
        };

        return await this.createCycle(cycleData.companyId, cycleParams);
    },

    async validateCycleData(cycleId) {
        const cycleRef = doc(db, 'payroll_cycles', cycleId);
        const cycleSnap = await getDoc(cycleRef);
        const cycleData = cycleSnap.data();

        const payslipsQ = query(collection(db, 'payslips'), where('cycleId', '==', cycleId));
        const payslipsSnap = await getDocs(payslipsQ);

        const issues = [];
        const expectedDays = this._getExpectedDays(cycleData.startDate, cycleData.endDate);

        payslipsSnap.forEach(payslipDoc => {
            const payslip = payslipDoc.data();
            const logs = payslip.logsSnapshot || [];

            const actualDays = logs.map(l => l.date);
            const missingDays = expectedDays.filter(day => !actualDays.includes(day));

            if (missingDays.length > 0) {
                issues.push({
                    employee: payslip.employeeSnapshot?.name,
                    employeeId: payslip.employeeId,
                    missingDays,
                    totalExpected: expectedDays.length,
                    totalActual: actualDays.length,
                    completionRate: ((actualDays.length / expectedDays.length) * 100).toFixed(1) + '%'
                });
            }
        });

        return {
            isValid: issues.length === 0,
            totalEmployees: payslipsSnap.size,
            issuesCount: issues.length,
            issues,
            summary: {
                totalExpectedDays: expectedDays.length,
                cycleInfo: {
                    id: cycleId,
                    startDate: cycleData.startDate,
                    endDate: cycleData.endDate,
                    status: cycleData.status
                }
            }
        };
    },

    _getExpectedDays(startDate, endDate) {
        const days = [];
        const start = dayjs(startDate);
        const end = dayjs(endDate);

        let current = start;
        while (current.isBefore(end) || current.isSame(end, 'day')) {
            days.push(current.format('YYYY-MM-DD'));
            current = current.add(1, 'day');
        }

        return days;
    },

    async getStaffCount(companyId) {
        const q = query(
            collection(db, 'users'),
            where('companyId', '==', companyId)
        );
        const snap = await getDocs(q);
        return snap.docs.filter(d => {
            const data = d.data();
            return data.role !== 'admin' && data.active !== false && data.status !== 'resigned';
        }).length;
    }
};