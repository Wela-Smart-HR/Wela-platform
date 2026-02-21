/**
 * 🚨 แก้ไข Payload สำหรับแอปมือถือให้ตรงกับ Admin Schema
 * ให้ใช้โค้ดนี้ในแอปมือถือตอนบันทึกข้อมูล
 */

// 🎯 1. สร้าง Document ID ตามมาตรฐาน
const createAttendanceLogId = (companyId, employeeId, shiftDate) => {
    return `${companyId}_${employeeId}_${shiftDate}`;
};

// 🎯 2. สร้าง Payload ที่ตรงกับ Admin Schema
const createAttendancePayload = (companyId, employeeId, clockInTime, clockOutTime = null) => {
    const now = new Date();
    const shiftDate = clockInTime.toISOString().split('T')[0]; // YYYY-MM-DD
    
    return {
        // 📋 ฟิลด์ที่ Admin ใช้ Filter
        company_id: companyId,
        employee_id: employeeId,
        shift_date: shiftDate, // ← สำคัญ! Admin ใช้ตัวนี้ Filter
        
        // ⏰ ฟิลด์เวลา (ต้องเป็น Timestamp)
        clock_in: clockInTime, // ← ต้องเป็น Timestamp Object ไม่ใช่ String
        clock_out: clockOutTime, // ← ต้องเป็น Timestamp Object ไม่ใช่ String
        
        // 📊 ฟิลด์สถานะ
        status: clockInTime ? 'present' : 'absent',
        timezone: 'Asia/Bangkok',
        
        // 🏷️ ฟิลด์เสริม
        is_migrated: false,
        source: 'mobile_app',
        created_at: now,
        updated_at: now
    };
};

// 🎯 3. ฟังก์ชันบันทึกข้อมูลที่ถูกต้อง
const saveAttendanceToFirebase = async (companyId, employeeId, clockInTime, clockOutTime = null) => {
    try {
        // สร้าง payload ที่ถูกต้อง
        const payload = createAttendancePayload(companyId, employeeId, clockInTime, clockOutTime);
        
        // สร้าง ID ตามมาตรฐาน
        const documentId = createAttendanceLogId(companyId, employeeId, payload.shift_date);
        
        // บันทึกลง Firebase
        const docRef = doc(db, 'attendance_logs', documentId);
        await setDoc(docRef, payload, { merge: true });
        
        console.log('✅ บันทึกข้อมูลสำเร็จ:', documentId);
        return documentId;
        
    } catch (error) {
        console.error('❌ บันทึกข้อมูลล้มเหลว:', error);
        throw error;
    }
};

// 🎯 4. ตัวอย่างการใช้งานในแอปมือถือ
const exampleUsage = async () => {
    const companyId = 'COMP-1768062566486';
    const employeeId = 'LJI98sfXnya2bKDfUwe5frh8iux2';
    
    // สมมติว่าพนักงาน clock-in เวลา 09:33
    const clockInTime = new Date('2026-02-21T09:33:00+07:00');
    
    // บันทึกข้อมูล
    const docId = await saveAttendanceToFirebase(companyId, employeeId, clockInTime);
    
    console.log('📋 Document ID:', docId);
    // Output: "COMP-1768062566486_LJI98sfXnya2bKDfUwe5frh8iux2_2026-02-21"
};

// 🎯 5. แก้ไขข้อมูลเก่าที่ผิด Schema
const fixExistingData = async (companyId) => {
    try {
        console.log('🔧 กำลังแก้ไขข้อมูลเก่า...');
        
        // ดึงข้อมูลที่ผิด Schema
        const q = query(
            collection(db, 'attendance_logs'),
            where('company_id', '==', companyId),
            where('shift_date', '==', null) // ← หาข้อมูลที่ไม่มี shift_date
        );
        
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const employeeId = data.employee_id;
            
            // แปลง clock_in จาก String เป็น Timestamp
            let clockInTimestamp = null;
            if (data.clock_in && typeof data.clock_in === 'string') {
                clockInTimestamp = new Date(data.clock_in);
            } else if (data.clock_in && data.clock_in.toDate) {
                clockInTimestamp = data.clock_in.toDate();
            }
            
            // สร้าง shift_date จาก clock_in
            const shiftDate = clockInTimestamp ? 
                clockInTimestamp.toISOString().split('T')[0] : 
                new Date().toISOString().split('T')[0];
            
            // สร้าง ID ใหม่ตามมาตรฐาน
            const newDocId = `${companyId}_${employeeId}_${shiftDate}`;
            const newDocRef = doc(db, 'attendance_logs', newDocId);
            
            // อัปเดตข้อมูลใหม่
            batch.set(newDocRef, {
                ...data,
                shift_date: shiftDate,
                clock_in: clockInTimestamp,
                clock_out: data.clock_out ? (typeof data.clock_out === 'string' ? new Date(data.clock_out) : data.clock_out) : null,
                fixed_schema: true,
                fixed_at: new Date()
            }, { merge: true });
            
            // ลบข้อมูลเก่า
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        console.log('✅ แก้ไขข้อมูลเก่าสำเร็จ');
        
    } catch (error) {
        console.error('❌ แก้ไขข้อมูลเก่าล้มเหลว:', error);
    }
};

// 📋 สรุปสิ่งที่ต้องแก้:
console.log('🎯 สิ่งที่ต้องแก้ในแอปมือถือ:');
console.log('1. ✅ เพิ่มฟิลด์ shift_date: "YYYY-MM-DD"');
console.log('2. ✅ Document ID ใช้ format: ${companyId}_${employeeId}_${shiftDate}');
console.log('3. ✅ clock_in/clock_out ต้องเป็น Timestamp ไม่ใช่ String');
console.log('4. ✅ ใช้ setDoc แทน addDoc เพื่อควบคุม ID');
console.log('5. ✅ ใช้ { merge: true } เพื่อป้องกันข้อมูลซ้ำ');

// 🚀 Export functions สำหรับใช้งาน
export {
    createAttendanceLogId,
    createAttendancePayload,
    saveAttendanceToFirebase,
    fixExistingData
};
