# 🚀 Migration Plan: hooks/admin/ → features/

**เป้าหมาย:** ย้าย hooks ทั้งหมดจาก `hooks/admin/` เข้า `features/` เพื่อให้ code maintainable และ debug ง่ายขึ้น

**Timeline:** 3 สัปดาห์  
**Risk Level:** 🟡 Medium (ต้องทดสอบให้ดี)  
**Status:** 📋 Planned

---

## 📊 Overview

### ไฟล์ที่ต้องย้าย (4 hooks):
```
hooks/admin/
├── useEmployees.js        → features/people/usePeople.js
├── useAdminRequests.js    → features/requests/useRequests.js
├── useCompanySettings.js  → features/settings/useSettings.js
├── usePayroll.js          → features/payroll/usePayroll.js
└── usePayrollOverview.js  → features/payroll/usePayroll.js (merge)
```

### หน้าที่กระทบ (6 หน้า):
- `pages/admin/People.jsx`
- `pages/admin/Requests.jsx`
- `pages/admin/Settings.jsx`
- `pages/admin/Payroll.jsx`
- (ไม่กระทบ employee pages เพราะใช้ hooks อื่น)

---

## 🎯 Phase 1: People Feature (Week 1)

### Day 1: Setup & Create Hook

#### 1.1 สร้างไฟล์ใหม่
```bash
# สร้าง usePeople.js
touch src/features/people/usePeople.js
```

#### 1.2 ย้าย logic
**ไฟล์:** `features/people/usePeople.js`

```javascript
import { useState, useEffect } from 'react';
import { peopleRepo } from './people.repo';
import { peopleRules } from './people.rules';

export function usePeople() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Load Employees (admin)
  const loadEmployees = async (companyId) => {
    setLoading(true);
    try {
      const data = await peopleRepo.getEmployeesByCompany(companyId);
      setEmployees(data);
    } catch (error) {
      console.error('Load employees error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ✅ Create Employee (admin)
  const createEmployee = async (employeeData) => {
    // Validation
    peopleRules.validateEmployee(employeeData);
    
    // Create
    const newEmployee = await peopleRepo.createEmployee(employeeData);
    
    // Update state
    setEmployees(prev => [...prev, newEmployee]);
    return newEmployee;
  };

  // ✅ Update Employee (admin + employee)
  const updateEmployee = async (id, updates) => {
    peopleRules.validateEmployee(updates);
    await peopleRepo.updateEmployee(id, updates);
    
    setEmployees(prev => 
      prev.map(emp => emp.id === id ? { ...emp, ...updates } : emp)
    );
  };

  // ✅ Delete Employee (admin)
  const deleteEmployee = async (id) => {
    // Validation (ห้ามลบ owner)
    const employee = employees.find(e => e.id === id);
    peopleRules.validateDelete(employee);
    
    await peopleRepo.deleteEmployee(id);
    
    setEmployees(prev => prev.filter(emp => emp.id !== id));
  };

  // ✅ Get Profile (employee)
  const getProfile = async (userId) => {
    return await peopleRepo.getEmployeeById(userId);
  };

  return {
    // State
    employees,
    loading,
    
    // Methods
    loadEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getProfile,
  };
}
```

---

### Day 2: Update Pages

#### 2.1 แก้ People.jsx
**ไฟล์:** `pages/admin/People.jsx`

```diff
- import { useEmployees } from '@/hooks/admin/useEmployees';
+ import { usePeople } from '@/features/people/usePeople';

function People() {
-  const { employees, loading, createEmployee, updateEmployee, deleteEmployee } = useEmployees();
+  const { employees, loading, createEmployee, updateEmployee, deleteEmployee } = usePeople();
  
  // ... rest of code (ไม่ต้องเปลี่ยน)
}
```

#### 2.2 แก้ Profile.jsx (employee)
**ไฟล์:** `pages/employee/Profile.jsx`

```diff
+ import { usePeople } from '@/features/people/usePeople';

function Profile() {
+  const { getProfile, updateEmployee } = usePeople();
  
  // ... ใช้ getProfile() แทน direct Firestore calls
}
```

---

### Day 3: Testing & Validation

#### ✅ Test Checklist - People Feature

**Admin Tests:**
- [ ] เปิดหน้า People.jsx → โหลดพนักงานได้
- [ ] เพิ่มพนักงาน → บันทึกสำเร็จ
- [ ] แก้ไขพนักงาน → อัพเดทได้
- [ ] ลบพนักงาน → ลบได้
- [ ] ลบ owner → แสดง error (validation ถูก)

**Employee Tests:**
- [ ] เปิดหน้า Profile → ดูข้อมูลได้
- [ ] แก้ไขโปรไฟล์ → อัพเดทได้

**Error Handling:**
- [ ] ไม่มี internet → แสดง error ถูกต้อง
- [ ] Validation failed → แสดง error ถูกต้อง

#### 📸 Screenshot Required:
- หน้า People (list employees)
- Modal เพิ่มพนักงาน (success)
- Modal ลบพนักงาน (confirmation)
- หน้า Profile (employee)

---

### Day 3: Cleanup

```bash
# ลบไฟล์เก่า (ถ้าทดสอบเรียบร้อย)
rm src/hooks/admin/useEmployees.js

# Commit
git add .
git commit -m "✨ Migrate useEmployees → usePeople"
git push
```

---

## 🎯 Phase 2: Requests Feature (Week 2)

### Day 1: Create Hook

**ไฟล์:** `features/requests/useRequests.js`

```javascript
export function useRequests() {
  // ✅ Load Requests (admin + employee)
  const loadRequests = async (filters) => { ... };
  
  // ✅ Create Request (employee)
  const createRequest = async (requestData) => { ... };
  
  // ✅ Approve Request (admin)
  const approveRequest = async (requestId) => { ... };
  
  // ✅ Reject Request (admin)
  const rejectRequest = async (requestId) => { ... };
  
  return {
    requests,
    loading,
    loadRequests,
    createRequest,
    approveRequest,
    rejectRequest,
  };
}
```

### Day 2: Update Pages

**Admin:**
```diff
// pages/admin/Requests.jsx
- import { useAdminRequests } from '@/hooks/admin/useAdminRequests';
+ import { useRequests } from '@/features/requests/useRequests';
```

**Employee:**
```diff
// pages/employee/MyRequests.jsx
+ import { useRequests } from '@/features/requests/useRequests';
// แทน direct Firestore calls
```

### Day 3: Testing

#### ✅ Test Checklist - Requests Feature

**Admin Tests:**
- [ ] โหลดคำขอทั้งหมด
- [ ] อนุมัติคำขอ → status เปลี่ยนเป็น approved
- [ ] ปฏิเสธคำขอ → status เปลี่ยนเป็น rejected
- [ ] Filter by status → ทำงานได้

**Employee Tests:**
- [ ] ยื่นใบลา → สร้างได้
- [ ] ยื่นแก้เวลา → สร้างได้
- [ ] ดูประวัติคำขอ → แสดงถูกต้อง

### Cleanup
```bash
rm src/hooks/admin/useAdminRequests.js
git commit -m "✨ Migrate useAdminRequests → useRequests"
```

---

## 🎯 Phase 3: Settings Feature (Week 2)

### Day 1: Create Hook

**ไฟล์:** `features/settings/useSettings.js`

```javascript
export function useSettings() {
  // ✅ Load Settings
  const loadSettings = async (companyId) => { ... };
  
  // ✅ Update GPS Location
  const updateLocation = async (location) => { ... };
  
  // ✅ Update Shifts
  const updateShifts = async (shifts) => { ... };
  
  // ✅ Update OT Types
  const updateOTTypes = async (otTypes) => { ... };
  
  return {
    settings,
    loading,
    loadSettings,
    updateLocation,
    updateShifts,
    updateOTTypes,
  };
}
```

### Day 2: Update Pages

```diff
// pages/admin/Settings.jsx
- import { useCompanySettings } from '@/hooks/admin/useCompanySettings';
+ import { useSettings } from '@/features/settings/useSettings';
```

### Day 3: Testing

#### ✅ Test Checklist - Settings Feature

- [ ] โหลดการตั้งค่า
- [ ] แก้ GPS location → บันทึกได้
- [ ] เพิ่ม/ลบ shift → อัพเดทได้
- [ ] เพิ่ม/ลบ OT type → อัพเดทได้
- [ ] Validation ทำงานถูก

### Cleanup
```bash
rm src/hooks/admin/useCompanySettings.js
git commit -m "✨ Migrate useCompanySettings → useSettings"
```

---

## 🎯 Phase 4: Payroll Feature (Week 3)

### Day 1-2: Merge Hooks

**ไฟล์:** `features/payroll/usePayroll.js`

```javascript
export function usePayroll() {
  // ✅ From usePayroll.js
  const generatePayslips = async (month, year) => { ... };
  const calculateSalary = async (employeeId) => { ... };
  
  // ✅ From usePayrollOverview.js
  const getOverview = async (month, year) => { ... };
  const getStats = async () => { ... };
  
  // ✅ For Employee (usePayslip already exists)
  const getMyPayslip = async (employeeId, month) => { ... };
  
  return {
    // Admin
    generatePayslips,
    calculateSalary,
    getOverview,
    getStats,
    
    // Employee
    getMyPayslip,
  };
}
```

### Day 3: Update Pages

```diff
// pages/admin/Payroll.jsx
- import { usePayroll } from '@/hooks/admin/usePayroll';
- import { usePayrollOverview } from '@/hooks/admin/usePayrollOverview';
+ import { usePayroll } from '@/features/payroll/usePayroll';

- const payroll = usePayroll();
- const overview = usePayrollOverview();
+ const { generatePayslips, getOverview, getStats } = usePayroll();
```

### Day 4: Testing

#### ✅ Test Checklist - Payroll Feature

**Admin Tests:**
- [ ] สร้างสลิปเงินเดือน
- [ ] ดู overview
- [ ] ดู stats
- [ ] คำนวณเงินเดือน

**Employee Tests:**
- [ ] ดูสลิปเงินเดือนของตัวเอง
- [ ] Download PDF

### Day 5: Cleanup

```bash
rm src/hooks/admin/usePayroll.js
rm src/hooks/admin/usePayrollOverview.js
rm -rf src/hooks/admin  # ลบ folder (ถ้าว่างเปล่า)

git commit -m "✨ Migrate & merge Payroll hooks"
```

---

## 🧪 Final Testing (Week 3 - Day 5)

### ✅ Complete System Test

#### Admin Flow:
1. [ ] Login as admin
2. [ ] Dashboard → ดูข้อมูลได้
3. [ ] People → เพิ่ม/แก้/ลบพนักงาน
4. [ ] Requests → อนุมัติ/ปฏิเสธคำขอ
5. [ ] Settings → แก้การตั้งค่า
6. [ ] Payroll → สร้างสลิป
7. [ ] Schedule → จัดตาราง
8. [ ] Logout

#### Employee Flow:
1. [ ] Login as employee
2. [ ] Profile → ดูข้อมูล
3. [ ] Payslip → ดูสลิป
4. [ ] MyRequests → ยื่นคำขอ
5. [ ] TimeAttendance → ลงเวลา
6. [ ] Logout

---

## 🔄 Rollback Plan (ถ้ามีปัญหา)

### ถ้า Phase ใดพัง:

```bash
# 1. Revert commit
git revert HEAD

# 2. ย้ายไฟล์กลับ
cp features/people/usePeople.js hooks/admin/useEmployees.js

# 3. แก้ import กลับ
# pages/admin/People.jsx
- import { usePeople } from '@/features/people/usePeople';
+ import { useEmployees } from '@/hooks/admin/useEmployees';

# 4. Test
npm run dev

# 5. Push
git push
```

---

## 📋 Post-Migration Checklist

### After All Phases Complete:

- [ ] ลบ `hooks/admin/` folder
- [ ] อัพเดท documentation
- [ ] สร้าง PR สำหรับ review
- [ ] Deploy to staging
- [ ] Test on staging
- [ ] Deploy to production
- [ ] Monitor for 7 days

---

## 📊 Success Metrics

**ก่อน Migration:**
- logic กระจาย 3-4 ไฟล์
- แก้ไข: 15-30 นาที
- debug ยาก

**หลัง Migration:**
- logic อยู่ที่เดียว
- แก้ไข: 2-5 นาที
- debug ง่าย 5-10 เท่า

**KPI:**
- 🎯 Code maintainability: +70%
- 🎯 Debug time: -80%
- 🎯 Onboarding time (dev ใหม่): -60%

---

## 📝 Notes

### ข้อควรระวัง:
- ⚠️ ทดสอบทุก Phase ให้ดีก่อนไป Phase ถัดไป
- ⚠️ Backup code ก่อนเริ่ม
- ⚠️ ทำทีละ feature (อย่าทำพร้อมกัน)
- ⚠️ Commit บ่อยๆ

### ถ้ามีปัญหา:
- 🆘 Revert commit ทันที
- 🆘 ไม่ต้อง panic - มี rollback plan
- 🆘 ขอความช่วยเหลือถ้าติดขัด

---

**Status:** 📋 Ready to Execute  
**Estimated Time:** 3 weeks  
**Confidence:** 🟢 High (มี rollback plan)

**เริ่มเมื่อไหร่ก็ได้!** 🚀
