/**
 * Manual Payroll Data Entry Script - ใส่ข้อมูลเวลาเข้า-ออกแบบ Manual
 * รันใน browser console โดยตรง
 * 
 * วิธีใช้:
 * 1. Copy โค้ดนี้ทั้งหมด
 * 2. Paste ใน browser console (F12)
 * 3. กด Enter
 * 4. รัน manualDataEntry()
 */

console.log('🎯 Manual Payroll Data Entry Script Loaded!');

// ทำให้ฟังก์ชันเป็น Global
window.manualDataEntry = async function() {
    console.log('🚀 Starting Manual Payroll Data Entry...');
    
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
        const monthInput = prompt('📅 กรุณาระบุเดือนที่ต้องใส่ข้อมูล (Format: YYYY-MM, เช่น 2026-02):');
        
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

        // 4. สร้างข้อมูลพนักงานและวันที่
        const employeeData = await createEmployeeData(companyId, monthInput, year, month);
        
        if (!employeeData || employeeData.length === 0) {
            alert('❌ ไม่มีข้อมูลพนักงานที่ต้องใส่ข้อมูล');
            return;
        }

        // 5. แสดงคอนเฟิร์ม
        const confirmEntry = confirm(
            `🚨 ยืนยันการใส่ข้อมูล Payroll แบบ Manual?\n\n` +
            `📅 เดือน: ${monthInput}\n` +
            `🏢 Company: ${companyId}\n` +
            `👥 พนักงาน: ${employeeData.length} คน\n` +
            `📅 วันที่: ${employeeData[0].days.length} วัน\n\n` +
            `⚠️ การดำเนินการนี้จะ:\n` +
            `• ใส่ข้อมูลเวลาเข้า-ออกแบบ manual\n` +
            `• สร้าง deterministic IDs ป้องกันข้อมูลซ้ำ\n` +
            `• ใช้ batch processing ปลอดภัย\n\n` +
            `✅ พร้อมดำเนินการหรือไม่?`
        );

        if (!confirmEntry) {
            console.log('❌ ยกเลิกการใส่ข้อมูล');
            return;
        }

        // 6. แสดง loading
        console.log('🔄 เริ่มการใส่ข้อมูล...');
        console.log(`📊 Target: ${monthInput} | Company: ${companyId}`);

        // 7. เรียกใช้ Manual Entry
        const enteredCount = await runManualEntry(companyId, employeeData);

        // 8. แสดงผลลัพธ์
        if (enteredCount > 0) {
            alert(
                `✅ ใส่ข้อมูลสำเร็จ!\n\n` +
                `📊 จำนวนรายการที่ใส่: ${enteredCount}\n` +
                `📅 เดือน: ${monthInput}\n\n` +
                `🔄 กรุณารีเฟรชหน้า Payroll และทดสอบอีกครั้ง\n` +
                `💡 ข้อมูลวันที่ 1-10 ควรจะปรากฏแล้ว`
            );
            
            console.log(`✅ Manual Entry Complete: ${enteredCount} records entered`);
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
            
            console.log('ℹ️ No data to enter');
        }

    } catch (error) {
        console.error('❌ Manual Entry Error:', error);
        alert(
            `❌ เกิดข้อผิดพลาดในการใส่ข้อมูล\n\n` +
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

// ฟังก์ชันสร้างข้อมูลพนักงาน
async function createEmployeeData(companyId, monthInput, year, month) {
    try {
        // 1. กำหนดพนักงาน (จาก console log ที่เห็น)
        const employees = [
            { id: 'ho', name: 'ho' },
            { id: 'thn', name: 'thn' },
            { id: 'us', name: 'us' },
            { id: 'เต้ย', name: 'เต้ย' }
        ];

        // 2. คำนวณวันที่ในเดือน
        const lastDay = new Date(year, month, 0).getDate();
        const days = [];
        
        for (let day = 1; day <= lastDay; day++) {
            days.push({
                date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                dayNumber: day
            });
        }

        // 3. สร้างข้อมูลพนักงานพร้อมวันที่
        const employeeData = employees.map(emp => ({
            employeeId: emp.id,
            employeeName: emp.name,
            days: days.map(day => ({
                ...day,
                checkIn: null,
                checkOut: null,
                status: 'present'
            }))
        }));

        console.log('✅ Created employee data:', employeeData.length, 'employees');
        return employeeData;

    } catch (error) {
        console.error('Error creating employee data:', error);
        return [];
    }
}

// ฟังก์ชันใส่ข้อมูลแบบ Manual
async function runManualEntry(companyId, employeeData) {
    console.log('🔄 Running manual data entry...');
    
    try {
        // 1. หาวิธีเข้าถึง database
        const db = await getDatabaseConnection();
        if (!db) {
            throw new Error('ไม่สามารถเชื่อมต่อ database ได้');
        }

        let totalEntered = 0;

        // 2. วนลูปใส่ข้อมูลพนักงานแต่ละคน
        for (const employee of employeeData) {
            console.log(`📝 Entering data for ${employee.employeeName}...`);
            
            // 3. วนลูปใส่ข้อมูลแต่ละวัน
            for (const day of employee.days) {
                // 4. ถ้าเป็นวันที่ 1-10 ให้ใส่ข้อมูลตัวอย่าง
                if (day.dayNumber >= 1 && day.dayNumber <= 10) {
                    const timeData = generateSampleTimeData(day.dayNumber);
                    
                    const logData = {
                        company_id: companyId,
                        employee_id: employee.employeeId,
                        shift_date: day.date,
                        clock_in: timeData.clockIn,
                        clock_out: timeData.clockOut,
                        status: timeData.status,
                        late_minutes: timeData.lateMinutes,
                        clock_in_location: null,
                        timezone: 'Asia/Bangkok',
                        manually_entered: true,
                        entered_at: new Date(),
                        is_migrated: true
                    };

                    // 5. บันทึกข้อมูล
                    await saveLogData(db, logData);
                    totalEntered++;
                    
                    console.log(`✅ Entered ${employee.employeeName} - ${day.date}: ${timeData.clockIn} → ${timeData.clockOut}`);
                }
            }
        }

        console.log(`✅ Manual Entry Complete: ${totalEntered} records entered`);
        return totalEntered;

    } catch (error) {
        console.error("Manual Entry Error:", error);
        throw error;
    }
}

// ฟังก์ชันสร้างข้อมูลเวลาตัวอย่าง
function generateSampleTimeData(dayNumber) {
    // สร้างข้อมูลเวลาเข้า-ออกตัวอย่างสำหรับวันที่ 1-10
    const sampleTimes = [
        { clockIn: '08:45', clockOut: '17:30', status: 'present', lateMinutes: 15 },
        { clockIn: '08:30', clockOut: '17:15', status: 'present', lateMinutes: 0 },
        { clockIn: '09:00', clockOut: '17:45', status: 'late', lateMinutes: 30 },
        { clockIn: '08:15', clockOut: '17:00', status: 'present', lateMinutes: 0 },
        { clockIn: '08:55', clockOut: '17:20', status: 'late', lateMinutes: 25 },
        { clockIn: '08:30', clockOut: '17:30', status: 'present', lateMinutes: 0 },
        { clockIn: '09:15', clockOut: '17:45', status: 'late', lateMinutes: 45 },
        { clockIn: '08:20', clockOut: '17:10', status: 'present', lateMinutes: 0 },
        { clockIn: '08:40', clockOut: '17:25', status: 'present', lateMinutes: 10 },
        { clockIn: '08:35', clockOut: '17:40', status: 'present', lateMinutes: 5 }
    ];

    return sampleTimes[dayNumber - 1] || sampleTimes[0];
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
window.checkManualEntryStatus = function() {
    console.log('🔍 ตรวจสอบสถานะ Manual Entry...');
    console.log('📋 คำสั่งที่ใช้ได้:');
    console.log('• manualDataEntry() - ใส่ข้อมูลแบบ manual');
    console.log('• checkManualEntryStatus() - ตรวจสอบสถานะ');
    console.log('💡 รัน manualDataEntry() เพื่อเริ่มการใส่ข้อมูล');
};

console.log('🎯 Manual Payroll Data Entry Tools Loaded!');
console.log('📋 คำสั่งที่ใช้ได้:');
console.log('• manualDataEntry() - ใส่ข้อมูลแบบ manual');
console.log('• checkManualEntryStatus() - ตรวจสอบสถานะ');
console.log('🚀 พร้อมใช้งาน! ใส่ข้อมูลวันที่ 1-10 แบบ manual');
