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
    }
};
