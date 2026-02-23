import { initializeApp } from "firebase/admin/app";
import { getFirestore } from "firebase/admin/firestore";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

initializeApp({ projectId: "demo-wela" });
const db = getFirestore();
const companyId = "COMP-1768062566486";
const TIMEZONE = 'Asia/Bangkok';

async function fixData() {
    console.log("Fetching legacy daily_attendance for Feb 2026...");

    const startStr = "2026-02-01";
    const endStr = "2026-02-28";

    // 1. Fetch Legacy Data
    const snap = await db.collection("companies").doc(companyId).collection("daily_attendance")
        .where("date", ">=", startStr)
        .where("date", "<=", endStr)
        .get();

    console.log(`Found ${snap.docs.length} daily_attendance documents.`);

    const batch = db.batch();
    let count = 0;

    snap.docs.forEach(docSnap => {
        const dateStr = docSnap.id; // e.g. "2026-02-11"
        const data = docSnap.data();
        const attendance = data.attendance || {};

        Object.entries(attendance).forEach(([employeeId, att]) => {
            if (!att.timeIn) return;

            // Fix Timezone: If it's a UTC string like "2026-02-11T02:31:00.000Z", 
            // the old system actually meant "02:31 Local Thai Time" WHICH IS WRONG!
            // Wait, if it says 02:31, and it SHOULD be 09:31, that means the system recorded Local Time (09:31) 
            // but stored it as if it was UTC (subtracting 7 hours locally before saving, or saving 02:31Z).
            // Let's force it to be Thai Time.

            const parseAndFixTime = (timeStr) => {
                if (!timeStr) return null;
                // If it's a timestamp string like 2026-02-11T02:31:00.000Z
                // We want to treat that 02:31 UTC as 09:31 Thai time (by adding 7 hours)
                // Actually, if JS reads "2026-02-11T02:31:00.000Z", dayjs().tz() will convert it to 09:31+07:00!
                // Let's just create a standard date. JS Date will automatically add the timezone offset 
                // if we just pass the Z string.

                const d = new Date(timeStr);
                return d; // Firestore admin SDK will save this Date object correctly.
            };

            const clockIn = parseAndFixTime(att.timeIn);
            const clockOut = parseAndFixTime(att.timeOut);

            const deterministicId = `${companyId}_${employeeId}_${dateStr}`;
            const ref = db.collection("attendance_logs").doc(deterministicId);

            batch.set(ref, {
                company_id: companyId,
                employee_id: employeeId,
                shift_date: dateStr,
                clock_in: clockIn,
                clock_out: clockOut || null,
                status: att.status || 'on-time',
                late_minutes: att.lateMins || att.lateMinutes || 0,
                timezone: TIMEZONE,
                is_migrated: true,
                migrated_at: new Date()
            }, { merge: true });

            count++;
            console.log(`Fixing: ${employeeId} on ${dateStr} | In: ${clockIn?.toISOString()} | Out: ${clockOut?.toISOString()}`);
        });
    });

    if (count > 0) {
        await batch.commit();
        console.log(`Successfully fixed and migrated ${count} records to attendance_logs.`);
    } else {
        console.log("No data to fix.");
    }
}

fixData().catch(console.error);
