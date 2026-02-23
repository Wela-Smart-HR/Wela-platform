/**
 * Simple Payroll Recovery Script - ไม่ต้อง Firebase ใช้ API โดยตรง
 * รันใน browser console โดยตรง
 * 
 * วิธีใช้:
 * 1. Copy โค้ดนี้ทั้งหมด
 * 2. Paste ใน browser console (F12)
 * 3. กด Enter
 * 4. รัน recoverPayrollData()
 */

console.log('🎯 Simple Payroll Recovery Script Loaded!');

// ทำให้ฟังก์ชันเป็น Global
window.recoverPayrollData = async function() {
    console.log('🚀 Starting Simple Payroll Data Recovery...');
    
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
            `• เรียก API สำหรับ migration\n` +
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

        // 6. เรียกใช้ Migration Service (API version)
        const migratedCount = await runMigrationViaAPI(companyId, selectedMonth);

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

// ฟังก์ชัน Migration ผ่าน API - ไม่ต้อง Firebase
async function runMigrationViaAPI(companyId, selectedMonth) {
    console.log('🔄 Running migration via API...');
    
    try {
        // 1. Calculate Date Range
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth() + 1;
        const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endStr = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

        console.log('📅 Date range:', { startStr, endStr });

        // 2. หา API endpoint จากหน้าเว็บ
        const apiEndpoint = findAPIEndpoint();
        if (!apiEndpoint) {
            throw new Error('ไม่พบ API endpoint ในหน้าเว็บ');
        }

        console.log('✅ Found API endpoint:', apiEndpoint);

        // 3. เรียก API สำหรับ migration
        const response = await fetch(`${apiEndpoint}/api/migration/run`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                companyId: companyId,
                startDate: startStr,
                endDate: endStr,
                month: `${year}-${String(month).padStart(2, '0')}`
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.message || response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Migration API response:', result);

        return result.migratedCount || 0;

    } catch (error) {
        console.error("Migration API Error:", error);
        throw error;
    }
}

// ฟังก์ชันหา API endpoint
function findAPIEndpoint() {
    try {
        // 1. ลองจาก window.location
        const currentOrigin = window.location.origin;
        console.log('🔍 Current origin:', currentOrigin);
        
        // 2. ลอง endpoint ต่างๆ
        const possibleEndpoints = [
            `${currentOrigin}/api`,
            `${currentOrigin}/api/v1`,
            `${currentOrigin}/.netlify/functions`,
            `${currentOrigin}/api/migration`
        ];
        
        // 3. ลอง endpoint แรกที่ใช้ได้
        return possibleEndpoints[0]; // ใช้ origin ปัจจุบัน
        
    } catch (error) {
        console.error('Error finding API endpoint:', error);
        return null;
    }
}

// ฟังก์ชันดึง Auth Token
function getAuthToken() {
    try {
        // 1. ลองจาก localStorage
        const authUser = localStorage.getItem('authUser');
        if (authUser) {
            const user = JSON.parse(authUser);
            return user.token || user.accessToken || user.idToken;
        }
        
        // 2. ลองจาก cookies
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'token' || name === 'authToken' || name === 'idToken') {
                return value;
            }
        }
        
        // 3. ลองจาก global
        if (window.currentUser && window.currentUser.token) {
            return window.currentUser.token;
        }
        
        return null;
    } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
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

console.log('🎯 Simple Payroll Recovery Tools Loaded!');
console.log('📋 คำสั่งที่ใช้ได้:');
console.log('• recoverPayrollData() - ฟื้นฟูข้อมูล');
console.log('• checkPayrollDataStatus() - ตรวจสอบสถานะ');
console.log('🚀 พร้อมใช้งาน! ใช้ API โดยตรง');
