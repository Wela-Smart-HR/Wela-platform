/**
 * Enhanced Debug Script for Day 21 - React Compatible
 * รันใน browser console สำหรับ React + Vite project
 */

console.log('🔍 Enhanced Debug Script for Day 21 (React Compatible)');

// ฟังก์ชันหา Firebase connection แบบพิเศษสำหรับ React
async function getFirebaseConnection() {
    try {
        let db = null;
        
        // 1. ลองจาก window.firebase (ถ้ามี)
        if (window.firebase && window.firebase.firestore) {
            db = window.firebase.firestore();
            console.log('✅ Found Firebase via window.firebase');
            return db;
        }
        
        // 2. ลองจาก window.firestore (ถ้ามี)
        if (window.firestore) {
            db = window.firestore;
            console.log('✅ Found Firestore via window.firestore');
            return db;
        }
        
        // 3. ลองจาก window.db (ถ้ามี)
        if (window.db) {
            db = window.db;
            console.log('✅ Found DB via window.db');
            return db;
        }
        
        // 4. ลองจาก React DevTools (วิธีพิเศษ)
        try {
            const reactApp = document.querySelector('[data-reactroot]') || document.querySelector('#root');
            if (reactApp && reactApp._reactInternalInstance) {
                const fiber = reactApp._reactInternalInstance;
                const component = fiber.return || fiber.child;
                if (component && component.stateNode && component.stateNode.props) {
                    // ลองหา Firebase ใน React component context
                    const context = component.stateNode.props;
                    if (context.db) {
                        db = context.db;
                        console.log('✅ Found Firebase via React DevTools');
                        return db;
                    }
                }
            }
        } catch (e) {
            console.log('❌ React DevTools method failed:', e.message);
        }
        
        // 5. ลองโหลด Firebase SDK แบบ dynamic
        console.log('🔄 Trying to load Firebase SDK dynamically...');
        await loadFirebaseSDK();
        
        if (window.firebase && window.firebase.firestore) {
            // ต้อง initialize app ก่อน
            const firebaseConfig = {
                apiKey: "AIzaSyBkZ7P2Y8c8QFjrHnWx2vT9sU3V4X5Y6Z7",
                authDomain: "wela-platform.firebaseapp.com",
                projectId: "wela-platform",
                storageBucket: "wela-platform.firebasestorage.app",
                messagingSenderId: "123456789",
                appId: "1:123456789:web:abcdef"
            };
            
            if (!window.firebase.apps.length) {
                window.firebase.initializeApp(firebaseConfig);
            }
            
            db = window.firebase.firestore();
            console.log('✅ Firebase loaded and initialized dynamically');
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

// ฟังก์ชันตรวจสอบข้อมูลวันที่ 21 (Enhanced)
window.checkDay21Data = async function() {
    try {
        const companyId = 'COMP-1768062566486';
        const dateStr = '2026-02-21';
        
        console.log(`🔍 กำลังตรวจสอบข้อมูลวันที่ ${dateStr} สำหรับบริษัท ${companyId}`);
        
        // ใช้วิธีพิเศษหา Firebase connection
        const db = await getFirebaseConnection();
        if (!db) {
            console.error('❌ ไม่พบ Firebase connection - ลองวิธีอื่น');
            
            // แสดงวิธีแก้ไข
            console.log('💡 วิธีแก้ไข:');
            console.log('1. ลองรันในหน้าที่มีการเชื่อมต่อ Firebase (เช่น หน้า Payroll, Reports)');
            console.log('2. ตรวจสอบว่า React app โหลดเสร็จแล้ว');
            console.log('3. ลองรีเฟรชหน้าแล้วรันใหม่');
            console.log('4. ตรวจสอบว่า .env มีค่า Firebase config ถูกต้อง');
            return;
        }
        
        console.log('✅ เชื่อมต่อ Firebase สำเร็จ');
        
        // ใช้ Firestore functions จาก SDK ที่โหลดแบบ dynamic
        const { collection, query, where, getDocs } = db.collection ? 
            { collection: (path) => db.collection(path), query: db.query, where: db.where, getDocs: db.getDocs } :
            window.firebase.firestore;
        
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

// ฟังก์ชันตรวจสอบสถานะ Firebase
window.checkFirebaseStatus = function() {
    console.log('🔍 ตรวจสอบสถานะ Firebase:');
    console.log('window.firebase:', window.firebase);
    console.log('window.firestore:', window.firestore);
    console.log('window.db:', window.db);
    
    // ตรวจสอบ React DevTools
    try {
        const reactApp = document.querySelector('[data-reactroot]') || document.querySelector('#root');
        if (reactApp) {
            console.log('React app found:', reactApp);
        } else {
            console.log('React app not found');
        }
    } catch (e) {
        console.log('React DevTools check failed:', e.message);
    }
};

console.log('🚀 Enhanced Debug Script Loaded!');
console.log('📋 คำสั่งที่ใช้:');
console.log('• checkFirebaseStatus() - ตรวจสอบสถานะ Firebase');
console.log('• checkDay21Data() - ตรวจสอบข้อมูลวันที่ 21');
console.log('💡 ถ้ายังไม่ได้ ลองรัน checkFirebaseStatus() ก่อน!');
