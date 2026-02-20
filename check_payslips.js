import { initializeApp } from "firebase/admin/app";
import { getFirestore } from "firebase/admin/firestore";

initializeApp({ projectId: "demo-wela" });
const db = getFirestore();

async function checkPayslips() {
    const companyId = "COMP-1768062566486";
    // Check cycle 2026-02_full
    const cycleId = `${companyId}_2026-02_full`; // or whatever it is, let's query by company

    const snap = await db.collection("payslips")
        .where("companyId", "==", companyId)
        .where("cycleId", "==", `${companyId}_2026-02_full`)
        .get();

    console.log(`Found ${snap.docs.length} payslips for 2026-02_full`);
    snap.docs.forEach(d => {
        const data = d.data();
        console.log(`User: ${data.employeeSnapshot.name} (${data.employeeId})`);
        console.log(`   Net: ${data.financials.net}`);
        console.log(`   Logs Count: ${data.logsSnapshot?.length}`);
        if (data.logsSnapshot?.length > 0) {
            console.log(`   Log[0]: ${data.logsSnapshot[0].date} ${data.logsSnapshot[0].checkIn}->${data.logsSnapshot[0].checkOut}`);
            console.log(`   Log[last] ${data.logsSnapshot[data.logsSnapshot.length - 1].date}`);
        }
    });
}

checkPayslips().catch(console.error);
