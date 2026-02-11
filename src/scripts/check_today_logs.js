
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.resolve('c:\\dev\\Wela-platform\\.env') });

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

async function checkTodayLogs() {
    console.log('Checking attendance_logs for today...');

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    console.log(`Querying for clock_in >= ${todayStr}`);

    try {
        const q = query(
            collection(db, "attendance_logs"),
            where("clock_in", ">=", todayStr),
            orderBy("clock_in", "desc")
        );

        const snapshot = await getDocs(q);
        console.log(`Found ${snapshot.size} records for today.`);

        snapshot.forEach(doc => {
            console.log(doc.id, doc.data());
        });

    } catch (error) {
        console.error("Error querying logs:", error);
    }
}

checkTodayLogs();
