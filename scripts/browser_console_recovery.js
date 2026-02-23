/**
 * Browser Console Compatible Payroll Recovery Script
 * ไม่ใช้ ES Module import - ใช้วิธีที่ browser console รองรับได้
 * 
 * วิธีใช้:
 * 1. เปิดหน้า Payroll ใน browser
 * 2. เปิด Developer Tools (F12)
 * 3. Copy & Paste โค้ดนี้ใน Console tab
 * 4. กด Enter
 * 5. รัน recoverPayrollData()
 */

console.log('🎯 Payroll Recovery Script Loaded!');

// ทำให้ฟังก์ชันเป็น Global
window.recoverPayrollData = async function() {
    console.log('🚀 Starting Payroll Data Recovery...');
    
    try {
        // 1. ดึงข้อมูลจากหน้าปัจจุบัน (DOM/State)
        const companyId = await getCompanyIdFromPage();
        
        if (!companyId) {
            alert('❌ ไม่พบ Company ID กรุณาล็อกอินใหม่');
            return;
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

        // 6. เรียกใช้ Migration Service (ผ่าน global scope หรือ direct call)
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

// ฟังก์ชันช่วยสำหรับดึง Company ID
async function getCompanyIdFromPage() {
    // พยายาดึงจากหลายทาง
    try {
        // 1. ลองจาก localStorage
        const authData = localStorage.getItem('authUser');
        if (authData) {
            const user = JSON.parse(authData);
            return user.companyId;
        }
        
        // 2. ลองจาก global window object
        if (window.currentUser && window.currentUser.companyId) {
            return window.currentUser.companyId;
        }
        
        // 3. ลองจาก URL
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('company') || 'demo-company'; // fallback
    } catch (error) {
        console.error('Error getting company ID:', error);
        return null;
    }
}

// ฟังก์ชัน Migration ที่ไม่ใช้ import
async function runMigrationDirectly(companyId, selectedMonth) {
    console.log('🔄 Running migration without ES modules...');
    
    try {
        // 1. Calculate Date Range
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth() + 1;
        const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endStr = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

        console.log('📅 Date range:', { startStr, endStr });

        // 2. Access Firebase ผ่าน global window (ถ้ามี)
        if (!window.db) {
            throw new Error('Firebase DB not available in global scope');
        }

        // 3. Query legacy attendance collection
        const attendanceCollection = window.db.collection('attendance');
        const snapshot = await attendanceCollection
            .where('companyId', '==', companyId)
            .where('date', '>=', startStr)
            .where('date', '<=', endStr)
            .get();

        console.log(`📊 Found ${snapshot.docs.length} legacy records`);

        // 4. Process records
        const allLogsToMigrate = [];
        const processedKeys = new Set();

        snapshot.docs.forEach(doc => {
            const data = doc.data();
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

        // 5. Batch write to attendance_logs
        const attendanceLogsCollection = window.db.collection('attendance_logs');
        let totalCommitted = 0;
        const chunkSize = 499;

        for (let i = 0; i < allLogsToMigrate.length; i += chunkSize) {
            const chunk = allLogsToMigrate.slice(i, i + chunkSize);
            const batch = window.db.batch();

            chunk.forEach(log => {
                const deterministicId = `${companyId}_${log.employee_id}_${log.shift_date}`;
                const docRef = attendanceLogsCollection.doc(deterministicId);
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

console.log('🎯 Payroll Recovery Tools Loaded!');
console.log('📋 คำสั่งที่ใช้ได้:');
console.log('• recoverPayrollData() - ฟื้นฟูข้อมูล');
console.log('• checkPayrollDataStatus() - ตรวจสอบสถานะ');
console.log('🚀 พร้อมใช้งาน!');
