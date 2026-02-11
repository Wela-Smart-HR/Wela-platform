import { AttendanceService } from '../features/attendance/application/AttendanceService.js';
import { InMemoryAttendanceRepository } from '../features/attendance/infrastructure/InMemoryAttendanceRepository.js';
import { Location } from '../features/attendance/domain/value-objects/Location.js';
import { DateUtils } from '../shared/kernel/DateUtils.js';

// 1. Setup: สร้างโลกจำลอง (ใช้ RAM แทน Firebase)
const mockRepo = new InMemoryAttendanceRepository();
const service = new AttendanceService(mockRepo);

// Helper: ฟังก์ชันช่วยปริ้นผลลัพธ์สวยๆ
const logStep = (step, message) => console.log(`\n🔹 [STEP ${step}] ${message}`);
const logSuccess = (msg, extra = '') => console.log(`   ✅ Success: ${msg}`, extra);
const logError = (msg) => console.log(`   ❌ Error (Expected): ${msg}`);
let passed = 0, failed = 0;
const assert = (condition, label) => {
    if (condition) { passed++; console.log(`   🏆 PASS: ${label}`); }
    else { failed++; console.log(`   ⚠️ FAIL: ${label}`); }
};

async function runSimulation() {
    console.log("═══════════════════════════════════════════");
    console.log("🚀 Simulation Test — Location VO + Session Model");
    console.log("═══════════════════════════════════════════");

    const empId = "DEV-001";
    const companyId = "COMPANY-001";

    // จำลองพิกัด GPS (ออฟฟิศ)
    const officeGPS = { lat: 13.7563, lng: 100.5018, address: "Wela HQ" };

    // ==========================================
    // Test 0: Location Value Object Validation
    // ==========================================
    logStep(0, "ทดสอบ Location Value Object");

    const validLoc = Location.create({ lat: 13.7563, lng: 100.5018, address: "Office" });
    assert(validLoc.isSuccess, "Valid GPS (13.75, 100.50) สร้างสำเร็จ");

    const invalidLat = Location.create({ lat: 999, lng: 100 });
    assert(invalidLat.isFailure, "Lat = 999 ถูก reject");

    const missingLng = Location.create({ lat: 13.75 });
    assert(missingLng.isFailure, "Missing lng ถูก reject");

    const nullLoc = Location.create(null);
    assert(nullLoc.isFailure, "null ถูก reject");

    const fromPersist = Location.fromPersistence({ lat: 13.5, lng: 100.2, address: "Old" });
    assert(fromPersist !== null && fromPersist.lat === 13.5, "fromPersistence() ทำงานถูกต้อง");

    const fromNull = Location.fromPersistence(null);
    assert(fromNull === null, "fromPersistence(null) returns null");

    // Equality
    const locA = Location.create({ lat: 13.7563, lng: 100.5018 }).getValue();
    const locB = Location.create({ lat: 13.7563, lng: 100.5018 }).getValue();
    assert(locA.equals(locB), "Value Equality ทำงาน (same coords)");

    // toPrimitives
    const primitives = locA.toPrimitives();
    assert(primitives.lat === 13.7563 && primitives.lng === 100.5018, "toPrimitives() output ถูกต้อง");

    // ==========================================
    // Test 1: Clock In (08:55 — ตรงเวลา)
    // ==========================================
    logStep(1, "พนักงานกดเข้างาน (Clock In) — 08:55");

    const morningTime = new Date("2024-02-14T08:55:00");
    // ✅ New Signature: clockIn(employeeId, companyId, locationData, timestamp, shiftStart)
    const result1 = await service.clockIn(empId, companyId, officeGPS, morningTime);

    assert(result1.isSuccess, "Clock In สำเร็จ");
    if (result1.isSuccess) {
        const data = result1.getValue();
        assert(data.clock_in_location?.lat === 13.7563, "clock_in_location.lat ถูกต้อง");
        assert(data.clock_in_location?.address === "Wela HQ", "clock_in_location.address = 'Wela HQ'");
        assert(data.status === 'on-time', "Status = on-time (ไม่ได้ส่ง shiftStart)");
        assert(data.work_minutes === 0, "work_minutes = 0 (ยังไม่ clock out)");
    }

    // ==========================================
    // Test 2: Double Clock In (ต้องถูก reject)
    // ==========================================
    logStep(2, "มือลั่นกดเข้างานซ้ำ");

    const result2 = await service.clockIn(empId, companyId, officeGPS, morningTime);
    assert(result2.isFailure, "Double Clock In ถูก reject");
    if (result2.isFailure) logError(result2.error);

    // ==========================================
    // Test 3: Clock Out (18:00)
    // ==========================================
    logStep(3, "พนักงานกดออกงาน (Clock Out) — 18:00");

    const eveningTime = new Date("2024-02-14T18:00:00");
    // ✅ New Signature: clockOut(employeeId, locationData, timestamp)
    const result3 = await service.clockOut(empId, officeGPS, eveningTime);

    assert(result3.isSuccess, "Clock Out สำเร็จ");
    if (result3.isSuccess) {
        const data = result3.getValue();
        // 08:55 → 18:00 = 9 ชั่วโมง 5 นาที = 545 นาที
        assert(data.work_minutes === 545, `work_minutes = 545 (got: ${data.work_minutes})`);
        assert(data.clock_out_location?.lat === 13.7563, "clock_out_location.lat ถูกต้อง");
        assert(data.clock_in_location?.address === "Wela HQ", "clock_in_location ยังอยู่ (ไม่หาย)");
    }

    // ==========================================
    // Test 4: Clock In กับ Bad GPS (ต้องถูก reject)
    // ==========================================
    logStep(4, "ทดสอบ GPS ไม่ถูกต้อง");

    const badGPS = { lat: "abc", lng: null };
    const result4 = await service.clockIn("DEV-002", companyId, badGPS, new Date());
    assert(result4.isFailure, "Bad GPS ถูก reject โดย Location.create()");
    if (result4.isFailure) logError(result4.error);

    // ==========================================
    // Test 5: Clock In มาสาย (09:15, กะเริ่ม 09:00)
    // ==========================================
    logStep(5, "พนักงานมาสาย 15 นาที (Clock In 09:15, Shift 09:00)");

    const lateTime = new Date("2024-02-14T09:15:00");
    const shiftStart = new Date("2024-02-14T09:00:00");
    const result5 = await service.clockIn("DEV-003", companyId, officeGPS, lateTime, shiftStart);

    assert(result5.isSuccess, "Clock In (late) สำเร็จ");
    if (result5.isSuccess) {
        const data = result5.getValue();
        assert(data.status === 'late', `Status = 'late' (got: ${data.status})`);
        assert(data.late_minutes === 15, `late_minutes = 15 (got: ${data.late_minutes})`);
    }

    // ==========================================
    // Test 6: Audit DB — ตรวจ toPrimitives() output
    // ==========================================
    logStep(6, "Audit: ตรวจสอบ Schema ใน Database");
    const logInDb = await mockRepo.findLatestByEmployee(empId, morningTime);
    if (logInDb) {
        const p = logInDb.toPrimitives();
        console.table({
            ID: p.id,
            company_id: p.company_id,
            employee_id: p.employee_id,
            clock_in: p.clock_in?.toISOString?.() || p.clock_in,
            clock_out: p.clock_out?.toISOString?.() || p.clock_out,
            'clock_in_location.address': p.clock_in_location?.address,
            'clock_out_location.address': p.clock_out_location?.address,
            status: p.status,
            late_minutes: p.late_minutes,
            work_minutes: p.work_minutes
        });
    }

    // ==========================================
    // Summary
    // ==========================================
    console.log("\n═══════════════════════════════════════════");
    console.log(`📊 Results: ${passed} passed, ${failed} failed`);
    if (failed === 0) console.log("🎉 ALL TESTS PASSED!");
    else console.log("⚠️ SOME TESTS FAILED — Check output above");
    console.log("═══════════════════════════════════════════\n");
}

runSimulation();