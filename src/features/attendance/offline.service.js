/**
 * ===================================================
 * 📴 Offline Service - ระบบจัดการข้อมูลขณะไม่มีเน็ต
 * ===================================================
 * 
 * ไฟล์นี้รับผิดชอบเรื่อง Offline เท่านั้น:
 * - บันทึกข้อมูลลง LocalStorage เมื่อไม่มีเน็ต
 * - ซิงค์ข้อมูลขึ้น Firebase เมื่อมีเน็ต
 * - ตรวจสอบสถานะ Online/Offline
 * 
 * ถ้า Offline มีปัญหา → แก้ไฟล์นี้ไฟล์เดียว
 */

// ============================
// 🔧 ค่าคงที่ (CONSTANTS)
// ============================
const STORAGE_KEY = 'offlineAttendance';  // key เก็บใน LocalStorage

// ============================
// 🌐 ฟังก์ชันตรวจสอบสถานะเน็ต
// ============================

/**
 * เช็คว่าขณะนี้ออนไลน์หรือไม่
 * @returns {boolean} true = มีเน็ต, false = ไม่มีเน็ต
 */
export function isOnline() {
    return navigator.onLine;
}

/**
 * ลงทะเบียน listener เมื่อสถานะเน็ตเปลี่ยน
 * 
 * @param {Function} onOnline - เรียกเมื่อออนไลน์
 * @param {Function} onOffline - เรียกเมื่อออฟไลน์
 * @returns {Function} ฟังก์ชันสำหรับ unsubscribe
 */
export function subscribeToNetworkStatus(onOnline, onOffline) {
    const handleOnline = () => onOnline?.();
    const handleOffline = () => onOffline?.();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // คืนค่า function สำหรับ cleanup
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
}

// ============================
// 💾 ฟังก์ชันจัดการ Queue ใน LocalStorage
// ============================

/**
 * ดึงข้อมูลที่รอ sync ทั้งหมด
 * @returns {Array} รายการข้อมูลที่รอ sync
 */
export function getPendingQueue() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (err) {
        console.error('[Offline] Error reading queue:', err);
        return [];
    }
}

/**
 * เพิ่มข้อมูลเข้า Queue (เมื่อไม่มีเน็ต)
 * 
 * @param {Object} data - ข้อมูล attendance ที่จะบันทึก
 * @returns {boolean} true = สำเร็จ
 */
export function addToQueue(data) {
    try {
        const queue = getPendingQueue();

        // เพิ่ม ID และ timestamp สำหรับติดตาม
        const queueItem = {
            ...data,
            _offlineId: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            _queuedAt: new Date().toISOString()
        };

        queue.push(queueItem);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));

        console.log('[Offline] เพิ่มข้อมูลเข้า Queue:', queueItem._offlineId);
        return true;
    } catch (err) {
        console.error('[Offline] Error adding to queue:', err);
        return false;
    }
}

/**
 * ลบ item ออกจาก Queue (หลัง sync สำเร็จ)
 * 
 * @param {string} offlineId - ID ของ item ที่จะลบ
 * @returns {boolean} true = สำเร็จ
 */
export function removeFromQueue(offlineId) {
    try {
        const queue = getPendingQueue();
        const filtered = queue.filter(item => item._offlineId !== offlineId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return true;
    } catch (err) {
        console.error('[Offline] Error removing from queue:', err);
        return false;
    }
}

/**
 * ล้าง Queue ทั้งหมด
 */
export function clearQueue() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('[Offline] Queue cleared');
    } catch (err) {
        console.error('[Offline] Error clearing queue:', err);
    }
}

/**
 * ดูจำนวน item ที่รอ sync
 * @returns {number} จำนวน items
 */
export function getPendingCount() {
    return getPendingQueue().length;
}

// ============================
// 🔄 ฟังก์ชัน Sync ข้อมูล
// ============================

/**
 * Sync ข้อมูลทั้งหมดขึ้น Firebase
 * 
 * @param {Function} uploadFn - ฟังก์ชันอัปโหลดข้อมูล (item) => Promise
 * @param {Function} onProgress - callback เมื่อ sync แต่ละ item ({ current, total, item })
 * @returns {Promise<Object>} ผลลัพธ์ { success: number, failed: number, errors: [] }
 */
export async function syncPendingData(uploadFn, onProgress) {
    // เช็คก่อนว่ามีเน็ตไหม
    if (!isOnline()) {
        console.log('[Offline] ยังไม่มีเน็ต ยกเลิก sync');
        return { success: 0, failed: 0, errors: ['ไม่มีอินเทอร์เน็ต'] };
    }

    const queue = getPendingQueue();

    if (queue.length === 0) {
        console.log('[Offline] ไม่มีข้อมูลรอ sync');
        return { success: 0, failed: 0, errors: [] };
    }

    console.log(`[Offline] เริ่ม sync ${queue.length} รายการ...`);

    let success = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < queue.length; i++) {
        const item = queue[i];

        try {
            // ลบ internal fields ก่อน upload
            const { _offlineId, _queuedAt, ...cleanData } = item;

            // เรียก uploadFn (จะ throw error ถ้าล้มเหลว)
            await uploadFn(cleanData);

            // ลบออกจาก queue เมื่อสำเร็จ
            removeFromQueue(item._offlineId);
            success++;

            console.log(`[Offline] Sync สำเร็จ: ${item._offlineId}`);

        } catch (err) {
            failed++;
            errors.push({
                id: item._offlineId,
                error: err.message
            });
            console.error(`[Offline] Sync ล้มเหลว: ${item._offlineId}`, err);
        }

        // รายงานความคืบหน้า
        onProgress?.({
            current: i + 1,
            total: queue.length,
            item: item
        });
    }

    console.log(`[Offline] Sync เสร็จ: สำเร็จ ${success}, ล้มเหลว ${failed}`);

    return { success, failed, errors };
}

// ============================
// 📦 Export รวม
// ============================
export const offlineService = {
    isOnline,
    subscribeToNetworkStatus,
    getPendingQueue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    getPendingCount,
    syncPendingData
};
