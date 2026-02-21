/**
 * Debug Script for Day 21 Attendance Issue
 * รันใน browser console เพื่อตรวจสอบข้อมูลวันที่ 21
 */

console.log('🔍 Debug Script for Day 21 Attendance Issue');

// 1. ตรวจสอบข้อมูลใน attendance_logs สำหรับวันที่ 21
window.checkDay21Data = async function() {
    try {
        const companyId = 'COMP-1768062566486';
        const dateStr = '2026-02-21';
        
        console.log(`🔍 กำลังตรวจสอบข้อมูลวันที่ ${dateStr} สำหรับบริษัท ${companyId}`);
        
        // ดึงข้อมูลจาก attendance_logs
        const db = window.firebase?.firestore() || window.firestore || window.db;
        if (!db) {
            console.error('❌ ไม่พบ Firebase connection');
            return;
        }
        
        const { collection, query, where, getDocs } = window.firebase?.firestore || window.firestore;
        
        const logsQuery = query(
            collection(db, "attendance_logs"),
            where("company_id", "==", companyId),
            where("shift_date", "==", dateStr)
        );
        
        const logsSnap = await getDocs(logsQuery);
        
        console.log(`📊 พบข้อมูลใน attendance_logs: ${logsSnap.size} รายการ`);
        
        if (logsSnap.size > 0) {
            logsSnap.docs.forEach((doc, index) => {
                const data = doc.data();
                console.log(`📋 รายการที่ ${index + 1}:`, {
                    employee_id: data.employee_id,
                    shift_date: data.shift_date,
                    clock_in: data.clock_in,
                    clock_out: data.clock_out,
                    status: data.status,
                    is_migrated: data.is_migrated,
                    source: data.source
                });
            });
        } else {
            console.log('❌ ไม่พบข้อมูลใน attendance_logs สำหรับวันที่ 21');
            
            // ลองตรวจสอบวันที่อื่นๆ เพื่อเปรียบเทียบ
            console.log('🔍 ลองตรวจสอบวันที่ 20 เพื่อเปรียบเทียบ...');
            const compareQuery = query(
                collection(db, "attendance_logs"),
                where("company_id", "==", companyId),
                where("shift_date", "==", "2026-02-20")
            );
            const compareSnap = await getDocs(compareQuery);
            console.log(`📊 วันที่ 20: พบ ${compareSnap.size} รายการ`);
        }
        
        // ตรวจสอบว่ามีพนักงานคนไหนบ้างในระบบ
        console.log('👥 ตรวจสอบรายชื่อพนักงาน...');
        const usersQuery = query(
            collection(db, "users"),
            where("companyId", "==", companyId),
            where("role", "==", "employee")
        );
        const usersSnap = await getDocs(usersQuery);
        console.log(`👥 พบพนักงานทั้งหมด: ${usersSnap.size} คน`);
        
        usersSnap.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`👤 พนักงานที่ ${index + 1}:`, {
                id: doc.id,
                name: data.name,
                status: data.status
            });
        });
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error);
    }
};

// 2. ตรวจสอบข้อมูลในตารางเก่า (ถ้ามี)
window.checkLegacyData = async function() {
    try {
        const companyId = 'COMP-1768062566486';
        const dateStr = '2026-02-21';
        
        console.log(`🔍 ตรวจสอบข้อมูลเก่าวันที่ ${dateStr}`);
        
        const db = window.firebase?.firestore() || window.firestore || window.db;
        const { collection, query, where, getDocs } = window.firebase?.firestore || window.firestore;
        
        // ตรวจสอบใน daily_attendance
        const dailyQuery = query(
            collection(db, "companies", companyId, "daily_attendance"),
            where("date", "==", dateStr)
        );
        
        const dailySnap = await getDocs(dailyQuery);
        console.log(`📊 daily_attendance: พบ ${dailySnap.size} รายการ`);
        
        if (dailySnap.size > 0) {
            dailySnap.docs.forEach(doc => {
                const data = doc.data();
                console.log('📋 ข้อมูล daily_attendance:', data);
            });
        }
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error);
    }
};

console.log('🚀 Debug Script Loaded!');
console.log('📋 คำสั่งที่ใช้:');
console.log('• checkDay21Data() - ตรวจสอบข้อมูลวันที่ 21');
console.log('• checkLegacyData() - ตรวจสอบข้อมูลเก่า');
console.log('🔍 รัน checkDay21Data() เพื่อหาสาเหตุ!');
