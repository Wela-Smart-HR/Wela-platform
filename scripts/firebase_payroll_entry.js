/**
 * Firebase Payroll Data Entry - บันทึกไป Firebase จริงๆ
 * รันใน browser console โดยตรง
 * 
 * วิธีใช้:
 * 1. Copy โค้ดนี้ทั้งหมด
 * 2. Paste ใน browser console (F12)
 * 3. กด Enter
 * 4. รัน firebaseDataEntry()
 */

console.log('🎯 Firebase Payroll Data Entry Script Loaded!');

// ทำให้ฟังก์ชันเป็น Global
window.firebaseDataEntry = async function() {
    console.log('🚀 Starting Firebase Payroll Data Entry...');
    
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
        const monthInput = prompt('📅 กรุณาระบุเดือน (Format: YYYY-MM, เช่น 2026-02):');
        
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

        // 4. ข้อมูลจริงของพนักงาน
        const realEmployeeData = [
            {
                employeeId: 'LJI98sfXnya2bKDfUwe5frh8iux2',
                employeeName: 'เต้ย',
                entries: [
                    { date: '2026-02-02', checkIn: '09:33', checkOut: '17:15' },
                    { date: '2026-02-03', checkIn: '09:52', checkOut: '17:03' },
                    { date: '2026-02-04', checkIn: '09:49', checkOut: '-' },
                    { date: '2026-02-05', checkIn: '-', checkOut: '-' },
                    { date: '2026-02-06', checkIn: '09:46', checkOut: '17:10' },
                    { date: '2026-02-07', checkIn: '09:47', checkOut: '17:56' },
                    { date: '2026-02-08', checkIn: '09:43', checkOut: '18:21' },
                    { date: '2026-02-09', checkIn: '09:52', checkOut: '17:07' },
                    { date: '2026-02-10', checkIn: '09:45', checkOut: '17:08' }
                ]
            },
            {
                employeeId: 'Y0uY0mLvzva1VOeszzd8CXKtMiT2',
                employeeName: 'นุช',
                entries: [
                    { date: '2026-02-02', checkIn: '09:45', checkOut: '17:31' },
                    { date: '2026-02-03', checkIn: '09:39', checkOut: '17:11' },
                    { date: '2026-02-04', checkIn: '09:40', checkOut: '17:22' },
                    { date: '2026-02-05', checkIn: '-', checkOut: '-' },
                    { date: '2026-02-06', checkIn: '09:50', checkOut: '-' },
                    { date: '2026-02-07', checkIn: '09:47', checkOut: '-' },
                    { date: '2026-02-08', checkIn: '09:44', checkOut: '18:21' },
                    { date: '2026-02-09', checkIn: '09:32', checkOut: '17:20' },
                    { date: '2026-02-10', checkIn: '09:37', checkOut: '17:10' }
                ]
            },
            {
                employeeId: '57G16CeEv4PjWlmHuoXRyTIRrug1',
                employeeName: 'ปาย',
                entries: [
                    { date: '2026-02-06', checkIn: '11:40', checkOut: '17:17' },
                    { date: '2026-02-07', checkIn: '09:34', checkOut: '-' },
                    { date: '2026-02-08', checkIn: '09:52', checkOut: '18:28' }
                ]
            }
        ];

        // 5. แสดงคอนเฟิร์ม
        const totalEntries = realEmployeeData.reduce((sum, emp) => sum + emp.entries.length, 0);
        const confirmEntry = confirm(
            `🚨 ยืนยันการบันทึกข้อมูลจริงไป Firebase?\n\n` +
            `📅 เดือน: ${monthInput}\n` +
            `🏢 Company: ${companyId}\n` +
            `👥 พนักงาน: ${realEmployeeData.length} คน\n` +
            `📊 ข้อมูลที่จะบันทึก: ${totalEntries} รายการ\n\n` +
            `👤 พนักงาน: เต้ย, นุช, ปาย\n\n` +
            `⚠️ การดำเนินการนี้จะ:\n` +
            `• บันทึกข้อมูลจริงไป Firebase\n` +
            `• สร้าง deterministic IDs ป้องกันข้อมูลซ้ำ\n` +
            `• ใช้ batch processing ปลอดภัย\n\n` +
            `✅ พร้อมดำเนินการหรือไม่?`
        );

        if (!confirmEntry) {
            console.log('❌ ยกเลิกการบันทึกข้อมูล');
            return;
        }

        // 6. แสดง loading
        console.log('🔄 เริ่มการบันทึกข้อมูลจริงไป Firebase...');
        console.log(`📊 Target: ${monthInput} | Company: ${companyId}`);

        // 7. เรียกใช้ Firebase Entry
        const enteredCount = await runFirebaseDataEntry(companyId, realEmployeeData);

        // 8. แสดงผลลัพธ์
        if (enteredCount > 0) {
            alert(
                `✅ บันทึกข้อมูลจริงไป Firebase สำเร็จ!\n\n` +
                `📊 จำนวนรายการที่บันทึก: ${enteredCount}\n` +
                `📅 เดือน: ${monthInput}\n` +
                `👥 พนักงาน: เต้ย, นุช, ปาย\n\n` +
                `🔄 กรุณารีเฟรชหน้า Payroll และทดสอบอีกครั้ง\n` +
                `💡 ข้อมูลจริงๆ ของพนักงานควรจะปรากฏแล้ว`
            );
            
            console.log(`✅ Firebase Data Entry Complete: ${enteredCount} records entered`);
            console.log('🔄 กรุณารีเฟรชหน้าเพื่อดูข้อมูลใหม่');
            
            setTimeout(() => {
                if (confirm('🔄 ต้องการรีเฟรชหน้าเว็บทันทีหรือไม่?')) {
                    window.location.reload();
                }
            }, 1000);
            
        } else {
            alert(
                `ℹ️ ไม่มีข้อมูลที่ต้องบันทึก\n\n` +
                `📅 เดือน: ${monthInput}\n` +
                `🏢 Company: ${companyId}\n\n` +
                `🔄 ลองตรวจสอบข้อมูลใน Payroll อีกครั้ง`
            );
            
            console.log('ℹ️ No Firebase data to enter');
        }

    } catch (error) {
        console.error('❌ Firebase Data Entry Error:', error);
        alert(
            `❌ เกิดข้อผิดพลาดในการบันทึกข้อมูลจริง\n\n` +
            `📝 Error: ${error.message}\n\n` +
            `🔧 กรุณา:\n` +
            `1. ตรวจสอบ console log ด้านล่าง\n` +
            `2. แจ้งทีม support\n` +
            `3. ลองใหม่อีกครั้งในภายหลัง`
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

// ฟังก์ชันคำนวณสถานะ
function calculateStatus(checkIn) {
    if (checkIn === '-') return { status: 'absent', lateMinutes: 0 };
    
    const [hours, minutes] = checkIn.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const workStartMinutes = 8 * 60 + 30; // 08:30
    
    if (totalMinutes <= workStartMinutes) {
        return { status: 'present', lateMinutes: 0 };
    } else {
        const lateMinutes = totalMinutes - workStartMinutes;
        return { status: 'late', lateMinutes: lateMinutes };
    }
}

// ฟังก์ชันเชื่อมต่อ Firebase แบบ Advanced
async function getFirebaseConnection() {
    try {
        console.log('🔍 กำลังหา Firebase connection...');
        
        // 1. ลองหาจาก window object หลายทาง
        let db = null;
        
        // ลองจาก window.firebase
        if (window.firebase && window.firebase.firestore) {
            db = window.firebase.firestore();
            console.log('✅ Found Firebase via window.firebase');
            return db;
        }
        
        // ลองจาก window.firestore
        if (window.firestore) {
            db = window.firestore;
            console.log('✅ Found Firestore via window.firestore');
            return db;
        }
        
        // ลองจาก window.db
        if (window.db) {
            db = window.db;
            console.log('✅ Found DB via window.db');
            return db;
        }
        
        // 2. ลองหาจาก React app context
        try {
            // หาจาก React DevTools
            if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
                const reactRoot = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers?.[0];
                if (reactRoot) {
                    // พยายามดึง Firebase จาก React component
                    const fiberRoot = document.querySelector('[data-reactroot]')?._reactInternalFiber;
                    if (fiberRoot) {
                        // ค้นหา Firebase ใน component tree
                        const findFirebase = (fiber) => {
                            if (!fiber) return null;
                            if (fiber.stateNode && fiber.stateNode.db) {
                                return fiber.stateNode.db;
                            }
                            return findFirebase(fiber.child) || findFirebase(fiber.sibling);
                        };
                        db = findFirebase(fiberRoot);
                        if (db) {
                            console.log('✅ Found Firebase via React component');
                            return db;
                        }
                    }
                }
            }
        } catch (e) {
            console.log('❌ Could not find Firebase via React DevTools');
        }
        
        // 3. ลองหาจาก script tags
        try {
            const scripts = Array.from(document.scripts);
            for (const script of scripts) {
                if (script.textContent && script.textContent.includes('firebase')) {
                    console.log('🔍 Found Firebase script, trying to extract...');
                    // พยายาม extract Firebase จาก script content
                    const match = script.textContent.match(/window\.(firebase|db|firestore)\s*=\s*(.+)/);
                    if (match) {
                        try {
                            const firebaseInstance = eval(`(${match[2]})`);
                            if (firebaseInstance.firestore) {
                                db = firebaseInstance.firestore();
                                console.log('✅ Found Firebase via script evaluation');
                                return db;
                            }
                        } catch (e) {
                            console.log('❌ Could not evaluate Firebase from script');
                        }
                    }
                }
            }
        } catch (e) {
            console.log('❌ Could not find Firebase in scripts');
        }
        
        // 4. ลองโหลด Firebase SDK แบบ dynamic
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
        
        // โหลด Firebase App SDK
        await loadScript('https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js');
        // โหลด Firebase Firestore SDK
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

// ฟังก์ชันบันทึกข้อมูลไป Firebase
async function runFirebaseDataEntry(companyId, employeeData) {
    console.log('🔄 Running Firebase data entry...');
    
    try {
        // 1. เชื่อมต่อ Firebase
        const db = await getFirebaseConnection();
        if (!db) {
            throw new Error('ไม่สามารถเชื่อมต่อ Firebase ได้');
        }

        console.log('✅ Connected to Firebase');

        let totalEntered = 0;
        const chunkSize = 499; // Firestore batch limit
        const allRecords = [];

        // 2. เตรียมข้อมูลทั้งหมด
        for (const employee of employeeData) {
            console.log(`📝 Preparing Firebase data for ${employee.employeeName}...`);
            
            for (const entry of employee.entries) {
                const statusInfo = calculateStatus(entry.checkIn);
                
                const logData = {
                    company_id: companyId,
                    employee_id: employee.employeeId,
                    shift_date: entry.date,
                    clock_in: entry.checkIn !== '-' ? parseTimeToDate(entry.date, entry.checkIn) : null,
                    clock_out: entry.checkOut !== '-' ? parseTimeToDate(entry.date, entry.checkOut) : null,
                    status: statusInfo.status,
                    late_minutes: statusInfo.lateMinutes,
                    clock_in_location: null,
                    timezone: 'Asia/Bangkok',
                    manually_entered: true,
                    entered_at: new Date(),
                    is_migrated: true,
                    source: 'firebase_real_data'
                };

                allRecords.push(logData);
            }
        }

        console.log(`📊 Prepared ${allRecords.length} records for Firebase`);

        // 3. บันทึกแบบ batch
        for (let i = 0; i < allRecords.length; i += chunkSize) {
            const chunk = allRecords.slice(i, i + chunkSize);
            const batch = db.batch();

            for (const record of chunk) {
                const deterministicId = `${record.company_id}_${record.employee_id}_${record.shift_date}`;
                const docRef = db.collection('attendance_logs').doc(deterministicId);
                batch.set(docRef, record, { merge: true });
            }

            await batch.commit();
            totalEntered += chunk.length;
            console.log(`✅ Committed chunk: ${chunk.length} | Total: ${totalEntered}/${allRecords.length}`);
        }

        console.log(`✅ Firebase Data Entry Complete: ${totalEntered} records entered`);
        return totalEntered;

    } catch (error) {
        console.error("Firebase Data Entry Error:", error);
        throw error;
    }
}

// ฟังก์ชันแปลงเวลาเป็น Date object
function parseTimeToDate(dateStr, timeStr) {
    try {
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, minutes] = timeStr.split(':').map(Number);
        
        // สร้าง Date object ใน timezone ของบริษัท
        const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
        return date;
    } catch (error) {
        console.error('Error parsing time:', error);
        return new Date();
    }
}

// ฟังก์ชันตรวจสอบสถานะ
window.checkFirebaseEntryStatus = function() {
    console.log('🔍 ตรวจสอบสถานะ Firebase Data Entry...');
    console.log('📋 คำสั่งที่ใช้ได้:');
    console.log('• firebaseDataEntry() - บันทึกข้อมูลจริงไป Firebase');
    console.log('• checkFirebaseEntryStatus() - ตรวจสอบสถานะ');
    console.log('💡 รัน firebaseDataEntry() เพื่อเริ่มการบันทึกข้อมูลจริงไป Firebase');
};

console.log('🎯 Firebase Payroll Data Entry Tools Loaded!');
console.log('📋 คำสั่งที่ใช้ได้:');
console.log('• firebaseDataEntry() - บันทึกข้อมูลจริงไป Firebase');
console.log('• checkFirebaseEntryStatus() - ตรวจสอบสถานะ');
console.log('🚀 พร้อมใช้งาน! บันทึกไป Firebase จริงๆ');
