import { Result } from '../../../../shared/kernel/Result.js';

/**
 * Location Value Object
 * จัดการข้อมูล GPS ให้เป็นมาตรฐานเดียว พร้อม Validation
 * 
 * ใช้กับทั้ง clockInLocation และ clockOutLocation
 * 
 * คุณสมบัติ:
 * - Immutable (แก้ค่าไม่ได้)
 * - Validated (lat/lng ต้องอยู่ในช่วงที่ถูกต้อง)
 * - Equality by value (เปรียบเทียบด้วยค่า ไม่ใช่ reference)
 */
export class Location {

    constructor(lat, lng, address) {
        this.lat = lat;
        this.lng = lng;
        this.address = address || '';
        Object.freeze(this);
    }

    /**
     * Factory Method — สร้าง Location พร้อม validate
     * @param {Object} props - { lat, lng, address? }
     * @returns {Result<Location>}
     */
    static create(props) {
        // 1. ต้องมี lat, lng
        if (props == null) {
            return Result.fail('Location data is required');
        }

        const { lat, lng, address } = props;

        if (lat == null || lng == null) {
            return Result.fail('Latitude and Longitude are required');
        }

        // 2. ต้องเป็นตัวเลข
        const latNum = Number(lat);
        const lngNum = Number(lng);

        if (isNaN(latNum) || isNaN(lngNum)) {
            return Result.fail('Latitude and Longitude must be valid numbers');
        }

        // 3. ช่วงที่ถูกต้อง
        if (latNum < -90 || latNum > 90) {
            return Result.fail(`Invalid latitude: ${latNum} (must be -90 to 90)`);
        }
        if (lngNum < -180 || lngNum > 180) {
            return Result.fail(`Invalid longitude: ${lngNum} (must be -180 to 180)`);
        }

        return Result.ok(new Location(latNum, lngNum, address || ''));
    }

    /**
     * สร้าง Location จาก Firestore data (ไว้ใช้ใน toDomain)
     * ถ้า data เป็น null/undefined → return null (ไม่ fail)
     * @param {Object|null} data - { lat, lng, address }
     * @returns {Location|null}
     */
    static fromPersistence(data) {
        if (!data) return null;

        // Legacy support: บาง doc เก่าอาจเก็บแค่ { address: "..." } ไม่มี lat/lng
        if (data.lat == null && data.lng == null) {
            return new Location(0, 0, data.address || 'Unknown Location');
        }

        return new Location(
            Number(data.lat) || 0,
            Number(data.lng) || 0,
            data.address || ''
        );
    }

    /**
     * แปลงเป็น Plain Object สำหรับ Firestore
     * @returns {{ lat: number, lng: number, address: string }}
     */
    toPrimitives() {
        return {
            lat: this.lat,
            lng: this.lng,
            address: this.address
        };
    }

    /**
     * เปรียบเทียบกับ Location อื่น (Value Equality)
     * @param {Location} other
     * @returns {boolean}
     */
    equals(other) {
        if (!(other instanceof Location)) return false;
        return this.lat === other.lat && this.lng === other.lng;
    }

    toString() {
        return `Lat: ${this.lat.toFixed(5)}, Lng: ${this.lng.toFixed(5)}`;
    }
}
