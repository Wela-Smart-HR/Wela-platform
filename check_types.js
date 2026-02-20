import { initializeApp } from "firebase/admin/app";
import { getFirestore } from "firebase/admin/firestore";
import fs from "fs";

initializeApp({ projectId: "demo-wela" });
const db = getFirestore();

async function checkTypes() {
    const snap = await db.collection("attendance_logs").limit(5).get();
    snap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`Doc ID: ${doc.id}`);
        console.log(`clock_in type: ${typeof data.clock_in} - isTimestamp: ${data.clock_in && data.clock_in.toDate !== undefined}`);
        console.log(`clock_in value:`, data.clock_in);
    });
}

checkTypes().catch(console.error);
