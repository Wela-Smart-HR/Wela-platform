import { Result } from './Result.js';

export class Guard {
    /**
     * ตรวจสอบค่าว่าง (null หรือ undefined)
     * @param {any} value 
     * @param {string} argumentName 
     */
    static againstNullOrUndefined(value, argumentName) {
        if (value === null || value === undefined) {
            return Result.fail(`${argumentName} is null or undefined`);
        }
        return Result.ok();
    }

    /**
     * ตรวจสอบสตริงว่าง หรือมีแต่ช่องว่าง (Whitespace)
     * @param {string} value 
     * @param {string} argumentName 
     */
    static againstEmptyString(value, argumentName) {
        const nullCheck = this.againstNullOrUndefined(value, argumentName);
        if (nullCheck.isFailure) return nullCheck;

        if (typeof value === 'string' && value.trim().length === 0) {
            return Result.fail(`${argumentName} is empty`);
        }
        return Result.ok();
    }

    /**
     * ตรวจสอบค่าติดลบ (สำหรับเงินเดือน/ชั่วโมงงาน)
     * @param {number} value 
     * @param {string} argumentName 
     */
    static againstNegative(value, argumentName) {
        const nullCheck = this.againstNullOrUndefined(value, argumentName);
        if (nullCheck.isFailure) return nullCheck;

        if (typeof value === 'number' && value < 0) {
            return Result.fail(`${argumentName} cannot be negative`);
        }
        return Result.ok();
    }

    /**
     * ตรวจสอบความยาวขั้นต่ำ (เช่น รหัสผ่าน, ชื่อ)
     */
    static againstAtLeast(value, minLength, argumentName) {
        const emptyCheck = this.againstEmptyString(value, argumentName);
        if (emptyCheck.isFailure) return emptyCheck;

        if (value.length < minLength) {
            return Result.fail(`${argumentName} must be at least ${minLength} characters`);
        }
        return Result.ok();
    }

    /**
     * ตรวจสอบเงื่อนไขหลายอย่างพร้อมกัน
     * @param {Result[]} results 
     */
    static combine(results) {
        for (const result of results) {
            if (result.isFailure) return result;
        }
        return Result.ok();
    }
}