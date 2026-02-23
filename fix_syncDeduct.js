/**
 * Fix Payroll Cycle syncDeduct Flag
 * แก้ไข payroll cycles ที่มี syncDeduct: false ให้เป็น true
 */

import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './src/shared/lib/firebase.js';

/**
 * แก้ไข payroll cycle ที่ระบุ syncDeduct: false
 * @param {string} companyId - ID ของบริษัท
 * @param {string} cycleId - ID ของ payroll cycle (optional, ถ้าไม่ระบุจะแก้ไขทั้งหมด)
 */
async function fixPayrollCycleSyncDeduct(companyId, cycleId = null) {
    console.log('🔧 Starting payroll cycle syncDeduct fix...');
    console.log(`📋 Company: ${companyId}, Cycle: ${cycleId || 'ALL'}`);

    try {
        if (cycleId) {
            // แก้ไขเฉพาะ cycle ที่ระบุ
            const cycleRef = doc(db, 'payroll_cycles', cycleId);
            const cycleSnap = await getDoc(cycleRef);
            
            if (!cycleSnap.exists()) {
                console.error(`❌ Cycle ${cycleId} not found`);
                return;
            }

            const cycleData = cycleSnap.data();
            console.log(`📊 Current cycle ${cycleId}:`, {
                id: cycleData.id,
                title: cycleData.title,
                syncDeduct: cycleData.syncDeduct,
                syncOT: cycleData.syncOT
            });

            if (cycleData.syncDeduct === false) {
                console.log(`🔧 Updating cycle ${cycleId} syncDeduct: false → true`);
                await updateDoc(cycleRef, {
                    syncDeduct: true,
                    updatedAt: serverTimestamp()
                });
                console.log(`✅ Cycle ${cycleId} updated successfully`);
            } else {
                console.log(`ℹ️ Cycle ${cycleId} already has syncDeduct: true`);
            }
        } else {
            // แก้ไขทั้งหมดในบริษัท
            const cyclesQuery = doc(db, 'companies', companyId);
            const companySnap = await getDoc(cyclesQuery);
            
            if (!companySnap.exists()) {
                console.error(`❌ Company ${companyId} not found`);
                return;
            }

            // ดึงข้อมูล cycles ทั้งหมด (ต้อง query จาก collection)
            console.log('🔄 Fetching all cycles for company...');
            // Note: ต้องใช้ query แทนการอ้างอิงตรงๆ เนื่องจากโครงสร้างอาจมีหลาย cycles
            console.log('⚠️  Please run this in your Firebase console or update the query logic for your specific Firestore structure');
            
            console.log(`
🔧 MANUAL FIX INSTRUCTIONS:
1. ไปที่ Firebase Console
2. เลือก Collection: payroll_cycles
3. ค้นหา documents ที่มี companyId: ${companyId}
4. สำหรับ document ที่มี syncDeduct: false
5. แก้ไข field: syncDeduct: true
6. บันทึกการเปลี่ยนแปลง

หรือรัน script นี้ใน Firebase Functions:
`);
            
            // สร้าง script สำหรับรันใน Firebase console
            const firebaseConsoleScript = `
// แก้ไข syncDeduct สำหรับ company: ${companyId}
const db = firebase.firestore();
db.collection('payroll_cycles')
  .where('companyId', '==', '${companyId}')
  .where('syncDeduct', '==', false)
  .get()
  .then((snapshot) => {
    console.log('Found', snapshot.size, 'cycles to fix');
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      console.log('Fixing cycle:', doc.id);
      batch.update(doc.ref, {
        syncDeduct: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    return batch.commit();
  })
  .then(() => {
    console.log('✅ All cycles updated successfully');
  })
  .catch((error) => {
    console.error('❌ Error updating cycles:', error);
  });
            `;
            
            console.log('📋 Firebase Console Script:');
            console.log(firebaseConsoleScript);
        }
    } catch (error) {
        console.error('❌ Error fixing payroll cycles:', error);
    }
}

/**
 * ตรวจสอบสถานะของ payroll cycles ในบริษัท
 * @param {string} companyId - ID ของบริษัท
 */
async function auditPayrollCycles(companyId) {
    console.log('🔍 Auditing payroll cycles...');
    
    try {
        // ต้องแก้ไข query ตามโครงสร้างจริง
        console.log(`
🔍 AUDIT INSTRUCTIONS:
1. ไปที่ Firebase Console
2. รัน query นี้ใน Console:

db.collection('payroll_cycles')
  .where('companyId', '==', '${companyId}')
  .get()
  .then((snapshot) => {
    console.log('Total cycles:', snapshot.size);
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      console.log('Cycle:', {
        id: doc.id,
        title: data.title,
        syncDeduct: data.syncDeduct,
        syncOT: data.syncOT,
        status: data.status
      });
    });
  });

3. ตรวจสอบ cycles ที่มี syncDeduct: false
4. ใช้ fixPayrollCycleSyncDeduct() เพื่อแก้ไข
        `);
        
    } catch (error) {
        console.error('❌ Error auditing cycles:', error);
    }
}

// ฟังก์ชันหลักสำหรับการใช้งาน
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fixPayrollCycleSyncDeduct,
        auditPayrollCycles
    };
}

// สำหรับรันใน browser console
if (typeof window !== 'undefined') {
    window.fixPayrollCycleSyncDeduct = fixPayrollCycleSyncDeduct;
    window.auditPayrollCycles = auditPayrollCycles;
}

// สำหรับรันโดยตรง
if (typeof process !== 'undefined' && process.argv) {
    const [companyId, cycleId] = process.argv.slice(2);
    
    if (!companyId) {
        console.log('❌ Please provide companyId');
        console.log('Usage: node fix_syncDeduct.js <companyId> [cycleId]');
        process.exit(1);
    }
    
    if (process.argv.includes('--audit')) {
        auditPayrollCycles(companyId);
    } else {
        fixPayrollCycleSyncDeduct(companyId, cycleId);
    }
}
