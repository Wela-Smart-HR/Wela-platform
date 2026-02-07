
import { doc, serverTimestamp, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '@/shared/lib/firebase';

/**
 * Shared: Update User's Monthly Stats (Zero-Cost Aggregation)
 * Path: users/{userId}/stats/{YYYY-MM}
 * 
 * Supports both Transaction and Standard Write.
 * 
 * @param {Object|null} transaction - Firestore Transaction object (optional)
 * @param {string} userId 
 * @param {string} companyId 
 * @param {string} dateStr - YYYY-MM-DD
 * @param {Object} updates - Fields to update (e.g., { presentDays: increment(1) })
 * @param {Object|null} eventData - Optional event to push to 'attendanceEvents' array
 */
export const updateMonthlyStats = async (transaction, userId, companyId, dateStr, updates, eventData = null) => {
    const monthStr = dateStr.substring(0, 7); // YYYY-MM
    const statsRef = doc(db, 'users', userId, 'stats', monthStr);

    const payload = {
        companyId,
        month: monthStr,
        updatedAt: serverTimestamp(),
        ...updates
    };

    if (eventData) {
        payload.attendanceEvents = arrayUnion(eventData);
    }

    if (transaction) {
        transaction.set(statsRef, payload, { merge: true });
    } else {
        await setDoc(statsRef, payload, { merge: true });
    }
};

/**
 * Shared: Update Company's Daily Summary (Zero-Cost Aggregation)
 * Path: companies/{companyId}/daily_attendance/{YYYY-MM-DD}
 * 
 * @param {Object|null} transaction 
 * @param {string} companyId 
 * @param {string} dateStr 
 * @param {string} userId 
 * @param {Object} summaryData - { timeIn, status, location, etc. }
 */
export const updateDailySummary = async (transaction, companyId, dateStr, userId, summaryData) => {
    const summaryRef = doc(db, 'companies', companyId, 'daily_attendance', dateStr);

    const payload = {
        date: dateStr,
        lastUpdated: serverTimestamp(),
        attendance: {
            [userId]: summaryData
        }
    };

    if (transaction) {
        transaction.set(summaryRef, payload, { merge: true });
    } else {
        await setDoc(summaryRef, payload, { merge: true });
    }
};
