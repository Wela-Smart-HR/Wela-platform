# 📁 Attendance System - คู่มือแก้ไข

## 📋 โครงสร้างไฟล์

```
features/attendance/
├── useMyAttendance.js    ← Hook หลัก (state + actions)
├── gps.service.js        ← GPS tracking
├── offline.service.js    ← Offline sync
├── attendance.config.js  ← Config บริษัท
├── attendance.repo.js    ← Firebase CRUD
├── attendance.rules.js   ← Business rules
└── ui/                   ← UI components
```

---

## 🛠️ จะแก้อะไร → ไปไฟล์ไหน

| ต้องการแก้ |      |       ไปที่ไฟล์ |
|-----------|------------------------------------------|
| Clock In/Out logic | `useMyAttendance.js` → `clockIn()`, `clockOut()` |
| ขอแก้เวลาย้อนหลัง | `useMyAttendance.js` → `submitRetroRequest()` |
| GPS accuracy/timeout | `gps.service.js` |
| Offline queue | `offline.service.js` |
| ค่า Config default | `attendance.config.js` |
| Firestore query | `attendance.repo.js` |
| คำนวณสาย/หักเงิน | `attendance.rules.js` |
| หน้าตา UI | `pages/employee/TimeAttendance.jsx` |

---

## ✅ ตัวอย่างการแก้

### 1. แก้ GPS timeout
```js
// ไฟล์: gps.service.js
// ค้นหา: timeout
timeout: 15000  // แก้เป็น 20000 ถ้าอยากรอนานขึ้น
```

### 2. เพิ่มปุ่มพักเบรก
```js
// ไฟล์: useMyAttendance.js
// เพิ่มใต้ clockOut()
const clockBreak = async () => { ... }

// แล้วเพิ่มใน return:
return { ..., clockBreak }
```

### 3. แก้ข้อความ greeting
```js
// ไฟล์: useMyAttendance.js → clockIn()
// ค้นหา: message:
message: 'สวัสดีครับ!'  // แก้ตรงนี้
```

---

## 💡 หลักการ

- **แก้ 1 ไฟล์ ไม่กระทบไฟล์อื่น**
- **ค้นหาง่าย**: Ctrl+F พิมพ์ชื่อ function
- **Test ก่อน commit**: ลองลงเวลาดูว่าทำงานปกติ
