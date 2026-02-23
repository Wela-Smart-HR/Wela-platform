import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from './serviceAccountKey.json' assert { type: "json" }; // Adjust path if needed

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function cleanup() {
    console.log("🔍 Scanning for corrupt attendance logs...");
    const snapshot = await db.collection('attendance_logs').get();

    let count = 0;
    const batch = db.batch();

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.clock_in && data.clock_in.includes('undefined')) {
            console.log(`🗑️ Deleting corrupt log: ${doc.id} (clock_in: ${data.clock_in})`);
            batch.delete(doc.ref);
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`✅ Cleaned up ${count} corrupt logs.`);
    } else {
        console.log("✨ No corrupt logs found.");
    }
}

cleanup().catch(console.error);
