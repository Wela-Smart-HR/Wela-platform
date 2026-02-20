import React from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const COMPANY_TIMEZONE = 'Asia/Bangkok';/**
 * LogsTab — Full-month attendance calendar for a payslip.
 * 
 * Merges separate clock-in / clock-out rows into ONE row per day.
 * Fills in empty days (no attendance) so user sees every day in the period.
 * Shows: Date | In-Out Time | Income/Deduction details
 * 
 * @param {{ logs: Array, startDate: string, endDate: string }} props
 */
export const LogsTab = ({ logs, startDate, endDate }) => {

    // --- 1. Build a map of date -> merged log ---
    const logMap = {};

    (logs || []).forEach(log => {
        const dateKey = log.date; // "2026-02-06"
        if (!dateKey) return;

        if (!logMap[dateKey]) {
            logMap[dateKey] = {
                date: dateKey,
                checkIn: null,
                checkOut: null,
                status: null,
                lateMinutes: 0,
                otHours: 0,
                income: 0,
                deduction: 0,
                note: ''
            };
        }

        const entry = logMap[dateKey];

        // Merge clock-in/out times
        if (log.type === 'clock-in' || log.checkIn) {
            entry.checkIn = log.checkIn || log.time || entry.checkIn;
        }
        if (log.type === 'clock-out' || log.checkOut) {
            entry.checkOut = log.checkOut || log.time || entry.checkOut;
        }

        // If legacy format has both checkIn/checkOut in single doc
        if (log.checkIn && !entry.checkIn) entry.checkIn = log.checkIn;
        if (log.checkOut && !entry.checkOut) entry.checkOut = log.checkOut;

        // Merge status (prioritize meaningful status)
        if (log.status && log.status !== 'present') entry.status = log.status;
        else if (!entry.status) entry.status = log.status || 'present';

        // Aggregate financials
        if (log.lateMinutes) entry.lateMinutes += Number(log.lateMinutes);
        if (log.otHours) entry.otHours += Number(log.otHours);
        if (log.income) entry.income += Number(log.income);
        if (log.deduction) entry.deduction += Number(log.deduction);

        // Append notes
        if (log.note) {
            entry.note = [entry.note, log.note].filter(Boolean).join(', ');
        }
    });

    console.log('[LogsTab] incoming logs:', logs?.length, 'logMap keys:', Object.keys(logMap), 'sample:', logs?.slice(0, 3).map(l => ({ date: l.date, checkIn: l.checkIn, checkOut: l.checkOut })));

    // --- 2. Generate full date range (LOCAL timezone safe) ---
    const allDays = [];
    if (startDate && endDate) {
        let current = dayjs.tz(startDate, COMPANY_TIMEZONE).startOf('day');
        const endDay = dayjs.tz(endDate, COMPANY_TIMEZONE).startOf('day');

        while (current.isBefore(endDay) || current.isSame(endDay, 'day')) {
            allDays.push(current.format('YYYY-MM-DD'));
            current = current.add(1, 'day');
        }
    } else {
        // Fallback: just use log dates sorted
        Object.keys(logMap).sort().forEach(k => allDays.push(k));
    }

    const fmtDay = (dateStr) => {
        const d = dayjs.tz(dateStr, COMPANY_TIMEZONE);
        return {
            num: d.date(),
            day: d.toDate().toLocaleDateString('th-TH', { weekday: 'short' }),
            isWeekend: d.day() === 0 || d.day() === 6
        };
    };

    const fmt = n => (Number(n) || 0).toLocaleString();

    return (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mt-2">
            <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="pl-4 py-3 text-[9px] text-gray-400 font-bold uppercase w-14">วันที่</th>
                        <th className="py-3 text-[9px] text-gray-400 font-bold uppercase">เข้า-ออก</th>
                        <th className="pr-4 py-3 text-[9px] text-gray-400 font-bold uppercase text-right">รายละเอียด</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {allDays.length === 0 ? (
                        <tr><td colSpan="3" className="text-center py-8 text-xs text-gray-400">ไม่มีข้อมูลบันทึกในรอบนี้</td></tr>
                    ) : (
                        allDays.map(dateKey => {
                            const entry = logMap[dateKey];
                            const { num, day, isWeekend } = fmtDay(dateKey);

                            return (
                                <tr key={dateKey} className={`group transition-colors ${entry ? 'hover:bg-blue-50/50' : ''} ${isWeekend && !entry ? 'bg-gray-50/50' : ''}`}>
                                    {/* Date */}
                                    <td className="pl-4 align-top py-3 w-14">
                                        <div className={`flex flex-col items-center rounded-lg p-1 w-10 ${entry ? 'bg-blue-50' : isWeekend ? 'bg-gray-100' : 'bg-gray-50'}`}>
                                            <span className={`text-[9px] font-bold uppercase ${isWeekend ? 'text-red-400' : 'text-gray-400'}`}>{day}</span>
                                            <span className={`text-sm font-bold ${entry ? 'text-blue-700' : 'text-gray-400'}`}>{num}</span>
                                        </div>
                                    </td>

                                    {/* Time */}
                                    <td className="align-top py-3">
                                        {!entry ? (
                                            <span className="text-[10px] text-gray-300 font-medium">{isWeekend ? 'วันหยุด' : '-'}</span>
                                        ) : entry.status === 'absent' ? (
                                            <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded">ขาดงาน</span>
                                        ) : (
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1 text-xs font-bold text-gray-800">
                                                    <span className="text-green-600">{entry.checkIn || '-'}</span>
                                                    <span className="text-gray-300">→</span>
                                                    <span className="text-red-500">{entry.checkOut || '-'}</span>
                                                </div>
                                                <div className="flex gap-1 mt-0.5 flex-wrap">
                                                    {entry.status === 'late' && <span className="text-[9px] text-orange-500 font-bold bg-orange-50 px-1 rounded">สาย {entry.lateMinutes}m</span>}
                                                    {entry.otHours > 0 && <span className="text-[9px] text-blue-500 font-bold bg-blue-50 px-1 rounded">OT {entry.otHours}h</span>}
                                                </div>
                                            </div>
                                        )}
                                    </td>

                                    {/* Financial Details */}
                                    <td className="pr-4 align-top py-3 text-right">
                                        {!entry ? (
                                            <span className="text-[10px] text-gray-200">-</span>
                                        ) : (
                                            <div className="flex flex-col gap-0.5 items-end">
                                                {entry.income > 0 && (
                                                    <span className="text-[10px] font-bold text-green-600">+{fmt(entry.income)}</span>
                                                )}
                                                {entry.deduction > 0 && (
                                                    <span className="text-[10px] font-bold text-red-500">-{fmt(entry.deduction)}</span>
                                                )}
                                                {(!entry.income && !entry.deduction && entry.status !== 'absent') && (
                                                    <span className="text-[10px] text-gray-300">-</span>
                                                )}
                                                {entry.status === 'absent' && (
                                                    <span className="text-[10px] font-bold text-red-400">ขาด</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
};
