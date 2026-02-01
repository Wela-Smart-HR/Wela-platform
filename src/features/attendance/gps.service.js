/**
 * ===================================================
 * 📍 GPS Service - ระบบติดตามตำแหน่ง
 * ===================================================
 * 
 * ไฟล์นี้รับผิดชอบเรื่อง GPS เท่านั้น:
 * - เริ่มติดตามตำแหน่ง (startTracking)
 * - หยุดติดตาม (stopTracking)
 * - คำนวณระยะทาง (calculateDistance)
 * - เช็คว่าอยู่ในรัศมีไหม (isWithinRadius)
 * 
 * ถ้า GPS มีปัญหา → แก้ไฟล์นี้ไฟล์เดียว
 */

// ============================
// 🔧 ค่าคงที่ (CONSTANTS)
// ============================
const GPS_OPTIONS = {
    HIGH_ACCURACY: {
        enableHighAccuracy: true,
        timeout: 20000,          // เพิ่มเป็น 20 วินาที
        maximumAge: 10000,       // ยอมรับค่าเก่าได้ 10 วินาที (ลด Loop Timeout)
        distanceFilter: 5
    },
    LOW_ACCURACY: {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 30000,       // ยอมรับค่าเก่าได้ 30 วินาที
        distanceFilter: 5
    }
};

// รหัส Error จาก Browser Geolocation API
const GPS_ERROR_CODES = {
    PERMISSION_DENIED: 1,        // ผู้ใช้ปฏิเสธ
    POSITION_UNAVAILABLE: 2,     // หาตำแหน่งไม่ได้
    TIMEOUT: 3                   // หมดเวลา
};

// ============================
// 📐 ฟังก์ชันคำนวณระยะทาง
// ============================

/**
 * คำนวณระยะห่างระหว่าง 2 จุด (หน่วยเมตร)
 * ใช้สูตร Haversine Formula
 * 
 * @param {number} lat1 - ละติจูดจุดที่ 1
 * @param {number} lng1 - ลองจิจูดจุดที่ 1
 * @param {number} lat2 - ละติจูดจุดที่ 2
 * @param {number} lng2 - ลองจิจูดจุดที่ 2
 * @returns {number} ระยะทางเป็นเมตร
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // รัศมีโลก (เมตร)
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // ระยะทางเป็นเมตร
}

/**
 * เช็คว่าตำแหน่งอยู่ในรัศมีที่กำหนดหรือไม่
 * 
 * @param {Object} userLocation - ตำแหน่งผู้ใช้ { lat, lng }
 * @param {Object} targetLocation - ตำแหน่งเป้าหมาย { lat, lng }
 * @param {number} radiusMeters - รัศมี (เมตร)
 * @returns {boolean} true ถ้าอยู่ในรัศมี
 */
export function isWithinRadius(userLocation, targetLocation, radiusMeters) {
    const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        targetLocation.lat,
        targetLocation.lng
    );
    return distance <= radiusMeters;
}

// ============================
// 📍 ฟังก์ชันติดตาม GPS
// ============================

/**
 * เริ่มติดตามตำแหน่ง GPS แบบ Real-time
 * 
 * @param {Object} options - ตัวเลือก
 * @param {Function} options.onSuccess - เรียกเมื่อได้ตำแหน่ง (position) => {}
 * @param {Function} options.onError - เรียกเมื่อ error (errorInfo) => {}
 * @param {boolean} options.highAccuracy - ใช้ความแม่นยำสูง (default: true)
 * @returns {Object} { watchId, stop } - watchId และ function หยุดติดตาม
 */
export function startTracking(options) {
    const { onSuccess, onError, highAccuracy = true } = options;

    // ตรวจสอบว่า Browser รองรับไหม
    if (!navigator.geolocation) {
        onError?.({
            code: 'NOT_SUPPORTED',
            message: 'เบราว์เซอร์ไม่รองรับ GPS',
            canRetry: false
        });
        return { watchId: null, stop: () => { } };
    }

    // เลือก options ตามระดับความแม่นยำ
    const gpsOptions = highAccuracy
        ? GPS_OPTIONS.HIGH_ACCURACY
        : GPS_OPTIONS.LOW_ACCURACY;

    // ===== Success Handler =====
    const handleSuccess = (position) => {
        onSuccess?.({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,  // ความแม่นยำ (เมตร)
            timestamp: position.timestamp
        });
    };

    // ===== Error Handler =====
    const handleError = (error) => {
        let errorInfo = {
            code: error.code,
            message: '',
            canRetry: false,
            shouldFallback: false  // ควรลอง Low Accuracy แทนไหม
        };

        switch (error.code) {
            case GPS_ERROR_CODES.PERMISSION_DENIED:
                errorInfo.message = 'กรุณาอนุญาตการเข้าถึงตำแหน่งในการตั้งค่าเบราว์เซอร์';
                errorInfo.canRetry = false;
                break;
            case GPS_ERROR_CODES.POSITION_UNAVAILABLE:
                errorInfo.message = 'ไม่สามารถระบุตำแหน่งได้ กรุณาตรวจสอบสัญญาณ GPS';
                errorInfo.canRetry = true;
                errorInfo.shouldFallback = highAccuracy; // ลอง Low Accuracy
                break;
            case GPS_ERROR_CODES.TIMEOUT:
                errorInfo.message = 'หมดเวลาในการค้นหาตำแหน่ง';
                errorInfo.canRetry = true;
                errorInfo.shouldFallback = highAccuracy;
                break;
            default:
                errorInfo.message = 'เกิดข้อผิดพลาดในการค้นหาตำแหน่ง';
                errorInfo.canRetry = true;
        }

        onError?.(errorInfo);
    };

    // เริ่มติดตาม
    const watchId = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        gpsOptions
    );

    // คืนค่า watchId และ function หยุดติดตาม
    return {
        watchId,
        stop: () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        }
    };
}

/**
 * หยุดติดตาม GPS
 * 
 * @param {number} watchId - ID จาก startTracking
 */
export function stopTracking(watchId) {
    if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
    }
}

/**
 * ขอตำแหน่งครั้งเดียว (ไม่ติดตามต่อเนื่อง)
 * 
 * @param {boolean} highAccuracy - ใช้ความแม่นยำสูงหรือไม่
 * @returns {Promise<Object>} ตำแหน่ง { lat, lng, accuracy }
 */
export function getCurrentPosition(highAccuracy = true) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject({ code: 'NOT_SUPPORTED', message: 'เบราว์เซอร์ไม่รองรับ GPS' });
            return;
        }

        const options = highAccuracy
            ? GPS_OPTIONS.HIGH_ACCURACY
            : GPS_OPTIONS.LOW_ACCURACY;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                reject({
                    code: error.code,
                    message: error.message || 'ไม่สามารถระบุตำแหน่งได้'
                });
            },
            options
        );
    });
}

// ============================
// 📦 Export รวม
// ============================
export const gpsService = {
    startTracking,
    stopTracking,
    getCurrentPosition,
    calculateDistance,
    isWithinRadius
};
