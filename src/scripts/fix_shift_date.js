import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixShiftDate() {
    console.log("Checking for attendance_logs with missing shift_date...");
    const logsRef = collection(db, 'attendance_logs');
    const snap = await getDocs(logsRef);

    let count = 0;
    for (const docSnap of snap.docs) {
        const data = docSnap.data();
        if (!data.shift_date && data.clock_in) {
            // Need to derive shift_date from clock_in
            // clock_in is an ISO string e.g. "2026-02-22T02:42:15.859Z"
            // Let's assume +07:00 timezone for shift_date
            const dateObj = new Date(data.clock_in);

            if (isNaN(dateObj.getTime())) {
                console.warn(`Doc ID ${docSnap.id} has invalid clock_in: ${data.clock_in}`);
                continue;
            }

            // Convert to +07:00
            const localDateStr = new Date(dateObj.getTime() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];

            console.log(`Patching Doc ID ${docSnap.id} -> shift_date: ${localDateStr}`);
            await updateDoc(doc(db, 'attendance_logs', docSnap.id), {
                shift_date: localDateStr
            });
            count++;
        }
    }
    console.log(`✅ Success! Patched ${count} documents.`);
    process.exit(0);
}

fixShiftDate().catch(console.error);
