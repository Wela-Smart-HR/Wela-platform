/**
 * Payroll Data Recovery Script
 * ใช้สำหรับฟื้นฟูข้อมูล attendance ที่หายไป (วันที่ 1-10) โดยใช้ migration service ที่มีอยู่แล้ว
 * 
 * การใช้งาน:
 * 1. เปิด browser console ที่หน้า Payroll
 * 2. วางโค้ดนี้แล้วกด Enter
 * 3. เลือกเดือนที่ต้องการฟื้นฟูข้อมูล
 */

// Import the migration service (ถ้ายังไม่ได้ import ไว้)
import { migrationService } from '../features/migration/migration.service.js';

/**
 * ฟังก์ชันหลักสำหรับฟื้นฟูข้อมูล Payroll
 */
window.recoverPayrollData = async function() {
    try {
        // 1. ดึง companyId จาก auth context
        const { currentUser } = await import('../contexts/AuthContext.js').then(m => m.useAuth());
        const companyId = currentUser?.companyId;
        
        if (!companyId) {
            alert('❌ ไม่พบ Company ID กรุณาล็อกอินใหม่');
            return;
        }

        // 2. ให้ user เลือกเดือนที่ต้องการฟื้นฟู
        const monthInput = prompt('📅 กรุณาระบุเดือนที่ต้องการฟื้นฟูข้อมูล (Format: YYYY-MM, เช่น 2026-02):');
        
        if (!monthInput) {
            console.log('❌ ยกเลิกการทำงาน');
            return;
        }

        // 3. แปลงเป็น Date object
        const [year, month] = monthInput.split('-').map(Number);
        if (!year || !month || month < 1 || month > 12) {
            alert('❌ Format ไม่ถูกต้อง กรุณาระบุเป็น YYYY-MM (เช่น 2026-02)');
            return;
        }

        const selectedMonth = new Date(year, month - 1, 1);

        // 4. แสดงคอนเฟิร์มก่อนรัน migration
        const confirm = confirm(
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

        if (!confirm) {
            console.log('❌ ยกเลิกการ migration');
            return;
        }

        // 5. แสดง loading state
        console.log('🔄 เริ่มการฟื้นฟูข้อมูล...');
        console.log(`📊 Target: ${monthInput} | Company: ${companyId}`);

        // 6. เรียกใช้ migration service (Idempotent & Safe)
        const migratedCount = await migrationService.runDataMigration(companyId, selectedMonth);

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

/**
 * ฟังก์ชันตรวจสอบสถานะข้อมูลปัจจุบัน
 */
window.checkPayrollDataStatus = async function() {
    try {
        console.log('🔍 ตรวจสอบสถานะข้อมูล Payroll...');
        
        // ดึงข้อมูลจาก console log ปัจจุบัน
        const logsTabElement = document.querySelector('[data-testid="logs-tab"]') || 
                               document.querySelector('table');
        
        if (logsTabElement) {
            console.log('📊 พบ LogsTab element บนหน้าเว็บ');
            console.log('💡 ตรวจสอบ console.log ใน Developer Tools เพื่อดู logMap keys');
            console.log('🔍 หากไม่พบวันที่ 1-10 ใน logMap keys ให้รัน recoverPayrollData()');
        } else {
            console.log('❌ ไม่พบ LogsTab element กรุณาเปิดหน้า Payroll > Employee > Logs Tab');
        }
        
        console.log('🚀 พร้อมใช้งาน:');
        console.log('• recoverPayrollData() - ฟื้นฟูข้อมูลที่หาย');
        console.log('• checkPayrollDataStatus() - ตรวจสอบสถานะ');
        
    } catch (error) {
        console.error('❌ Status Check Error:', error);
    }
};

// Auto-run status check
console.log('🎯 Payroll Data Recovery Tools Loaded!');
console.log('📋 คำสั่งที่ใช้ได้:');
console.log('• recoverPayrollData() - ฟื้นฟูข้อมูล');
console.log('• checkPayrollDataStatus() - ตรวจสอบสถานะ');
console.log('🔧 รัน checkPayrollDataStatus() เพื่อเริ่มตรวจสอบ');

// รัน auto-check
setTimeout(checkPayrollDataStatus, 1000);
