/**
 * Simple Payroll Cycle Audit Script
 * ตรวจสอบและแก้ไข syncDeduct flag โดยไม่ต้องเชื่อมต่อ firebase
 */

const auditPayrollCycles = {
    // วิธีที่ 1: ใช้ Firebase Console
    firebaseConsole: {
        title: "🔧 แก้ไขผ่าน Firebase Console (แนะนำ)",
        steps: [
            "1. เปิด Firebase Console: https://console.firebase.google.com",
            "2. เลือก Project ของคุณ",
            "3. ไปที่ Firestore Database",
            "4. คลิกที่ Collection: payroll_cycles",
            "5. ค้นหา documents ที่มี syncDeduct: false",
            "6. แก้ไข syncDeduct: false → true",
            "7. บันทึกการเปลี่ยนแปลง"
        ]
    },
    
    // วิธีที่ 2: คำสั่ง Firestore query
    firestoreQuery: {
        title: "📋 Firestore Query สำหรับค้นหา",
        query: `
// คัดลอกและวางใน Firebase Console
db.collection('payroll_cycles')
  .where('companyId', '==', 'YOUR_COMPANY_ID')
  .where('syncDeduct', '==', false)
  .get()
  .then((snapshot) => {
    console.log('พบ', snapshot.size, 'cycles ที่ต้องแก้ไข');
    
    // แก้ไขทั้งหมดในครั้งเดียว
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      console.log('แก้ไข cycle:', doc.id, '-', doc.data().title);
      batch.update(doc.ref, {
        syncDeduct: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    
    return batch.commit();
  })
  .then(() => {
    console.log('✅ แก้ไข syncDeduct สำเร็จแล้ว!');
  })
  .catch((error) => {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  });
        `
    },
    
    // วิธีที่ 3: ตรวจสอบเฉพาะ cycle ที่ระบุ
    specificCycle: {
        title: "🎯 แก้ไข cycle เฉพาะ",
        query: `
// แก้ไขเฉพาะ cycle ที่ระบุ
db.collection('payroll_cycles')
  .doc('YOUR_CYCLE_ID')
  .update({
    syncDeduct: true,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    console.log('✅ แก้ไข cycle สำเร็จแล้ว!');
  })
  .catch((error) => {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  });
        `
    }
};

// แสดงคำแนะนำทั้งหมด
console.log("🔧 PAYROLL CYCLE SYNCDEDUCT FIX GUIDE\n");
console.log("=" .repeat(50));

console.log("\n" + auditPayrollCycles.firebaseConsole.title);
console.log("-".repeat(40));
auditPayrollCycles.firebaseConsole.steps.forEach((step, index) => {
    console.log(`${index + 1}. ${step}`);
});

console.log("\n" + auditPayrollCycles.firestoreQuery.title);
console.log("-".repeat(40));
console.log(auditPayrollCycles.firestoreQuery.query);

console.log("\n" + auditPayrollCycles.specificCycle.title);
console.log("-".repeat(40));
console.log(auditPayrollCycles.specificCycle.query);

console.log("\n" + "=".repeat(50));
console.log("📝 หมายเหตุ:");
console.log("• หลังจากการตรวจสอบ พบว่า syncDeduct: false ทำให้ไม่มีการหักเงิน");
console.log("• การตั้งค่า syncDeduct: true จะเปิดการคำนวณการหักเงินตามกะงาน");
console.log("• ควรตรวจสอบ cycles อื่นๆ ในระบบด้วยว่ามีปัญหาเดียวกัน");

console.log("\n🔍 ขั้นตอน:");
console.log("1. ใช้วิธี Firebase Console ที่แนะนำที่สุด");
console.log("2. คัดลอก query ข้างต้นเพื่อตรวจสอบก่อนแก้ไข");
console.log("3. บันทึกข้อมูลการเปลี่ยนแปลงไว้เป็นหลักฐาน");
console.log("4. ทดสอบการทำงานหลังจากแก้ไข");
