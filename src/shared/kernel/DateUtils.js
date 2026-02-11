import {
    format as formatFns,
    parseISO,
    isValid,
    differenceInMinutes,
    addDays,
    startOfDay,
    subDays
} from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'Asia/Bangkok';

/**
 * Date Utilities (Timezone Aware)
 * Centralized date handling ensuring 'Asia/Bangkok' consistency.
 */
export const DateUtils = {

    /**
     * Get current Date object (System Time - usually UTC on server)
     * @returns {Date}
     */
    now: () => new Date(),

    /**
     * Get current timestamp in ISO format (UTC)
     * @returns {string}
     */
    nowISO: () => new Date().toISOString(),

    /**
     * Convert any date to Bangkok Time (Date Object)
     * Useful for logic calculations (e.g. checking hour of day)
     * @param {Date|string} date 
     * @returns {Date}
     */
    toBangkok: (date) => {
        const d = typeof date === 'string' ? parseISO(date) : date;
        return toZonedTime(d, TIMEZONE);
    },

    /**
     * Format a date for display in Thai Timezone
     * @param {Date|string} date 
     * @param {string} formatStr (e.g. 'dd/MM/yyyy HH:mm')
     * @returns {string}
     */
    format: (date, formatStr = 'dd/MM/yyyy HH:mm') => {
        if (!date) return '-';
        const d = typeof date === 'string' ? parseISO(date) : date;
        if (!isValid(d)) return '-';

        // Force Bangkok Timezone for display
        return formatInTimeZone(d, TIMEZONE, formatStr);
    },

    /**
     * Get the "Business Date" (Accounting Date)
     * Critical for Nightlife/Shift work.
     * Example: If cutoff is 05:00 AM, then 02:00 AM on Feb 15th belongs to Feb 14th.
     * * @param {Date|string} date 
     * @param {number} cutoffHour (default 5 AM)
     * @returns {Date} start of the business day
     */
    getBusinessDate: (date, cutoffHour = 5) => {
        const d = typeof date === 'string' ? parseISO(date) : date;
        const bangkokDate = toZonedTime(d, TIMEZONE);
        const currentHour = parseInt(formatFns(bangkokDate, 'H')); // 0-23

        if (currentHour < cutoffHour) {
            // If before cutoff (e.g. 3 AM), it belongs to yesterday
            return startOfDay(subDays(bangkokDate, 1));
        }
        return startOfDay(bangkokDate);
    },

    /**
     * Calculate duration in minutes
     * @param {Date} start 
     * @param {Date} end 
     * @returns {number}
     */
    diffInMinutes: (start, end) => {
        if (!start || !end) return 0;
        return differenceInMinutes(end, start);
    },

    /**
     * Check if a shift crosses midnight (Business Logic Helper)
     * @param {string} shiftStartTime (e.g. "22:00")
     * @param {string} shiftEndTime (e.g. "04:00")
     * @returns {boolean}
     */
    isCrossDay: (shiftStartTime, shiftEndTime) => {
        // Simple logic: if end time is numerically smaller than start time
        // e.g. "04:00" < "22:00" -> True
        const [startH] = shiftStartTime.split(':').map(Number);
        const [endH] = shiftEndTime.split(':').map(Number);
        return endH < startH;
    }
};