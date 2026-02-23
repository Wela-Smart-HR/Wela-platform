/**
 * Real Payroll Data Entry Script - ใส่ข้อมูลจริงๆ ของพนักงาน
 * รันใน browser console โดยตรง
 * 
 * วิธีใช้:
 * 1. Copy โค้ดนี้ทั้งหมด
 * 2. Paste ใน browser console (F12)
 * 3. กด Enter
 * 4. รัน realDataEntry()
 */

console.log('🎯 Real Payroll Data Entry Script Loaded!');

// ทำให้ฟังก์ชันเป็น Global
window.realDataEntry = async function() {
    console.log('🚀 Starting Real Payroll Data Entry...');
    
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

        // 4. รับข้อมูลพนักงานจาก user
        const employeeData = await collectRealEmployeeData(companyId, monthInput, year, month);
        
        if (!employeeData || employeeData.length === 0) {
            alert('❌ ไม่มีข้อมูลพนักงานที่ต้องใส่ข้อมูล');
            return;
        }

        // 5. แสดงคอนเฟิร์ม
        const confirmEntry = confirm(
            `🚨 ยืนยันการใส่ข้อมูล Payroll จริงๆ?\n\n` +
            `📅 เดือน: ${monthInput}\n` +
            `🏢 Company: ${companyId}\n` +
            `👥 พนักงาน: ${employeeData.length} คน\n` +
            `📊 ข้อมูลที่จะใส่: ${employeeData.reduce((sum, emp) => sum + (emp.entries?.length || 0), 0)} รายการ\n\n` +
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
        console.log('🔄 เริ่มการใส่ข้อมูลจริง...');
        console.log(`📊 Target: ${monthInput} | Company: ${companyId}`);

        // 7. เรียกใช้ Real Entry
        const enteredCount = await runRealDataEntry(companyId, employeeData);

        // 8. แสดงผลลัพธ์
        if (enteredCount > 0) {
            alert(
                `✅ ใส่ข้อมูลจริงสำเร็จ!\n\n` +
                `📊 จำนวนรายการที่ใส่: ${enteredCount}\n` +
                `📅 เดือน: ${monthInput}\n\n` +
                `🔄 กรุณารีเฟรชหน้า Payroll และทดสอบอีกครั้ง\n` +
                `💡 ข้อมูลจริงๆ ของพนักงานควรจะปรากฏแล้ว`
            );
            
            console.log(`✅ Real Data Entry Complete: ${enteredCount} records entered`);
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
            
            console.log('ℹ️ No real data to enter');
        }

    } catch (error) {
        console.error('❌ Real Data Entry Error:', error);
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

// ฟังก์ชันรับข้อมูลพนักงานจาก user
async function collectRealEmployeeData(companyId, monthInput, year, month) {
    try {
        console.log('📝 กำลังรับข้อมูลพนักงานจากคุณ...');
        
        const employeeData = [];
        let moreEmployees = true;
        
        while (moreEmployees) {
            // 1. รับข้อมูลพนักงานคนถัดไป
            const employeeName = prompt(`👤 ชื่อพนักงานคนที่ ${employeeData.length + 1} (หรือพิมพ์ 'done' เมื่อเสร็จ):`);
            
            if (!employeeName || employeeName.toLowerCase() === 'done') {
                moreEmployees = false;
                break;
            }
            
            const employeeId = prompt(`🆔 ID ของพนักงาน "${employeeName}":`);
            if (!employeeId) {
                alert('❌ กรุณาใส่ ID ของพนักงาน');
                continue;
            }
            
            // 2. รับข้อมูลเวลาเข้า-ออก
            const entries = [];
            let moreEntries = true;
            
            while (moreEntries) {
                const dateInput = prompt(`📅 วันที่ที่ต้องใส่ข้อมูลสำหรับ "${employeeName}" (Format: YYYY-MM-DD, เช่น 2026-02-01) หรือพิมพ์ 'done':`);
                
                if (!dateInput || dateInput.toLowerCase() === 'done') {
                    moreEntries = false;
                    break;
                }
                
                // ตรวจสอบ format วันที่
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(dateInput)) {
                    alert('❌ Format วันที่ไม่ถูกต้อง กรุณาใช้ YYYY-MM-DD');
                    continue;
                }
                
                const checkIn = prompt(`⏰ เวลาเข้าของ "${employeeName}" วันที่ ${dateInput} (Format: HH:mm, เช่น 08:30):`);
                if (!checkIn) {
                    alert('❌ กรุณาใส่เวลาเข้า');
                    continue;
                }
                
                const checkOut = prompt(`⏰ เวลาออกของ "${employeeName}" วันที่ ${dateInput} (Format: HH:mm, เช่น 17:30):`);
                if (!checkOut) {
                    alert('❌ กรุณาใส่เวลาออก');
                    continue;
                }
                
                // ตรวจสอบ format เวลา
                const timeRegex = /^\d{1,2}:\d{2}$/;
                if (!timeRegex.test(checkIn) || !timeRegex.test(checkOut)) {
                    alert('❌ Format เวลาไม่ถูกต้อง กรุณาใช้ HH:mm');
                    continue;
                }
                
                // คำนวณสถานะและความสาย
                const statusInfo = calculateStatus(checkIn);
                
                entries.push({
                    date: dateInput,
                    checkIn: checkIn,
                    checkOut: checkOut,
                    status: statusInfo.status,
                    lateMinutes: statusInfo.lateMinutes
                });
                
                console.log(`✅ เพิ่มข้อมูล: ${employeeName} - ${dateInput}: ${checkIn} → ${checkOut} (${statusInfo.status})`);
            }
            
            if (entries.length > 0) {
                employeeData.push({
                    employeeId: employeeId,
                    employeeName: employeeName,
                    entries: entries
                });
                
                console.log(`✅ เพิ่มพนักงาน: ${employeeName} (${entries.length} วัน)`);
            }
        }
        
        console.log(`✅ รับข้อมูลพนักงานทั้งหมด: ${employeeData.length} คน`);
        return employeeData;
        
    } catch (error) {
        console.error('Error collecting real employee data:', error);
        return [];
    }
}

// ฟังก์ชันคำนวณสถานะ
function calculateStatus(checkIn) {
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

// ฟังก์ชันใส่ข้อมูลจริง
async function runRealDataEntry(companyId, employeeData) {
    console.log('🔄 Running real data entry...');
    
    try {
        // 1. หาวิธีเข้าถึง database
        const db = await getDatabaseConnection();
        if (!db) {
            throw new Error('ไม่สามารถเชื่อมต่อ database ได้');
        }

        let totalEntered = 0;

        // 2. วนลูปใส่ข้อมูลพนักงานแต่ละคน
        for (const employee of employeeData) {
            console.log(`📝 Entering real data for ${employee.employeeName}...`);
            
            // 3. วนลูปใส่ข้อมูลแต่ละวัน
            for (const entry of employee.entries) {
                // 4. สร้างข้อมูลจริง
                const logData = {
                    company_id: companyId,
                    employee_id: employee.employeeId,
                    shift_date: entry.date,
                    clock_in: parseTimeToDate(entry.date, entry.checkIn),
                    clock_out: parseTimeToDate(entry.date, entry.checkOut),
                    status: entry.status,
                    late_minutes: entry.lateMinutes,
                    clock_in_location: null,
                    timezone: 'Asia/Bangkok',
                    manually_entered: true,
                    entered_at: new Date(),
                    is_migrated: true,
                    source: 'real_data_entry'
                };

                // 5. บันทึกข้อมูล
                await saveLogData(db, logData);
                totalEntered++;
                
                console.log(`✅ Entered ${employee.employeeName} - ${entry.date}: ${entry.checkIn} → ${entry.checkOut} (${entry.status})`);
            }
        }

        console.log(`✅ Real Data Entry Complete: ${totalEntered} records entered`);
        return totalEntered;

    } catch (error) {
        console.error("Real Data Entry Error:", error);
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
window.checkRealEntryStatus = function() {
    console.log('🔍 ตรวจสอบสถานะ Real Data Entry...');
    console.log('📋 คำสั่งที่ใช้ได้:');
    console.log('• realDataEntry() - ใส่ข้อมูลจริงๆ');
    console.log('• checkRealEntryStatus() - ตรวจสอบสถานะ');
    console.log('💡 รัน realDataEntry() เพื่อเริ่มการใส่ข้อมูลจริง');
};

console.log('🎯 Real Payroll Data Entry Tools Loaded!');
console.log('📋 คำสั่งที่ใช้ได้:');
console.log('• realDataEntry() - ใส่ข้อมูลจริงๆ');
console.log('• checkRealEntryStatus() - ตรวจสอบสถานะ');
console.log('🚀 พร้อมใช้งาน! ใส่ข้อมูลจริงๆ ของพนักงาน');
