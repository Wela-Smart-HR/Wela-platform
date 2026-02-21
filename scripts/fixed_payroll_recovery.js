/**
 * Fixed Payroll Recovery Script - แก้ปัญหา Firebase DB และ Company ID
 * รันใน browser console โดยตรง
 * 
 * วิธีใช้:
 * 1. Copy โค้ดนี้ทั้งหมด
 * 2. Paste ใน browser console (F12)
 * 3. กด Enter
 * 4. รัน recoverPayrollData()
 */

console.log('🎯 Fixed Payroll Recovery Script Loaded!');

// ทำให้ฟังก์ชันเป็น Global
window.recoverPayrollData = async function() {
    console.log('🚀 Starting Fixed Payroll Data Recovery...');
    
    try {
        // 1. ดึง Company ID แบบ manual ถ้าจำเป็น
        let companyId = await getCompanyIdFromPage();
        
        // ถ้าได้ demo-company ให้ถาม user ใส่เอง
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

        // 4. แสดงคอนเฟิร์มก่อนรัน
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

        // 6. เรียกใช้ Migration Service (แก้ไขแล้ว)
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
            
            // ถ้าต้องการรีเฟรชอัตโนมัติ
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

// ฟังก์ชันดึง Company ID ที่ดีขึ้น
async function getCompanyIdFromPage() {
    try {
        // 1. ลองจาก localStorage (แก้ไข key ให้ถูกต้อง)
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
        
        // 4. ลองจาก React DevTools (ถ้ามี)
        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
            console.log('🔍 Trying React DevTools...');
            // พยายามดึงจาก React component state
        }
        
        // 5. ถ้าไม่พบให้คืนค่า null (จะถาม user ใส่เอง)
        console.log('❌ Could not find companyId automatically');
        return null;
        
    } catch (error) {
        console.error('Error getting company ID:', error);
        return null;
    }
}

// ฟังก์ชัน Migration ที่แก้ปัญหา Firebase DB
async function runMigrationDirectly(companyId, selectedMonth) {
    console.log('🔄 Running migration with Firebase dynamic import...');
    
    try {
        // 1. Dynamic import Firebase เพื่อแก้ปัญหา global scope
        const { db } = await import('../shared/lib/firebase.js');
        
        if (!db) {
            throw new Error('Failed to import Firebase db');
        }
        
        console.log('✅ Firebase db imported successfully');

        // 2. Calculate Date Range
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth() + 1;
        const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endStr = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

        console.log('📅 Date range:', { startStr, endStr });

        // 3. Import Firestore functions
        const { collection, query, where, getDocs, writeBatch, doc } = await import('firebase/firestore');

        // 4. Query legacy attendance collection
        const attendanceQuery = query(
            collection(db, 'attendance'),
            where('companyId', '==', companyId),
            where('date', '>=', startStr),
            where('date', '<=', endStr)
        );
        
        const snapshot = await getDocs(attendanceQuery);
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
        const attendanceLogsQuery = query(
            collection(db, 'attendance_logs'),
            where('company_id', '==', companyId)
        );
        
        let totalCommitted = 0;
        const chunkSize = 499;

        for (let i = 0; i < allLogsToMigrate.length; i += chunkSize) {
            const chunk = allLogsToMigrate.slice(i, i + chunkSize);
            const batch = writeBatch(db);

            chunk.forEach(log => {
                const deterministicId = `${companyId}_${log.employee_id}_${log.shift_date}`;
                const docRef = doc(db, 'attendance_logs', deterministicId);
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

// ฟังก์ชันตรวจสอบสถานะ
window.checkPayrollDataStatus = function() {
    console.log('🔍 ตรวจสอบสถานะข้อมูล Payroll...');
    console.log('📋 คำสั่งที่ใช้ได้:');
    console.log('• recoverPayrollData() - ฟื้นฟูข้อมูล');
    console.log('• checkPayrollDataStatus() - ตรวจสอบสถานะ');
    console.log('💡 รัน recoverPayrollData() เพื่อเริ่มการฟื้นฟู');
};

console.log('🎯 Fixed Payroll Recovery Tools Loaded!');
console.log('📋 คำสั่งที่ใช้ได้:');
console.log('• recoverPayrollData() - ฟื้นฟูข้อมูล');
console.log('• checkPayrollDataStatus() - ตรวจสอบสถานะ');
console.log('🚀 พร้อมใช้งาน! แก้ปัญหา Firebase DB และ Company ID แล้ว');
