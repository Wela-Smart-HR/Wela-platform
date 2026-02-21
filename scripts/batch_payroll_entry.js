/**
 * Batch Payroll Data Entry Script - ใส่ข้อมูลจริงทั้งหมดทันที
 * รันใน browser console โดยตรง
 * 
 * วิธีใช้:
 * 1. Copy โค้ดนี้ทั้งหมด
 * 2. Paste ใน browser console (F12)
 * 3. กด Enter
 * 4. รัน batchDataEntry()
 */

console.log('🎯 Batch Payroll Data Entry Script Loaded!');

// ทำให้ฟังก์ชันเป็น Global
window.batchDataEntry = async function() {
    console.log('🚀 Starting Batch Payroll Data Entry...');
    
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
            `🚨 ยืนยันการใส่ข้อมูลจริงทั้งหมด?\n\n` +
            `📅 เดือน: ${monthInput}\n` +
            `🏢 Company: ${companyId}\n` +
            `👥 พนักงาน: ${realEmployeeData.length} คน\n` +
            `📊 ข้อมูลที่จะใส่: ${totalEntries} รายการ\n\n` +
            `👤 พนักงาน: เต้ย, นุช, ปาย\n\n` +
            `⚠️ การดำเนินการนี้จะ:\n` +
            `• ใส่ข้อมูลเวลาเข้า-ออกจริงๆ\n` +
            `• สร้าง deterministic IDs ป้องกันข้อมูลซ้ำ\n` +
            `• ใช้ batch processing ปลอดภัย\n\n` +
            `✅ พร้อมดำเนินการหรือไม่?`
        );

        if (!confirmEntry) {
            console.log('❌ ยกเลิกการใส่ข้อมูล');
            return;
        }

        // 6. แสดง loading
        console.log('🔄 เริ่มการใส่ข้อมูลจริงทั้งหมด...');
        console.log(`📊 Target: ${monthInput} | Company: ${companyId}`);

        // 7. เรียกใช้ Batch Entry
        const enteredCount = await runBatchDataEntry(companyId, realEmployeeData);

        // 8. แสดงผลลัพธ์
        if (enteredCount > 0) {
            alert(
                `✅ ใส่ข้อมูลจริงทั้งหมดสำเร็จ!\n\n` +
                `📊 จำนวนรายการที่ใส่: ${enteredCount}\n` +
                `📅 เดือน: ${monthInput}\n` +
                `👥 พนักงาน: เต้ย, นุช, ปาย\n\n` +
                `🔄 กรุณารีเฟรชหน้า Payroll และทดสอบอีกครั้ง\n` +
                `💡 ข้อมูลจริงๆ ของพนักงานควรจะปรากฏแล้ว`
            );
            
            console.log(`✅ Batch Data Entry Complete: ${enteredCount} records entered`);
            console.log('🔄 กรุณารีเฟรชหน้าเพื่อดูข้อมูลใหม่');
            
            setTimeout(() => {
                if (confirm('🔄 ต้องการรีเฟรชหน้าเว็บทันทีหรือไม่?')) {
                    window.location.reload();
                }
            }, 1000);
            
        } else {
            alert(
                `ℹ️ ไม่มีข้อมูลที่ต้องใส่\n\n` +
                `📅 เดือน: ${monthInput}\n` +
                `🏢 Company: ${companyId}\n\n` +
                `🔄 ลองตรวจสอบข้อมูลใน Payroll อีกครั้ง`
            );
            
            console.log('ℹ️ No batch data to enter');
        }

    } catch (error) {
        console.error('❌ Batch Data Entry Error:', error);
        alert(
            `❌ เกิดข้อผิดพลาดในการใส่ข้อมูลจริง\n\n` +
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

// ฟังก์ชันใส่ข้อมูลแบบ Batch
async function runBatchDataEntry(companyId, employeeData) {
    console.log('🔄 Running batch data entry...');
    
    try {
        // 1. หาวิธีเข้าถึง database
        const db = await getDatabaseConnection();
        if (!db) {
            throw new Error('ไม่สามารถเชื่อมต่อ database ได้');
        }

        let totalEntered = 0;

        // 2. วนลูปใส่ข้อมูลพนักงานแต่ละคน
        for (const employee of employeeData) {
            console.log(`📝 Entering batch data for ${employee.employeeName}...`);
            
            // 3. วนลูปใส่ข้อมูลแต่ละวัน
            for (const entry of employee.entries) {
                // 4. คำนวณสถานะ
                const statusInfo = calculateStatus(entry.checkIn);
                
                // 5. สร้างข้อมูลจริง
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
                    source: 'batch_real_data'
                };

                // 6. บันทึกข้อมูล
                await saveLogData(db, logData);
                totalEntered++;
                
                console.log(`✅ Entered ${employee.employeeName} - ${entry.date}: ${entry.checkIn} → ${entry.checkOut} (${statusInfo.status})`);
            }
        }

        console.log(`✅ Batch Data Entry Complete: ${totalEntered} records entered`);
        return totalEntered;

    } catch (error) {
        console.error("Batch Data Entry Error:", error);
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

// ฟังก์ชันเชื่อมต่อ Database
async function getDatabaseConnection() {
    try {
        // 1. ลองหา Firebase ที่มีอยู่แล้ว
        if (window.firebase && window.firebase.firestore) {
            return window.firebase.firestore();
        }
        
        if (window.firestore) {
            return window.firestore;
        }
        
        if (window.db) {
            return window.db;
        }
        
        // 2. ถ้าไม่พบ ใช้วิธี LocalStorage แบบง่าย
        console.log('🔄 Using localStorage fallback...');
        return null;
        
    } catch (error) {
        console.error('Error getting database connection:', error);
        return null;
    }
}

// ฟังก์ชันบันทึกข้อมูล
async function saveLogData(db, logData) {
    try {
        if (db) {
            // ถ้ามี Firebase ให้บันทึกแบบปกติ
            const deterministicId = `${logData.company_id}_${logData.employee_id}_${logData.shift_date}`;
            await db.collection('attendance_logs').doc(deterministicId).set(logData, { merge: true });
        } else {
            // ถ้าไม่มี Firebase ให้บันทึกใน localStorage
            const key = `attendance_${logData.company_id}_${logData.employee_id}_${logData.shift_date}`;
            localStorage.setItem(key, JSON.stringify(logData));
        }
    } catch (error) {
        console.error('Error saving log data:', error);
        throw error;
    }
}

// ฟังก์ชันตรวจสอบสถานะ
window.checkBatchEntryStatus = function() {
    console.log('🔍 ตรวจสอบสถานะ Batch Data Entry...');
    console.log('📋 คำสั่งที่ใช้ได้:');
    console.log('• batchDataEntry() - ใส่ข้อมูลจริงทั้งหมด');
    console.log('• checkBatchEntryStatus() - ตรวจสอบสถานะ');
    console.log('💡 รัน batchDataEntry() เพื่อเริ่มการใส่ข้อมูลจริงทั้งหมด');
};

console.log('🎯 Batch Payroll Data Entry Tools Loaded!');
console.log('📋 คำสั่งที่ใช้ได้:');
console.log('• batchDataEntry() - ใส่ข้อมูลจริงทั้งหมด');
console.log('• checkBatchEntryStatus() - ตรวจสอบสถานะ');
console.log('🚀 พร้อมใช้งาน! ใส่ข้อมูลจริงของเต้ย, นุช, ปาย ทั้งหมด');
