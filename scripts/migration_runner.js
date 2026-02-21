/**
 * Migration Runner - รัน Migration Script สำหรับย้ายข้อมูลวันที่ 1-10
 * รันใน browser console โดยตรง
 * 
 * วิธีใช้:
 * 1. Copy โค้ดนี้ทั้งหมด
 * 2. Paste ใน browser console (F12)
 * 3. กด Enter
 * 4. รัน runMigrationForMissingData()
 */

console.log('🚀 Migration Runner for Missing Data Loaded!');

// ทำให้ฟังก์ชันเป็น Global
window.runMigrationForMissingData = async function() {
    console.log('🚀 Starting Migration for Missing Data (Days 1-10)...');
    
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
        const monthInput = prompt('📅 กรุณาระบุเดือนที่ต้อง migrate (Format: YYYY-MM, เช่น 2026-02):');
        
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

        // 4. แสดงคอนเฟิร์ม
        const confirmMigration = confirm(
            `🚨 ยืนยันการ Migration ข้อมูลวันที่ 1-10?\n\n` +
            `📅 เดือน: ${monthInput}\n` +
            `🏢 Company: ${companyId}\n\n` +
            `⚠️ การดำเนินการนี้จะ:\n` +
            `• ดึงข้อมูลจาก collection เก่า (attendance)\n` +
            `• ย้ายข้อมูลไป collection ใหม่ (attendance_logs)\n` +
            `• ใช้ deterministic IDs ป้องนข้อมูลซ้ำ\n` +
            `• แก้ไข timezone bugs อัตโนมัติ\n\n` +
            `✅ พร้อมดำเนินการหรือไม่?`
        );

        if (!confirmMigration) {
            console.log('❌ ยกเลิกการ Migration');
            return;
        }

        // 5. รัน Migration
        const migratedCount = await runMigration(companyId, monthInput, year, month);

        // 6. แสดงผลลัพธ์
        if (migratedCount > 0) {
            alert(
                `✅ Migration สำเร็จ!\n\n` +
                `📊 จำนวนรายการที่ migrate: ${migratedCount}\n` +
                `📅 เดือน: ${monthInput}\n` +
                `🏢 Company: ${companyId}\n\n` +
                `🔄 กรุณารีเฟรชหน้า Payroll และทดสอบอีกครั้ง\n` +
                `💡 ข้อมูลวันที่ 1-10 ควรจะปรากฏแล้ว`
            );
            
            console.log(`✅ Migration Complete: ${migratedCount} records migrated`);
            console.log('🔄 กรุณารีเฟรชหน้าเพื่อดูข้อมูลใหม่');
            
            setTimeout(() => {
                if (confirm('🔄 ต้องการรีเฟรชหน้าเว็บทันทีหรือไม่?')) {
                    window.location.reload();
                }
            }, 1000);
            
        } else {
            alert(
                `ℹ️ ไม่มีข้อมูลที่ต้อง migrate\n\n` +
                `📅 เดือน: ${monthInput}\n` +
                `🏢 Company: ${companyId}\n\n` +
                `🔄 ข้อมูลอาจถูก migrate ไปแล้ว`
            );
            
            console.log('ℹ️ No data to migrate');
        }

    } catch (error) {
        console.error('❌ Migration Error:', error);
        alert(
            `❌ เกิดข้อผิดพลาดในการ Migration\n\n` +
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

// ฟังก์ชันรัน Migration จริง
async function runMigration(companyId, monthInput, year, month) {
    try {
        console.log('🔄 Starting Migration Process...');
        
        // 1. เชื่อมต่อ Firebase
        const db = await getFirebaseConnection();
        if (!db) {
            throw new Error('ไม่สามารถเชื่อมต่อ Firebase ได้');
        }

        console.log('✅ Connected to Firebase');

        // 2. คำนวณช่วงวันที่
        const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endStr = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        
        console.log(`📅 Migrating data from ${startStr} to ${endStr}`);

        // 3. ดึงข้อมูลจาก collection เก่า (attendance)
        console.log('🔍 Fetching data from legacy collection (attendance)...');
        const legacyQuery = query(
            collection(db, 'attendance'),
            where('company_id', '==', companyId),
            where('shift_date', '>=', startStr),
            where('shift_date', '<=', endStr)
        );

        const legacySnapshot = await getDocs(legacyQuery);
        console.log(`📊 Found ${legacySnapshot.docs.length} records in legacy collection`);

        if (legacySnapshot.docs.length === 0) {
            console.log('❌ No data found in legacy collection');
            return 0;
        }

        // 4. ตรวจสอบว่าข้อมูลถูก migrate ไปแล้วหรือไม่
        console.log('🔍 Checking for already migrated records...');
        const existingIds = new Set();
        
        // ตรวจสอบจาก attendance_logs ว่ามีอะไรอยู่แล้ว
        for (const doc of legacySnapshot.docs) {
            const data = doc.data();
            const deterministicId = `${companyId}_${data.employee_id}_${data.shift_date}`;
            existingIds.add(deterministicId);
        }

        const existingQuery = query(
            collection(db, 'attendance_logs'),
            where('__name__', 'in', Array.from(existingIds).slice(0, 10)) // Firestore limit 10
        );
        
        const existingSnapshot = await getDocs(existingQuery);
        const alreadyMigrated = new Set();
        existingSnapshot.docs.forEach(doc => {
            alreadyMigrated.add(doc.id);
        });

        console.log(`📊 Found ${alreadyMigrated.size} already migrated records`);

        // 5. Migration Logic
        let migratedCount = 0;
        const chunkSize = 499; // Firestore batch limit
        const toMigrate = [];

        for (const doc of legacySnapshot.docs) {
            const data = doc.data();
            const deterministicId = `${companyId}_${data.employee_id}_${data.shift_date}`;
            
            // ข้ามถ้า migrate ไปแล้ว
            if (alreadyMigrated.has(deterministicId)) {
                continue;
            }

            // สร้างข้อมูลใหม่
            const logData = await processLegacyRecord(data, companyId);
            toMigrate.push({ id: deterministicId, data: logData });
        }

        console.log(`📊 Need to migrate ${toMigrate.length} records`);

        // 6. Batch Write
        for (let i = 0; i < toMigrate.length; i += chunkSize) {
            const chunk = toMigrate.slice(i, i + chunkSize);
            const batch = writeBatch(db);

            for (const record of chunk) {
                const docRef = doc(db, 'attendance_logs', record.id);
                batch.set(docRef, record.data, { merge: true });
            }

            await batch.commit();
            migratedCount += chunk.length;
            console.log(`✅ Migrated chunk: ${chunk.length} | Total: ${migratedCount}/${toMigrate.length}`);
        }

        console.log(`✅ Migration Complete: ${migratedCount} records migrated`);
        return migratedCount;

    } catch (error) {
        console.error('Migration Error:', error);
        throw error;
    }
}

// ฟังก์ชันประมวลผลข้อมูลเก่า
async function processLegacyRecord(legacyData, companyId) {
    try {
        const dateStr = legacyData.shift_date;
        
        // ฟังก์ชันแปลงเวลาอย่างปลอดภัย
        const parseTimeSafely = (timeString) => {
            if (!timeString) return null;

            if (timeString.includes('T')) {
                return dayjs.tz(timeString.replace('Z', ''), COMPANY_TIMEZONE).toDate();
            }

            if (timeString.match(/^\d{1,2}:\d{2}/)) {
                return dayjs.tz(`${dateStr} ${timeString}`, COMPANY_TIMEZONE).toDate();
            }

            return dayjs.tz(timeString, COMPANY_TIMEZONE).toDate();
        };

        // ดึงข้อมูลจาก legacy record
        let checkIn = null;
        let checkOut = null;

        // จาก localTimestamp (ถ้ามี)
        if (legacyData.localTimestamp) {
            const parts = legacyData.localTimestamp.split('->');
            if (parts.length === 2) {
                checkIn = parseTimeSafely(parts[0].trim());
                checkOut = parseTimeSafely(parts[1].trim());
            }
        }

        // จาก retro-approved adjustments
        if (legacyData.retro_approved && Array.isArray(legacyData.retro_approved)) {
            const approved = legacyData.retro_approved.find(r => r.shift_date === dateStr);
            if (approved) {
                checkIn = parseTimeSafely(approved.check_in);
                checkOut = parseTimeSafely(approved.check_out);
            }
        }

        // สร้าง log data ใหม่
        const logData = {
            company_id: companyId,
            employee_id: legacyData.employee_id,
            shift_date: dateStr,
            clock_in: checkIn,
            clock_out: checkOut,
            status: checkIn ? (checkOut ? 'complete' : 'incomplete') : 'absent',
            late_minutes: 0, // คำนวณภายหลัง
            clock_in_location: null,
            timezone: COMPANY_TIMEZONE,
            is_migrated: true,
            migrated_at: new Date(),
            source: 'migration_script',
            original_legacy_id: legacyData.id || null
        };

        return logData;

    } catch (error) {
        console.error('Error processing legacy record:', error);
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
window.checkMigrationStatus = function() {
    console.log('🔍 ตรวจสอบสถานะ Migration...');
    console.log('📋 คำสั่งที่ใช้ได้:');
    console.log('• runMigrationForMissingData() - รัน Migration สำหรับข้อมูลวันที่ 1-10');
    console.log('• checkMigrationStatus() - ตรวจสอบสถานะ');
    console.log('💡 รัน runMigrationForMissingData() เพื่อเริ่ม Migration');
};

console.log('🚀 Migration Runner Tools Loaded!');
console.log('📋 คำสั่งที่ใช้ได้:');
console.log('• runMigrationForMissingData() - รัน Migration สำหรับข้อมูลวันที่ 1-10');
console.log('• checkMigrationStatus() - ตรวจสอบสถานะ');
console.log('🚀 พร้อมใช้งาน! Migration ข้อมูลวันที่ 1-10');
