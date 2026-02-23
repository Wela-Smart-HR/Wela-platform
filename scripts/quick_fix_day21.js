/**
 * 🚨 Quick Fix สำหรับข้อมูลเก่าที่ผิด Schema
 * รันใน browser console ที่หน้า Reports
 */

window.quickFixDay21Data = async function() {
    try {
        const companyId = 'COMP-1768062566486';
        const dateStr = '2026-02-21';
        
        console.log('🔧 กำลังแก้ไขข้อมูลวันที่ 21...');
        
        // หา Firebase connection
        const db = await getFirebaseConnection();
        if (!db) {
            console.error('❌ ไม่พบ Firebase connection');
            return;
        }
        
        // ดึงข้อมูลที่ผิด Schema (ไม่มี shift_date)
        const { collection, query, where, getDocs, writeBatch, doc, setDoc, deleteDoc } = window.firebase.firestore;
        
        const wrongDataQuery = query(
            collection(db, 'attendance_logs'),
            where('company_id', '==', companyId)
        );
        
        const wrongSnap = await getDocs(wrongDataQuery);
        console.log(`📊 พบข้อมูลทั้งหมด: ${wrongSnap.size} รายการ`);
        
        const batch = writeBatch(db);
        let fixedCount = 0;
        
        wrongSnap.docs.forEach(docSnap => {
            const data = docSnap.data();
            
            // แปลง clock_in จาก String เป็น Timestamp
            let clockInTimestamp = null;
            if (data.clock_in) {
                if (typeof data.clock_in === 'string') {
                    clockInTimestamp = new Date(data.clock_in);
                } else if (data.clock_in.toDate) {
                    clockInTimestamp = data.clock_in.toDate();
                }
            }
            
            // สร้าง shift_date จาก clock_in
            const shiftDate = clockInTimestamp ? 
                clockInTimestamp.toISOString().split('T')[0] : 
                dateStr;
            
            // สร้าง ID ใหม่ตามมาตรฐาน
            const employeeId = data.employee_id;
            const newDocId = `${companyId}_${employeeId}_${shiftDate}`;
            const newDocRef = doc(db, 'attendance_logs', newDocId);
            
            // สร้าง payload ใหม่ที่ถูกต้อง
            const newPayload = {
                company_id: companyId,
                employee_id: employeeId,
                shift_date: shiftDate,
                clock_in: clockInTimestamp,
                clock_out: data.clock_out ? (typeof data.clock_out === 'string' ? new Date(data.clock_out) : data.clock_out) : null,
                status: data.status || (clockInTimestamp ? 'present' : 'absent'),
                timezone: data.timezone || 'Asia/Bangkok',
                is_migrated: false,
                source: 'mobile_app_fixed',
                fixed_schema: true,
                fixed_at: new Date()
            };
            
            // เพิ่มข้อมูลใหม่
            batch.set(newDocRef, newPayload, { merge: true });
            
            // ลบข้อมูลเก่า (ถ้า ID ไม่ใช่มาตรฐาน)
            if (!docSnap.id.includes(companyId) || !docSnap.id.includes(employeeId)) {
                batch.delete(docSnap.ref);
            }
            
            fixedCount++;
        });
        
        await batch.commit();
        console.log(`✅ แก้ไขข้อมูลสำเร็จ ${fixedCount} รายการ`);
        
        // รีเฟรชหน้าเพื่อดูผลลัพธ์
        console.log('🔄 กรุณารีเฟรชหน้าเพื่อดูผลลัพธ์');
        
    } catch (error) {
        console.error('❌ แก้ไขข้อมูลล้มเหลว:', error);
    }
};

console.log('🚀 Quick Fix Script Loaded!');
console.log('📋 รัน: quickFixDay21Data() เพื่อแก้ข้อมูลเก่าทันที!');
