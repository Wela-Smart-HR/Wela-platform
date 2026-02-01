
# 🐛 Bug Reports - Smart-HR Refactoring

รายงานบัคที่พบระหว่างการ refactor

---

## 🔴 *Critical Bugs *

~~### 1. Approve Request Error (Requests Feature)~~
**พบเมื่อ**: 2026-01-31 04:34  
**ตำแหน่ง**: `useAdminRequests.js:38:45`  
**อาการ**: Admin กดอนุมัติคำขอลา (Approve Request) แล้วเกิด error  

**สถานะ**: ✅ ***แก้ไขแล้ว***

---

~~### 2. Profile getIdToken Error~~
**พบเมื่อ**: 2026-01-31 04:34  
**ตำแหน่ง**: `Profile.jsx:92:35`  
**อาการ**: หน้า Profile มี error  
**Error Message**:
```
TypeError: userInternal.getIdToken is not a function
at handleUpdateProfile (Profile.jsx:92:35)
```

**สาเหตุเบื้องต้น**:
- `userInternal` object ไม่มี method `getIdToken()`
- อาจใช้ Firebase API ผิด version

**สถานะ**: ✅ ***แก้ไขแล้ว***

---

## ⚠️ Warnings (ไม่กระทบการใช้งาน)

### 1. Chart Dimension Warnings
**พบเมื่อ**: 2026-01-31 04:41  
**ตำแหน่ง**: `LogHi11.js:16`  
**อาการ**: Warning ใน console  
**Message**:
```
The width(-1) and height(-1) of chart should be greater than 0
```

**สาเหตุ**: Chart component ได้รับ dimension ที่ไม่ถูกต้อง (-1)

**สถานะ**: ⚠️ ไม่เร่งด่วน

---

### 2. React Router Warnings
**พบเมื่อ**: 2026-01-31 04:41  
**ตำแหน่ง**: Multiple routes  
**อาการ**: Warning หลายแบบ  
**Messages**:
```
- Router is responding to: /registerSM.js
- The navigation route /schedule is not being used
- The navigation route /connect/time is not being used
- Precaching 2 files
```

**สาเหตุ**: React Router configuration issues, deprecated routes

**สถานะ**: ⚠️ ไม่กระทบการใช้งาน

---

### 3. Meta Tag Deprecation Warning
**พบเมื่อ**: 2026-01-31 04:41  
**ตำแหน่ง**: `index.html`  
**Message**:
```
<meta name="apple-mobile-web-app-capable" content="yes"> is deprecated. 
Please include <meta name="mobile-web-app-capable" content="yes">
```

**สถานะ**: ⚠️ ไม่เร่งด่วน

---

### 4. GPS Quick Fix Timeout
**พบเมื่อ**: 2026-01-31 04:41  
**ตำแหน่ง**: `TimeAttendance.jsx`  
**อาการ**: GPS timeout warning  
**Message**: `Quick GPS failed, waiting for matchPosition...`

**สาเหตุ**: เป็นเรื่องปกติของระบบ GPS ที่ใช้เวลาในการหาตำแหน่ง

**สถานะ**: ⚠️ ปกติ

---

~~### 5. Firebase Auth Errors (Testing)~~
**พบเมื่อ**: 2026-01-31 04:41  
**ตำแหน่ง**: Login flow  
**Message**:
```
FirebaseError: Firebase: Error (auth/invalid-credential)
```
**สาเหตุ**: ใช้ credentials ทดสอบที่ไม่ถูกต้อง

**สถานะ**: ✅ แก้ไขแล้ว

---

## 📋 ส่วนที่ยังไม่ได้ Refactor (ไม่ใช่บัค)

- **Requests Feature**: ยังใช้โค้ดเดิม
- **People Feature**: ยังใช้โค้ดเดิม
- **Settings Feature**: ยังใช้โค้ดเดิม
- **Reports Feature**: ยังใช้โค้ดเดิม
- **UI Components**: ยังไม่ได้แยก

## ✅ ที่แก้ไปแล้ว
---

**Created**: 2026-01-31  
**Last Updated**: Phase 4 Start
