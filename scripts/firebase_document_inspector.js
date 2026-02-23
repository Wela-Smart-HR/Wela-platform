/**
 * Firebase Document Inspector - ตรวจสอบข้อมูลจริงใน attendance_logs
 * รันใน browser console โดยตรง
 * 
 * วิธีใช้:
 * 1. Copy โค้ดนี้ทั้งหมด
 * 2. Paste ใน browser console (F12)
 * 3. กด Enter
 * 4. รัน inspectAttendanceLogs()
 */

console.log('🔍 Firebase Document Inspector Loaded!');

// ทำให้ฟังก์ชันเป็น Global
window.inspectAttendanceLogs = async function() {
    console.log('🔍 Starting Firebase Document Inspection...');
    
    try {
        // 1. ดึง Company ID
        let companyId = await getCompanyIdFromPage();
        
        if (!companyId || companyId === 'demo-company') {
            companyId = prompt('🏢 กรุณาใส่ Company ID ของคุณ (เช่น: COMP-1768062566486):');
            if (!companyId) {
                console.log('❌ ยกเลิกการทำงาน');
                return;
            }
        }
        
        console.log('🏢 Company ID:', companyId);

        // 2. ให้ user เลือกเดือน
        const monthInput = prompt('📅 กรุณาระบุเดือนที่ต้องตรวจสอบ (Format: YYYY-MM, เช่น 2026-02):');
        
        if (!monthInput) {
            console.log('❌ ยกเลิกการทำงาน');
            return;
        }

        // 3. แปลงเป็น Date object
        const [year, month] = monthInput.split('-').map(Number);
        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            alert('❌ Format ไม่ถูกต้อง กรุณาระบุเป็น YYYY-MM (เช่น 2026-02)');
            return;
        }

        // 4. ตรวจสอบข้อมูลจริง
        await inspectRealAttendanceLogs(companyId, monthInput, year, month);

    } catch (error) {
        console.error('❌ Inspection Error:', error);
        alert(
            `❌ เกิดข้อผิดพลาดในการตรวจสอบ\n\n` +
            `📝 Error: ${error.message}\n\n` +
            `🔧 กรุณาตรวจสอบ console log ด้านล่าง`
        );
    }
};

// ฟังก์ชันดึง Company ID
async function getCompanyIdFromPage() {
    try {
        // 1. ลองจาก localStorage
        const authUser = localStorage.getItem('authUser');
        if (authUser) {
            const user = JSON.parse(authUser);
            if (user.companyId) {
                console.log('✅ Found companyId in localStorage:', user.companyId);
                return user.companyId;
            }
        }
        
        // 2. ลองจาก localStorage แบบอื่น
        const userKey = Object.keys(localStorage).find(key => 
            key.toLowerCase().includes('user') || key.toLowerCase().includes('auth')
        );
        if (userKey) {
            const userData = localStorage.getItem(userKey);
            if (userData) {
                const user = JSON.parse(userData);
                if (user.companyId) {
                    console.log('✅ Found companyId in', userKey, ':', user.companyId);
                    return user.companyId;
                }
            }
        }
        
        // 3. ลองจาก global window object
        if (window.currentUser && window.currentUser.companyId) {
            console.log('✅ Found companyId in window.currentUser:', window.currentUser.companyId);
            return window.currentUser.companyId;
        }
        
        console.log('❌ Could not find companyId automatically');
        return null;
        
    } catch (error) {
        console.error('Error getting company ID:', error);
        return null;
    }
}

// ฟังก์ชันตรวจสอบข้อมูลจริง
async function inspectRealAttendanceLogs(companyId, monthInput, year, month) {
    try {
        console.log('🔍 กำลังตรวจสอบข้อมูลจริงใน Firebase...');
        
        // 1. เชื่อมต่อ Firebase
        const db = await getFirebaseConnection();
        if (!db) {
            throw new Error('ไม่สามารถเชื่อมต่อ Firebase ได้');
        }

        console.log('✅ Connected to Firebase');

        // 2. สร้างช่วงวันที่ 1-10
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-10`;
        
        console.log(`📅 กำลังค้นหาข้อมูลวันที่ ${startDate} ถึง ${endDate}`);

        // 3. ค้นหาข้อมูลใน attendance_logs
        const attendanceLogsQuery = query(
            collection(db, 'attendance_logs'),
            where('company_id', '==', companyId),
            where('shift_date', '>=', startDate),
            where('shift_date', '<=', endDate)
        );

        const querySnapshot = await getDocs(attendanceLogsQuery);
        
        console.log(`📊 พบข้อมูลทั้งหมด: ${querySnapshot.docs.length} รายการ`);

        if (querySnapshot.docs.length === 0) {
            console.log('❌ ไม่พบข้อมูลใน attendance_logs');
            
            // ลองค้นใน collection เก่า
            console.log('🔍 กำลังค้นหาใน collection เก่า (attendance)...');
            await inspectLegacyAttendance(db, companyId, startDate, endDate);
            return;
        }

        // 4. จัดกลุ่มข้อมูลตามพนักงาน
        const employeeData = {};
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const employeeId = data.employee_id;
            
            if (!employeeData[employeeId]) {
                employeeData[employeeId] = {
                    employeeId: employeeId,
                    documents: []
                };
            }
            
            employeeData[employeeId].documents.push({
                id: doc.id,
                data: data
            });
        });

        // 5. แสดงผลลัพธ์
        console.log('📋 สรุปข้อมูลที่พบ:');
        console.log('='.repeat(50));
        
        Object.keys(employeeData).forEach((employeeId) => {
            const employee = employeeData[employeeId];
            console.log(`\n👤 พนักงาน: ${employeeId}`);
            console.log(`📊 จำนวนรายการ: ${employee.documents.length}`);
            
            // แสดงรายละเอียดแรกเป็นตัวอย่าง
            if (employee.documents.length > 0) {
                const firstDoc = employee.documents[0];
                console.log('📄 ตัวอย่าง Document:');
                console.log('   ID:', firstDoc.id);
                console.log('   Data:', JSON.stringify(firstDoc.data, null, 2));
                
                // แสดง format ของ clock_in
                const clockIn = firstDoc.data.clock_in;
                console.log('⏰ clock_in format:');
                console.log('   Type:', typeof clockIn);
                console.log('   Value:', clockIn);
                console.log('   Is Timestamp:', clockIn && typeof clockIn.toDate === 'function');
                
                if (clockIn && typeof clockIn.toDate === 'function') {
                    console.log('   toDate():', clockIn.toDate());
                    console.log('   toDate().toISOString():', clockIn.toDate().toISOString());
                }
            }
            
            // แสดงรายการทั้งหมดแบบสรุป
            console.log('📅 รายการทั้งหมด:');
            employee.documents.forEach((doc, index) => {
                const data = doc.data;
                const clockInStr = data.clock_in ? 
                    (typeof data.clock_in.toDate === 'function' ? 
                        data.clock_in.toDate().toISOString() : 
                        data.clock_in) : 'null';
                console.log(`   ${index + 1}. ${data.shift_date}: ${clockInStr} (${data.status || 'N/A'})`);
            });
        });

        // 6. แสดงสรุป
        const totalEmployees = Object.keys(employeeData).length;
        const totalRecords = querySnapshot.docs.length;
        
        console.log('\n' + '='.repeat(50));
        console.log('📊 สรุปการตรวจสอบ:');
        console.log(`🏢 Company: ${companyId}`);
        console.log(`📅 ช่วงวันที่: ${startDate} ถึง ${endDate}`);
        console.log(`👥 พนักงานที่พบ: ${totalEmployees} คน`);
        console.log(`📄 รายการทั้งหมด: ${totalRecords} รายการ`);
        console.log(`📂 Collection: attendance_logs`);
        console.log('='.repeat(50));

        // 7. แสดงคำแนะนำ
        if (totalRecords > 0) {
            console.log('\n✅ ข้อมูลถูก migrate มาอยู่ใน attendance_logs แล้ว!');
            console.log('💡 ปัญหาอาจเกิดจาก timezone filtering ใน payroll.repo.js');
            console.log('🔧 ลองตรวจสอบ dayjs filtering logic ใน createCycle()');
        } else {
            console.log('\n❌ ไม่พบข้อมูลใน attendance_logs');
            console.log('🔍 กำลังตรวจสอบ collection เก่า (attendance)...');
        }

    } catch (error) {
        console.error('Error inspecting attendance logs:', error);
        throw error;
    }
}

// ฟังก์ชันตรวจสอบ collection เก่า
async function inspectLegacyAttendance(db, companyId, startDate, endDate) {
    try {
        console.log('🔍 กำลังตรวจสอบ collection เก่า (attendance)...');
        
        const attendanceQuery = query(
            collection(db, 'attendance'),
            where('company_id', '==', companyId),
            where('shift_date', '>=', startDate),
            where('shift_date', '<=', endDate)
        );

        const querySnapshot = await getDocs(attendanceQuery);
        
        console.log(`📊 พบข้อมูลใน collection เก่า: ${querySnapshot.docs.length} รายการ`);

        if (querySnapshot.docs.length > 0) {
            console.log('📄 ตัวอย่าง Document จาก collection เก่า:');
            const firstDoc = querySnapshot.docs[0];
            console.log('   ID:', firstDoc.id);
            console.log('   Data:', JSON.stringify(firstDoc.data(), null, 2));
            
            console.log('\n💡 ข้อมูลอยู่ใน collection เก่า (attendance) ยังไม่ถูก migrate');
            console.log('🔧 ต้องรัน migration service เพื่อย้ายข้อมูลมา attendance_logs');
        } else {
            console.log('❌ ไม่พบข้อมูลใน collection เก่าด้วย');
            console.log('🤔 อาจจะไม่มีข้อมูลจริงในช่วงวันที่ 1-10');
        }

    } catch (error) {
        console.error('Error inspecting legacy attendance:', error);
        throw error;
    }
}

// ฟังก์ชันเชื่อมต่อ Firebase
async function getFirebaseConnection() {
    try {
        console.log('🔍 กำลังหา Firebase connection...');
        
        let db = null;
        
        // 1. ลองจาก window.firebase
        if (window.firebase && window.firebase.firestore) {
            db = window.firebase.firestore();
            console.log('✅ Found Firebase via window.firebase');
            return db;
        }
        
        // 2. ลองจาก window.firestore
        if (window.firestore) {
            db = window.firestore;
            console.log('✅ Found Firestore via window.firestore');
            return db;
        }
        
        // 3. ลองจาก window.db
        if (window.db) {
            db = window.db;
            console.log('✅ Found DB via window.db');
            return db;
        }
        
        // 4. ลองโหลด Firebase SDK
        console.log('🔄 Trying to load Firebase SDK dynamically...');
        await loadFirebaseSDK();
        
        if (window.firebase && window.firebase.firestore) {
            db = window.firebase.firestore();
            console.log('✅ Firebase loaded dynamically');
            return db;
        }
        
        console.log('❌ Could not find Firebase connection');
        return null;
        
    } catch (error) {
        console.error('Error getting Firebase connection:', error);
        return null;
    }
}

// ฟังก์ชันโหลด Firebase SDK
async function loadFirebaseSDK() {
    try {
        console.log('🔄 Loading Firebase SDK...');
        
        await loadScript('https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js');
        await loadScript('https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js');
        
        console.log('✅ Firebase SDK loaded');
        
    } catch (error) {
        console.error('Error loading Firebase SDK:', error);
        throw error;
    }
}

// ฟังก์ชันโหลด script แบบ async
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ฟังก์ชันตรวจสอบสถานะ
window.checkInspectionStatus = function() {
    console.log('🔍 ตรวจสอบสถานะ Firebase Document Inspector...');
    console.log('📋 คำสั่งที่ใช้ได้:');
    console.log('• inspectAttendanceLogs() - ตรวจสอบข้อมูลจริงใน attendance_logs');
    console.log('• checkInspectionStatus() - ตรวจสอบสถานะ');
    console.log('💡 รัน inspectAttendanceLogs() เพื่อดูข้อมูลจริงใน Firebase');
};

console.log('🔍 Firebase Document Inspector Tools Loaded!');
console.log('📋 คำสั่งที่ใช้ได้:');
console.log('• inspectAttendanceLogs() - ตรวจสอบข้อมูลจริงใน attendance_logs');
console.log('• checkInspectionStatus() - ตรวจสอบสถานะ');
console.log('🚀 พร้อมใช้งาน! ตรวจสอบข้อมูลจริงใน Firebase');
