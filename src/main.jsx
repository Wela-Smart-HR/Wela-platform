import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { db } from './shared/lib/firebase'
import { collection, query, getDocs, doc, writeBatch } from 'firebase/firestore'

window.fixFebDataV2 = async () => {
  console.log("Fetching ALL legacy daily_attendance...");
  const companyId = "COMP-1768062566486";

  try {
    // ⚠️ Fetch EVERYTHING in daily_attendance because `date` field is missing in old records!
    const snap = await getDocs(query(collection(db, "companies", companyId, "daily_attendance")));

    console.log(`Found ${snap.docs.length} total docs. Filtering for Feb 2026...`);
    const batch = writeBatch(db);
    let count = 0;

    snap.docs.forEach(docSnap => {
      const dateStr = docSnap.id; // e.g. "2026-02-01"
      if (!dateStr.startsWith("2026-02")) return; // Only process February

      const data = docSnap.data();
      const attendance = data.attendance || {};

      Object.entries(attendance).forEach(([employeeId, att]) => {
        if (!att.timeIn && !att.timeOut) return;

        const parseAndFixTime = (timeStr) => {
          if (!timeStr) return null;
          return new Date(timeStr);
        };

        const clockIn = parseAndFixTime(att.timeIn);
        const clockOut = parseAndFixTime(att.timeOut);

        const deterministicId = `${companyId}_${employeeId}_${dateStr}`;
        const ref = doc(db, "attendance_logs", deterministicId);

        batch.set(ref, {
          company_id: companyId,
          employee_id: employeeId,
          shift_date: dateStr,
          clock_in: clockIn,
          clock_out: clockOut || null,
          status: att.status || (att.lateMins > 0 ? 'late' : 'on-time'),
          late_minutes: att.lateMins || att.lateMinutes || 0,
          timezone: 'Asia/Bangkok',
          is_migrated: true,
          migrated_at: new Date(),
          _migrated_from_v2: true
        }, { merge: true });

        count++;
      });
    });

    if (count > 0) {
      await batch.commit();
      console.log(`✅ SUCCESS: Migrated ${count} records to attendance_logs!`);
    } else {
      console.log("No missing data found for Feb 2026.");
    }
  } catch (e) {
    console.error("Migration Error:", e);
  }
};
// --- TEMPORARY FIX SCRIPT ---
// Run `fixFebData()` in your browser console!
window.fixFebData = async () => {
  console.log("Fetching legacy daily_attendance for Feb 2026...");
  const companyId = "COMP-1768062566486";
  const startStr = "2026-02-01";
  const endStr = "2026-02-28";

  try {
    const snap = await getDocs(query(
      collection(db, "companies", companyId, "daily_attendance"),
      where("date", ">=", startStr),
      where("date", "<=", endStr)
    ));

    console.log(`Found ${snap.docs.length} daily_attendance documents. Processing...`);
    const batch = writeBatch(db);
    let count = 0;

    snap.docs.forEach(docSnap => {
      const dateStr = docSnap.id;
      const data = docSnap.data();
      const attendance = data.attendance || {};

      Object.entries(attendance).forEach(([employeeId, att]) => {
        if (!att.timeIn) return;

        const parseAndFixTime = (timeStr) => {
          if (!timeStr) return null;
          // If UTC string "2026-02-11T02:31:00.000Z", new Date() parses it.
          // But we actually want to treat that 02:31 UTC as 09:31 Thai time (by adding 7 hours)
          // new Date("2026-02-11T02:31:00.000Z") in a Thai browser will yield 09:31.
          // Wait, new Date("...Z") already adds 7 hours! 
          const d = new Date(timeStr);
          // Firestore JS SDK v9 saves Date objects natively
          return d;
        };

        const clockIn = parseAndFixTime(att.timeIn);
        const clockOut = parseAndFixTime(att.timeOut);

        const deterministicId = `${companyId}_${employeeId}_${dateStr}`;
        const ref = doc(db, "attendance_logs", deterministicId);

        batch.set(ref, {
          company_id: companyId,
          employee_id: employeeId,
          shift_date: dateStr,
          clock_in: clockIn,
          clock_out: clockOut || null,
          status: att.status || 'on-time',
          late_minutes: att.lateMins || att.lateMinutes || 0,
          timezone: 'Asia/Bangkok',
          is_migrated: true,
          migrated_at: new Date()
        }, { merge: true });

        count++;
      });
    });

    if (count > 0) {
      await batch.commit();
      console.log(`✅ Successfully fixed and migrated ${count} records to attendance_logs!`);
    } else {
      console.log("No data to fix.");
    }
  } catch (e) {
    console.error("Error migrating:", e);
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)