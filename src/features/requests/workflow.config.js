/**
 * WORKFLOW RULES (Configuration)
 * In production, this should be fetched from Firestore 'workflow_rules' collection
 * but we hardcode it here for reliability and speed during this phase.
 */
export const WORKFLOW_RULES = {
    'leave': (data) => {
        // Case: Sick Leave > 3 days -> Needs Manager
        if (data.leaveType === 'Sick Leave' && data.days > 3) {
            return {
                conditions: { minDays: 3 },
                steps: [
                    { role: 'supervisor', label: 'หัวหน้างาน (Supervisor)' },
                    { role: 'manager', label: 'ผู้จัดการสาขา (Branch Manager)' }
                ]
            };
        }
        // Default Leave -> 1 Step (Supervisor)
        return {
            conditions: {},
            steps: [
                { role: 'supervisor', label: 'หัวหน้างาน (Supervisor)' }
            ]
        };
    },
    'attendance-adjustment': (data) => {
        // Adjustments always 1 step (Supervisor is enough)
        return {
            conditions: {},
            steps: [
                { role: 'supervisor', label: 'หัวหน้างาน (Supervisor)' }
            ]
        };
    },

    // Alias: 'retro' uses same rules as 'attendance-adjustment'
    'retro': (data) => {
        return {
            conditions: {},
            steps: [
                { role: 'supervisor', label: 'หัวหน้างาน (Supervisor)' }
            ]
        };
    },

    /**
     * Unscheduled Work Request
     * เมื่อพนักงานทำงานโดยไม่มีตารางงาน (กะ) กำหนดไว้
     * ต้องส่งคำขอให้ Admin อนุมัติเพื่อให้นับเป็นวันทำงานจริง
     * เมื่ออนุมัติแล้ว ระบบจะสร้าง schedule doc ย้อนหลังอัตโนมัติ
     */
    'unscheduled-work': (data) => {
        return {
            conditions: {},
            steps: [
                { role: 'supervisor', label: 'หัวหน้างาน (Supervisor)' }
            ]
        };
    }
};
