// ============================================================================
// Mock Data (จำลองข้อมูลในฐานข้อมูล)
// ============================================================================
const mockWorkflowRules = {
    'rule_large_leave': {
        companyId: 'comp_large',
        type: 'leave',
        steps: [
            { role: 'supervisor', label: 'หัวหน้าแผนก' },
            { role: 'manager', label: 'ผู้จัดการสาขา' }
        ]
    },
    'rule_small_leave': {
        companyId: 'comp_small',
        type: 'leave',
        steps: [
            { role: 'owner', label: 'เจ้าของร้าน' }
        ]
    }
};

let mockRequestsDB = {}; // จำลอง Collection requests
let mockLogsDB = [];     // จำลอง Collection request_logs

// ============================================================================
// System Under Test (จำลอง Business Logic ของ requests.repo.js)
// ============================================================================
class RequestRepo {
    static async createRequest(user, ruleId, requestData) {
        const rule = mockWorkflowRules[ruleId];
        if (!rule) throw new Error("Workflow Rule not found");

        const documentNo = `REQ-202602-${Object.keys(mockRequestsDB).length + 1}`;

        // การฝัง Snapshot กติกาลงไปในเอกสาร
        const newRequest = {
            id: documentNo,
            userId: user.id,
            branchId: user.branchId,
            departmentId: user.departmentId,
            status: 'pending',
            currentStepIndex: 0,
            totalSteps: rule.steps.length,
            approverRole: rule.steps[0].role, // ดึง Role ของคนแรกมา
            workflowSnapshot: rule.steps,     // เก็บ Snapshot กัน HR เปลี่ยนกติกา
            ...requestData
        };

        mockRequestsDB[documentNo] = newRequest;

        // บันทึก Log การสร้าง
        mockLogsDB.push({ requestId: documentNo, action: 'CREATED', by: user.id, timestamp: new Date() });
        return newRequest;
    }

    static async approveRequest(requestId, approverUser, comment = "") {
        const request = mockRequestsDB[requestId];
        if (!request) throw new Error("Request not found");
        if (request.status !== 'pending') throw new Error("Request is not pending");

        // ตรวจสอบสิทธิ์ (Branch Isolation & Role)
        const GLOBAL_ROLES = ['owner', 'admin', 'hr'];
        if (request.branchId !== approverUser.branchId) {
            if (!GLOBAL_ROLES.includes(approverUser.role)) {
                throw new Error("Unauthorized: Branch mismatch");
            }
        }
        if (request.approverRole !== approverUser.role) {
            throw new Error("Unauthorized: Role mismatch");
        }

        const isFinalStep = request.currentStepIndex >= request.totalSteps - 1;

        if (!isFinalStep) {
            // กรณียังมีขั้นต่อไป (Intermediate Step)
            request.currentStepIndex += 1;
            request.approverRole = request.workflowSnapshot[request.currentStepIndex].role;
            mockLogsDB.push({ requestId, action: 'APPROVED_AND_FORWARDED', by: approverUser.id, comment });
        } else {
            // กรณีเป็นขั้นสุดท้าย (Final Step)
            request.status = 'approved';
            mockLogsDB.push({ requestId, action: 'APPROVED_FINAL', by: approverUser.id, comment });
            // TODO: Execute final logic (Update Schedule/Attendance)
        }

        return request;
    }
}

// ============================================================================
// Test Suite (ชุดการทดสอบ)
// ============================================================================
describe('Document Request & Approval System', () => {

    beforeEach(() => {
        // ล้างข้อมูลก่อนเริ่มเทสต์แต่ละข้อ
        mockRequestsDB = {};
        mockLogsDB = [];
    });

    const staffUser = { id: 'u1', role: 'staff', branchId: 'BKK01', departmentId: 'Kitchen' };
    const supervisorUser = { id: 'u2', role: 'supervisor', branchId: 'BKK01' };
    const managerUser = { id: 'u3', role: 'manager', branchId: 'BKK01' };
    const otherBranchManager = { id: 'u4', role: 'manager', branchId: 'CNX01' }; // คนละสาขา
    const ownerUser = { id: 'u5', role: 'owner', branchId: 'HQ' };

    test('1. Multi-Step Flow: ควรสร้างเอกสารแบบ 2 ขั้นตอนได้ถูกต้อง', async () => {
        const req = await RequestRepo.createRequest(staffUser, 'rule_large_leave', { reason: 'ป่วย' });

        expect(req.totalSteps).toBe(2);
        expect(req.currentStepIndex).toBe(0);
        expect(req.approverRole).toBe('supervisor'); // รอหัวหน้าแผนกอนุมัติ
        expect(req.status).toBe('pending');
        expect(mockLogsDB.length).toBe(1); // มี Log การสร้าง
    });

    test('2. Multi-Step Flow: การอนุมัติขั้นที่ 1 (Supervisor) ระบบต้องส่งต่อให้ Manager', async () => {
        // 1. สร้างเอกสารก่อน
        const req = await RequestRepo.createRequest(staffUser, 'rule_large_leave', { reason: 'ป่วย' });

        // 2. Supervisor กดอนุมัติ
        const updatedReq = await RequestRepo.approveRequest(req.id, supervisorUser, 'รับทราบ ขอให้หายไวๆ');

        expect(updatedReq.status).toBe('pending'); // ยังไม่จบ
        expect(updatedReq.currentStepIndex).toBe(1); // เลื่อนขั้น
        expect(updatedReq.approverRole).toBe('manager'); // เปลี่ยนคนรออนุมัติเป็น Manager

        // เช็ค Log ว่าถูกบันทึกไหม
        const latestLog = mockLogsDB[mockLogsDB.length - 1];
        expect(latestLog.action).toBe('APPROVED_AND_FORWARDED');
        expect(latestLog.by).toBe(supervisorUser.id);
    });

    test('3. Multi-Step Flow: การอนุมัติขั้นสุดท้าย (Manager) ระบบต้องเปลี่ยนสถานะเป็น Approved', async () => {
        const req = await RequestRepo.createRequest(staffUser, 'rule_large_leave', { reason: 'ป่วย' });
        await RequestRepo.approveRequest(req.id, supervisorUser, 'ผ่าน'); // ขั้น 1

        // Manager กดอนุมัติ (ขั้นสุดท้าย)
        const finalReq = await RequestRepo.approveRequest(req.id, managerUser, 'อนุมัติเรียบร้อย');

        expect(finalReq.status).toBe('approved'); // เอกสารสมบูรณ์
        expect(mockLogsDB[mockLogsDB.length - 1].action).toBe('APPROVED_FINAL');
    });

    test('4. Branch Isolation: Manager ข้ามสาขา จะไม่สามารถอนุมัติเอกสารได้', async () => {
        const req = await RequestRepo.createRequest(staffUser, 'rule_large_leave', { reason: 'ป่วย' });
        await RequestRepo.approveRequest(req.id, supervisorUser, 'ผ่าน'); // ขั้น 1 จบ

        // Manager สาขาเชียงใหม่ (CNX01) พยายามมากดอนุมัติของสาขากรุงเทพ (BKK01)
        await expect(
            RequestRepo.approveRequest(req.id, otherBranchManager, 'แอบกดอนุมัติ')
        ).rejects.toThrow('Unauthorized: Branch mismatch');
    });

    test('5. Single-Step Flow: ร้านเล็กที่มีแค่ Owner ต้องอนุมัติทีเดียวจบ', async () => {
        // ใช้ Rule ของร้านเล็ก (มีแค่ Owner)
        const req = await RequestRepo.createRequest(staffUser, 'rule_small_leave', { reason: 'ลากิจ' });

        expect(req.totalSteps).toBe(1);
        expect(req.approverRole).toBe('owner');

        // Owner คนเดียวหน้าเดียวจบ
        const finalReq = await RequestRepo.approveRequest(req.id, ownerUser, 'โอเค ไปได้');

        expect(finalReq.status).toBe('approved');
        expect(mockLogsDB[mockLogsDB.length - 1].action).toBe('APPROVED_FINAL');
    });
});