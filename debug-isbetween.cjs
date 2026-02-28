const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const isBetween = require('dayjs/plugin/isBetween');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

function test() {
    console.log("Dayjs Version:", dayjs().format());

    // Exact logic from createCycle
    const COMPANY_TIMEZONE = 'Asia/Bangkok';
    const endDay = '2026-02-28';
    const startDay = '2026-02-01';

    const rangeStart = dayjs.tz(startDay, COMPANY_TIMEZONE).startOf('day');
    const rangeEnd = dayjs.tz(endDay, COMPANY_TIMEZONE).endOf('day');

    // Simulate a Firestore timestamp at 2026-02-28 09:00:00 (Asia/Bangkok) -> 02:00:00 UTC
    // new Date parses ISO 8601 strictly as UTC if ending in Z
    const clockInDate = new Date('2026-02-28T02:00:00.000Z');

    // Test 1: Date object fallback 
    const clockInDayjsDate = dayjs(clockInDate);

    // Test 2: Literal string parsing (if no .toDate exists)
    const clockInDayjsString = dayjs('2026-02-28T02:00:00.000Z');

    // Test 3: tz parsing
    const clockInDayjsTZ = dayjs.tz(clockInDate, COMPANY_TIMEZONE);

    console.log("Range End:", rangeEnd.format(), "UTC:", rangeEnd.toISOString());
    console.log("Clock In DayJS Object:", clockInDayjsDate.format());

    console.log("\n--- isBetween Results ---");
    console.log("JS Date Object     :", clockInDayjsDate.isBetween(rangeStart, rangeEnd, 'millisecond', '[]'));
    console.log("ISO String Literal :", clockInDayjsString.isBetween(rangeStart, rangeEnd, 'millisecond', '[]'));
    console.log("forced TZ DayJS    :", clockInDayjsTZ.isBetween(rangeStart, rangeEnd, 'millisecond', '[]'));
}

test();
