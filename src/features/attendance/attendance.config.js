/**
 * ===================================================
 * ⚙️ Attendance Config Service - ดึงการตั้งค่าบริษัท
 * ===================================================
 * 
 * ไฟล์นี้รับผิดชอบเรื่อง Config เท่านั้น:
 * - ดึงการตั้งค่าที่ตั้งบริษัท (location, radius)
 * - ดึงข้อความทักทาย (greeting)
 * - ดึงกฎการหักเงิน (deduction)
 * 
 * ถ้าต้องเพิ่ม config ใหม่ → แก้ไฟล์นี้ไฟล์เดียว
 */

import { db } from '@/shared/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// ============================
// 🔧 ค่า Default (ถ้าไม่มี config)
// ============================
const DEFAULT_CONFIG = {
    // ตำแหน่งบริษัท (default: กรุงเทพ)
    location: {
        lat: 13.7563,
        lng: 100.5018
    },
    radius: 350,  // รัศมี 350 เมตร
    gpsEnabled: true,

    // ข้อความทักทาย
    greeting: {
        onTime: 'บันทึกเวลาสำเร็จ!',
        late: 'มาสายนะเรา'
    }
};

const DEFAULT_DEDUCTION = {
    gracePeriod: 5,           // ช่วงผ่อนผัน 5 นาที
    deductionPerMinute: 10,   // หักนาทีละ 10 บาท
    maxDeduction: 300         // หักสูงสุด 300 บาท
};

// ============================
// 📥 ฟังก์ชันดึง Config
// ============================

/**
 * ดึงการตั้งค่าบริษัททั้งหมด
 * 
 * @param {string} companyId - ID ของบริษัท
 * @returns {Promise<Object>} { location, radius, greeting, deduction, gpsEnabled }
 */
export async function getCompanyConfig(companyId) {
    if (!companyId) {
        console.warn('[Config] ไม่มี companyId');
        return { ...DEFAULT_CONFIG, deduction: DEFAULT_DEDUCTION };
    }

    try {
        // ดึงข้อมูลพร้อมกัน 3 docs
        const [companyDoc, greetingDoc, deductionDoc] = await Promise.all([
            getDoc(doc(db, 'companies', companyId)),
            getDoc(doc(db, 'companies', companyId, 'settings', 'greeting')),
            getDoc(doc(db, 'companies', companyId, 'settings', 'deduction'))
        ]);

        // === ประมวลผลข้อมูลหลัก ===
        let config = { ...DEFAULT_CONFIG };

        if (companyDoc.exists()) {
            const data = companyDoc.data();

            // ตำแหน่งที่ตั้ง
            if (data.settings?.location) {
                config.location = data.settings.location;
            }

            // รัศมี
            if (data.settings?.radius) {
                config.radius = Number(data.settings.radius);
            }

            // เปิด/ปิด GPS
            if (data.settings?.gpsEnabled !== undefined) {
                config.gpsEnabled = data.settings.gpsEnabled;
            }
        }

        // === ข้อความทักทาย ===
        if (greetingDoc.exists()) {
            const gData = greetingDoc.data();
            config.greeting = {
                onTime: gData.onTimeMessage || DEFAULT_CONFIG.greeting.onTime,
                late: gData.lateMessage || DEFAULT_CONFIG.greeting.late
            };
        }

        // === กฎการหักเงิน ===
        let deduction = { ...DEFAULT_DEDUCTION };
        if (deductionDoc.exists()) {
            const dData = deductionDoc.data();
            deduction = {
                gracePeriod: Number(dData.gracePeriod) || DEFAULT_DEDUCTION.gracePeriod,
                deductionPerMinute: Number(dData.deductionPerMinute) || DEFAULT_DEDUCTION.deductionPerMinute,
                maxDeduction: Number(dData.maxDeduction) || DEFAULT_DEDUCTION.maxDeduction
            };
        }

        return {
            ...config,
            deduction
        };

    } catch (err) {
        console.error('[Config] Error fetching config:', err);
        return { ...DEFAULT_CONFIG, deduction: DEFAULT_DEDUCTION };
    }
}

/**
 * ดึงเฉพาะตำแหน่งบริษัท (ใช้ตอน validate GPS)
 * 
 * @param {string} companyId - ID ของบริษัท
 * @returns {Promise<Object>} { location, radius }
 */
export async function getLocationConfig(companyId) {
    const config = await getCompanyConfig(companyId);
    return {
        location: config.location,
        radius: config.radius,
        gpsEnabled: config.gpsEnabled
    };
}

/**
 * ดึงเฉพาะข้อความทักทาย
 * 
 * @param {string} companyId - ID ของบริษัท
 * @returns {Promise<Object>} { onTime, late }
 */
export async function getGreetingConfig(companyId) {
    const config = await getCompanyConfig(companyId);
    return config.greeting;
}

/**
 * ดึงเฉพาะกฎหักเงิน
 * 
 * @param {string} companyId - ID ของบริษัท
 * @returns {Promise<Object>} { gracePeriod, deductionPerMinute, maxDeduction }
 */
export async function getDeductionConfig(companyId) {
    const config = await getCompanyConfig(companyId);
    return config.deduction;
}

// ============================
// 📦 Export รวม
// ============================
export const attendanceConfigService = {
    getCompanyConfig,
    getLocationConfig,
    getGreetingConfig,
    getDeductionConfig,
    DEFAULT_CONFIG,
    DEFAULT_DEDUCTION
};
