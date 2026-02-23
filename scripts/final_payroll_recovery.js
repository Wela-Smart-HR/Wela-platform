/**
 * Final Payroll Recovery Script - ใช้งานได้แม้ไม่มี Firebase
 * รันใน browser console โดยตรง
 * 
 * วิธีใช้:
 * 1. Copy โค้ดนี้ทั้งหมด
 * 2. Paste ใน browser console (F12)
 * 3. กด Enter
 * 4. รัน recoverPayrollData()
 */

console.log('🎯 Final Payroll Recovery Script Loaded!');

// ทำให้ฟังก์ชันเป็น Global
window.recoverPayrollData = async function() {
    console.log('🚀 Starting Final Payroll Data Recovery...');
    
    try {
        // 1. ดึง Company ID แบบ manual
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
        const monthInput = prompt('📅 กรุณาระบุเดือนที่ต้องการฟื้นฟูข้อมูล (Format: YYYY-MM, เช่น 2026-02):');
        
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

        const selectedMonth = new Date(year, month - 1, 1);

        // 4. แสดงคอนเฟิร์ม
        const confirmMigration = confirm(
            `🚨 ยืนยันการฟื้นฟูข้อมูล Payroll?\n\n` +
            `📅 เดือน: ${monthInput}\n` +
            `🏢 Company: ${companyId}\n\n` +
            `⚠️ การดำเนินการนี้จะ:\n` +
            `• อ่านข้อมูลจาก legacy collection\n` +
            `• แปลง timezone ให้เป็นมาตรฐานเดียวกัน\n` +
            `• สร้าง deterministic IDs ป้องกันข้อมูลซ้ำ\n` +
            `• ใช้ batch processing ปลอดภัย\n\n` +
            `✅ พร้อมดำเนินการหรือไม่?`
        );

        if (!confirmMigration) {
            console.log('❌ ยกเลิกการ migration');
            return;
        }

        // 5. แสดง loading
        console.log('🔄 เริ่มการฟื้นฟูข้อมูล...');
        console.log(`📊 Target: ${monthInput} | Company: ${companyId}`);

        // 6. เรียกใช้ Migration Service (สุดท้าย)
        const migratedCount = await runMigrationDirectly(companyId, selectedMonth);

        // 7. แสดงผลลัพธ์
        if (migratedCount > 0) {
            alert(
                `✅ ฟื้นฟูข้อมูลสำเร็จ!\n\n` +
                `📊 จำนวนรายการที่ migrate: ${migratedCount}\n` +
                `📅 เดือน: ${monthInput}\n\n` +
                `🔄 กรุณารีเฟรชหน้า Payroll และทดสอบอีกครั้ง\n` +
                `💡 ถ้ายังมีปัญหา ให้ลอง Rebuild Cycle ตามปกติ`
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
                `ℹ️ ไม่พบข้อมูลที่ต้อง migrate\n\n` +
                `📅 เดือน: ${monthInput}\n` +
                `🏢 Company: ${companyId}\n\n` +
                `💡 อาจมี 2 กรณี:\n` +
                `1. ข้อมูลถูกต้องแล้ว (ไม่ต้อง migrate)\n` +
                `2. ไม่มีข้อมูลใน legacy collection\n\n` +
                `🔄 ลองตรวจสอบข้อมูลใน Payroll อีกครั้ง`
            );
            
            console.log('ℹ️ No data found to migrate');
        }

    } catch (error) {
        console.error('❌ Migration Error:', error);
        alert(
            `❌ เกิดข้อผิดพลาดในการฟื้นฟูข้อมูล\n\n` +
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

// ฟังก์ชัน Migration สุดท้าย - ใช้ REST API แทน Firebase
async function runMigrationDirectly(companyId, selectedMonth) {
    console.log('🔄 Running migration via REST API...');
    
    try {
        // 1. Calculate Date Range
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth() + 1;
        const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endStr = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

        console.log('📅 Date range:', { startStr, endStr });

        // 2. หา Firebase config จากหน้าเว็บ
        const firebaseConfig = getFirebaseConfig();
        if (!firebaseConfig) {
            throw new Error('ไม่พบ Firebase config ในหน้าเว็บ');
        }

        console.log('✅ Found Firebase config');

        // 3. สร้าง Firebase instance แบบ manual
        const firebaseApp = await initializeFirebaseManually(firebaseConfig);
        const db = firebaseApp.firestore();

        // 4. Query legacy attendance collection
        const attendanceQuery = db.collection('attendance')
            .where('companyId', '==', companyId)
            .where('date', '>=', startStr)
            .where('date', '<=', endStr);
        
        const snapshot = await attendanceQuery.get();
        console.log(`📊 Found ${snapshot.docs.length} legacy records`);

        // 5. Process records
        const allLogsToMigrate = [];
        const processedKeys = new Set();

        snapshot.docs.forEach(docSnapshot => {
            const data = docSnapshot.data();
            const dateStr = data.date;
            const employeeId = data.userId;
            
            if (!dateStr || !employeeId) return;
            
            const logKey = `${employeeId}_${dateStr}`;
            if (processedKeys.has(logKey)) return;
            processedKeys.add(logKey);

            // Group by employee and date
            let existingLog = allLogsToMigrate.find(log => log.logKey === logKey);
            
            if (!existingLog) {
                existingLog = {
                    logKey,
                    company_id: companyId,
                    employee_id: employeeId,
                    shift_date: dateStr,
                    clock_in: null,
                    clock_out: null,
                    status: 'present',
                    late_minutes: 0,
                    clock_in_location: null,
                    timezone: 'Asia/Bangkok',
                    migrated_at: new Date(),
                    is_migrated: true
                };
                allLogsToMigrate.push(existingLog);
            }
            
            // Process time based on type
            const timeString = data.localTimestamp || data.time || data.createdAt;
            if (!timeString) return;
            
            let parsedTime;
            try {
                if (timeString.includes('T')) {
                    parsedTime = new Date(timeString.replace('Z', ''));
                } else if (timeString.match(/^\d{1,2}:\d{2}/)) {
                    parsedTime = new Date(`${dateStr} ${timeString}`);
                } else {
                    parsedTime = new Date(timeString);
                }
            } catch (e) {
                console.warn('Time parse error:', timeString, e);
                return;
            }
            
            if (!parsedTime) return;
            
            // Assign clock-in or clock-out
            if (data.type === 'clock-in' || data.actionType === 'clock-in') {
                existingLog.clock_in = parsedTime;
                existingLog.clock_in_location = data.location || null;
                existingLog.status = data.status || 'present';
                existingLog.late_minutes = data.lateMinutes || data.lateMins || 0;
            } else if (data.type === 'clock-out' || data.actionType === 'clock-out') {
                existingLog.clock_out = parsedTime;
            }
        });

        if (allLogsToMigrate.length === 0) {
            console.log("No legacy logs found to migrate.");
            return 0;
        }

        // 6. Batch write to attendance_logs
        let totalCommitted = 0;
        const chunkSize = 499;

        for (let i = 0; i < allLogsToMigrate.length; i += chunkSize) {
            const chunk = allLogsToMigrate.slice(i, i + chunkSize);
            const batch = db.batch();

            chunk.forEach(log => {
                const deterministicId = `${companyId}_${log.employee_id}_${log.shift_date}`;
                const docRef = db.collection('attendance_logs').doc(deterministicId);
                batch.set(docRef, log, { merge: true });
            });

            await batch.commit();
            totalCommitted += chunk.length;
            console.log(`Committed chunk: ${chunk.length} | Total: ${totalCommitted}/${allLogsToMigrate.length}`);
        }

        console.log(`Migration Complete. Successfully migrated ${totalCommitted} records.`);
        return totalCommitted;

    } catch (error) {
        console.error("Migration Error:", error);
        throw error;
    }
}

// ฟังก์ชันหา Firebase config จากหน้าเว็บ
function getFirebaseConfig() {
    try {
        // ลองหาจาก script tags
        const scripts = Array.from(document.scripts);
        for (const script of scripts) {
            if (script.textContent && script.textContent.includes('firebaseConfig')) {
                const match = script.textContent.match(/firebaseConfig\s*=\s*({[\s\S]*?})/);
                if (match) {
                    return eval(`(${match[1]})`);
                }
            }
        }
        
        // ลองหาจาก global variables
        if (window.firebaseConfig) {
            return window.firebaseConfig;
        }
        
        // ลองหาจาก window object อื่นๆ
        const configKeys = Object.keys(window).filter(key => 
            key.toLowerCase().includes('firebase') || 
            key.toLowerCase().includes('config')
        );
        
        for (const key of configKeys) {
            const value = window[key];
            if (value && typeof value === 'object' && value.apiKey) {
                return value;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error getting Firebase config:', error);
        return null;
    }
}

// ฟังก์ชันสร้าง Firebase instance แบบ manual
async function initializeFirebaseManually(config) {
    try {
        // โหลด Firebase SDK แบบ dynamic
        if (!window.firebase) {
            console.log('🔄 Loading Firebase SDK...');
            
            // โหลด Firebase App SDK
            await loadScript('https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js');
            // โหลด Firebase Firestore SDK
            await loadScript('https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js');
            
            console.log('✅ Firebase SDK loaded');
        }
        
        // สร้าง Firebase app
        const app = window.firebase.initializeApp(config, 'payroll-recovery');
        console.log('✅ Firebase app initialized');
        
        return app;
    } catch (error) {
        console.error('Error initializing Firebase:', error);
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
window.checkPayrollDataStatus = function() {
    console.log('🔍 ตรวจสอบสถานะข้อมูล Payroll...');
    console.log('📋 คำสั่งที่ใช้ได้:');
    console.log('• recoverPayrollData() - ฟื้นฟูข้อมูล');
    console.log('• checkPayrollDataStatus() - ตรวจสอบสถานะ');
    console.log('💡 รัน recoverPayrollData() เพื่อเริ่มการฟื้นฟู');
};

console.log('🎯 Final Payroll Recovery Tools Loaded!');
console.log('📋 คำสั่งที่ใช้ได้:');
console.log('• recoverPayrollData() - ฟื้นฟูข้อมูล');
console.log('• checkPayrollDataStatus() - ตรวจสอบสถานะ');
console.log('🚀 พร้อมใช้งาน! โหลด Firebase SDK แบบ dynamic');
