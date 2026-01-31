# 📘 คู่มือการใช้งาน Smart-HR สำหรับ Developer

> **สำหรับ**: Developer ที่เพิ่งเข้าทีมหรือต้องการทำความเข้าใจระบบ

---

## 🎯 เป้าหมายของการจัดระบบใหม่

เรา refactor โค้ดเพื่อ:
- ✅ จัดระเบียบโค้ดให้อ่านง่าย แก้ไขง่าย
- ✅ ป้องกันไม่ให้แก้ 1 ไฟล์แล้วพังอีกไฟล์
- ✅ ป้องกันไม่ให้ developer ทดสอบแล้วพังข้อมูลจริงของลูกค้า

---

## 🔑 เรื่องสำคัญที่ต้องเข้าใจ

### 1. Environment Variables คืออะไร?

**คำตอบง่ายๆ**: ไฟล์ที่เก็บ Firebase API keys และ config ต่างๆ

**ทำไมต้องแยกไฟล์?**
- เพื่อไม่ให้ API keys ขึ้น git (ป้องกันคนอื่นขโมยไป)
- เพื่อแยก config ระหว่าง development กับ production

**ไฟล์ที่เกี่ยวข้อง**:

| ไฟล์ | จุดประสงค์ | ใช้เมื่อไหร่ | ขึ้น git ไหม? |
|------|-----------|-------------|--------------|
| `.env.example` | Template สำหรับทีม | สำหรับคนใหม่ดู format | ✅ ขึ้น (ไม่มี key จริง) |
| `.env` | Config ที่ใช้งานจริง | รันโปรแกรมทุกครั้ง | ❌ ไม่ขึ้น (มี key จริง) |
| `.env.staging` | Config สำหรับ staging | Build เพื่อทดสอบ | ❌ ไม่ขึ้น |
| `.env.production` | Config สำหรับ production | Build ให้ลูกค้าใช้ | ❌ ไม่ขึ้น |

---

### 2. Firebase Development vs Production (สำคัญมาก!)

**ปัญหา**: ถ้ามี Firebase project เดียว

```
Developer ทดสอบฟีเจอร์ใหม่บนเครื่อง
    ↓
กดปุ่มผิด หรือเขียนโค้ดผิด
    ↓
💥 ลบข้อมูลพนักงานจริงของลูกค้าทั้งหมด!
💥 เปลี่ยนเงินเดือนจริงของพนักงาน!
```

**วิธีแก้**: แยก Firebase เป็น 2 ตัว

```
┌──────────────────────────────────────────┐
│ 🧪 Firebase Development                 │
│ Project ID: smart-hr-dev                 │
│                                          │
│ ✓ Developer ทดสอบบนเครื่องตัวเอง         │
│ ✓ มีข้อมูลปลอม (fake data)               │
│ ✓ ลบยังไงก็ได้ ไม่กระทบใครเลย            │
│ ✓ เทสการคำนวณผิดพลาด ก็ไม่เป็นไร         │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ 🚀 Firebase Production                   │
│ Project ID: smart-hr-production          │
│                                          │
│ ⚠️ ลูกค้าใช้จริง มีข้อมูลจริงทั้งหมด    │
│ ⚠️ ห้าม developer เข้าถึงโดยตรง          │
│ ⚠️ แก้อะไรต้องระมัดระวังมากๆ             │
└──────────────────────────────────────────┘
```

**สถานะปัจจุบัน**: เรามี Firebase project เดียว (`smart-hr-app-cc978`)

**คำแนะนำ**:
- ถ้ายังไม่มีลูกค้าใช้จริง → **ใช้ตัวเดียวก่อน ไม่เป็นไร**
- ถ้ามีลูกค้าใช้แล้ว → **ขอให้ทีมสร้าง Firebase dev แยกออกมา**

---

### 3. ข้อมูลลูกค้าแยกกันยังไง?

**คำถาม**: มีลูกค้าหลายบริษัท ต้องแยก Firebase ให้แต่ละบริษัทไหม?

**คำตอบ**: ❌ **ไม่ต้อง** - ใช้ Firebase ตัวเดียวกันทุกบริษัท

**แยกด้วย `companyId`**:

```javascript
Firestore Database (ครึ่งเดียว ทุกบริษัทอยู่รวมกัน):

users/
  ├─ user001: { 
       name: "สมชาย", 
       companyId: "COMP-A",  ← บริษัท A
       role: "employee" 
     }
  ├─ user002: { 
       name: "สมหญิง", 
       companyId: "COMP-B",  ← บริษัท B
       role: "employee" 
     }
  └─ user003: { 
       name: "สมศักดิ์", 
       companyId: "COMP-A",  ← บริษัท A (อีกคน)
       role: "owner" 
     }

attendance/
  ├─ record001: { 
       userId: "user001", 
       companyId: "COMP-A",  ← บริษัท A
       clockIn: "08:00" 
     }
  └─ record002: { 
       userId: "user002", 
       companyId: "COMP-B",  ← บริษัท B
       clockIn: "09:00" 
     }
```

**Security**: บริษัท A มองไม่เห็นข้อมูลบริษัท B เพราะ `firestore.rules` ดูแล!

---

### 4. Firebase Security Rules: `firestore.rules` และ `storage.rules`

**คำถาม**: ทั้ง 2 ไฟล์นี้เหมือนกันไหม?

**คำตอบ**: ❌ **ไม่เหมือนกัน** - เป็นคนละไฟล์ คนละจุดประสงค์!

---

#### 📊 `firestore.rules` - สำหรับฐานข้อมูล

**ดูแล**: ข้อมูลใน **Firestore Database** (ตัวเลข, ข้อความ, JSON)

**ตัวอย่างข้อมูล**:
- ข้อมูล users (ชื่อ, email, role)
- ข้อมูล attendance (เวลาเข้า-ออกงาน)
- ข้อมูล payslips (สลิปเงินเดือน)
- ข้อมูล schedules (ตารางเวลางาน)

**ตัวอย่าง Security Rule**:

```javascript
// Employee สามารถ clock in/out ได้แค่ของตัวเอง
match /attendance/{docId} {
  allow create: if request.auth.uid == request.resource.data.userId;
}

// Owner สามารถดูเงินเดือนทุกคนในบริษัทได้
match /payslips/{docId} {
  allow read: if isOwnerOfCompany(resource.data.companyId);
}

// บริษัท A ห้ามดูข้อมูลบริษัท B
match /users/{userId} {
  allow read: if isSameCompany(resource.data.companyId);
}
```

**วิธี Deploy** (เมื่อพร้อม):
1. เปิด [Firebase Console](https://console.firebase.google.com)
2. เลือก project `smart-hr-app-cc978`
3. ไปที่ **Firestore Database** → **Rules**
4. Copy จาก `firestore.rules` ไปวาง
5. กด **Publish**

---

#### 📁 `storage.rules` - สำหรับไฟล์

**ดูแล**: ไฟล์ใน **Firebase Storage** (รูปภาพ, PDF, เอกสาร)

**ตัวอย่างไฟล์**:
- รูป profile ของพนักงาน (`/avatars/user123/profile.jpg`)
- ไฟล์แนบในใบลา (`/requests/doc001.pdf`)
- เอกสารบริษัท (`/company/COMP-A/policy.pdf`)
- Logo บริษัท (`/company/COMP-A/logo.png`)

**ตัวอย่าง Security Rule**:

```javascript
// พนักงานสามารถ upload รูป profile ของตัวเองได้
match /avatars/{userId}/{fileName} {
  allow write: if request.auth.uid == userId && 
                  request.resource.size < 5 * 1024 * 1024; // ไม่เกิน 5MB
}

// Owner สามารถจัดการไฟล์ของบริษัทได้
match /company/{companyId}/{allPaths=**} {
  allow read: if isAuthenticated();
  allow write: if isOwnerOfCompany(companyId);
}
```

**วิธี Deploy** (เมื่อพร้อม):
1. เปิด [Firebase Console](https://console.firebase.google.com)
2. เลือก project `smart-hr-app-cc978`
3. ไปที่ **Storage** → **Rules**
4. Copy จาก `storage.rules` ไปวาง
5. กด **Publish**

---

#### 📊 เปรียบเทียบ

| | `firestore.rules` | `storage.rules` |
|---|------------------|-----------------|
| **ดูแล** | ข้อมูลในฐานข้อมูล (Database) | ไฟล์ต่างๆ (Files) |
| **ตัวอย่างข้อมูล** | user, attendance, payslip | รูปภาพ, PDF, เอกสาร |
| **Deploy ที่** | Firestore Database → Rules | Storage → Rules |
| **Path ตัวอย่าง** | `/users/{userId}` | `/avatars/{userId}/{file}` |
| **ตรวจสอบ** | companyId, role | file size, file type |

---

#### ⚠️ สำคัญ!

**ต้อง deploy ทั้ง 2 ไฟล์แยกกัน:**
- `firestore.rules` → ไป Firestore Database
- `storage.rules` → ไป Storage

**สถานะปัจจุบัน**:
- ✅ เราสร้างทั้ง 2 ไฟล์ไว้บนเครื่องแล้ว
- ⏸️ **ยังไม่ได้ deploy** ทั้งคู่
- 🕐 รอ refactor เสร็จ ค่อย deploy ทั้งหมดพร้อมกัน

---


## 🚀 วิธีใช้งานสำหรับ Developer

### เมื่อโคลนโปรเจกต์มาครั้งแรก

```bash
# 1. Clone repository
git clone <repo-url>
cd smart-hr

# 2. Install dependencies
npm install

# 3. สร้างไฟล์ .env จาก template
cp .env.example .env

# 4. ขอ Firebase credentials จาก team lead
# แก้ไฟล์ .env ใส่ค่าที่ได้มา:
# VITE_FIREBASE_API_KEY=...
# VITE_FIREBASE_PROJECT_ID=...
# (ตามที่ team lead ให้มา)

# 5. รันโปรแกรม
npm run dev

# 6. เปิด browser ที่ http://localhost:5173
```

---

### การทำงานปกติ (Development)

```bash
# รันโปรแกรมบนเครื่อง
npm run dev

# → Vite จะอ่าน config จาก .env
# → เชื่อมกับ Firebase development
# → ทดสอบยังไงก็ได้ ไม่กระทบข้อมูลจริง
```

---

### เมื่อจะ Build สำหรับ Production

```bash
# 1. เปลี่ยน config เป็นของ production
cp .env.production .env

# 2. Build
npm run build

# 3. ไฟล์จะอยู่ที่ dist/
# 4. Upload ไปที่ hosting (Netlify/Vercel/Firebase Hosting)

# 5. (สำคัญ!) เสร็จแล้วเปลี่ยน config กลับเป็น dev
cp .env.example .env
# แล้วแก้ใส่ dev credentials ใหม่
```

---

## ⚠️ ข้อห้าม (อ่านให้ครบ!)

### ❌ อย่าทำเด็ดขาด:

1. **อย่า commit ไฟล์ `.env` ขึ้น git**
   ```bash
   # ผิด!
   git add .env
   git commit -m "added env"
   
   # ถูก!
   # ไฟล์ .env จะถูก ignore อัตโนมัติ (ดู .gitignore)
   ```

2. **อย่า hardcode API keys ในโค้ด**
   ```javascript
   // ❌ ผิด!
   const apiKey = "AIzaSyD2Rnx0rkwI6DqathSSJRjfQF2fNwDTtEA";
   
   // ✅ ถูก!
   const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
   ```

3. **อย่าใช้ production config เวลา dev**
   - ถ้าใช้ผิด → ทดสอบบนข้อมูลจริงของลูกค้า → อันตราย!

4. **อย่าแชร์ `.env` ให้คนนอกทีม**
   - มี API keys ที่เข้าถึง Firebase ได้

---

## 🔍 วิธีเช็คว่าใช้ Firebase ตัวไหนอยู่

```bash
# ดูไฟล์ .env
cat .env

# ดู project ID
# VITE_FIREBASE_PROJECT_ID=smart-hr-dev  → development ✅
# VITE_FIREBASE_PROJECT_ID=smart-hr-prod → production ⚠️
```

หรือดูใน browser console:
```javascript
console.log(import.meta.env.VITE_FIREBASE_PROJECT_ID);
```

---

## 🆘 เจอปัญหา?

### 1. โปรแกรมรันไม่ได้ แสดง "Firebase Config is missing"

**สาเหตุ**: ไม่มีไฟล์ `.env` หรือไฟล์ว่างเปล่า

**แก้ไข**:
```bash
cp .env.example .env
# แล้วแก้ .env ใส่ค่าจริง
```

### 2. ไฟล์ `.env` หายไป

**สาเหตุ**: อาจลบไปโดยไม่ตั้งใจ

**แก้ไข**:
```bash
cp .env.example .env
# ขอ credentials จาก team lead ใหม่
```

### 3. Login ไม่ได้

**สาเหตุ**: อาจใช้ Firebase project ผิดตัว

**แก้ไข**:
- เช็คว่า `.env` มี project ID ที่ถูกต้อง
- ถาม team lead

---

## 📋 Checklist สำหรับ Developer ใหม่

เมื่อเข้าทีมใหม่ ต้องทำตามนี้:

- [ ] Clone repository
- [ ] `npm install`
- [ ] สร้าง `.env` จาก `.env.example`
- [ ] ขอ Firebase credentials จาก team lead
- [ ] ใส่ credentials ใน `.env`
- [ ] รันโปรแกรม `npm run dev`
- [ ] ทดสอบ login/logout ได้
- [ ] อ่านไฟล์ `implementation_plan.md` เพื่อเข้าใจโครงสร้างโค้ด

---

## 📞 ติดต่อใคร?

| ปัญหา | ติดต่อ |
|-------|--------|
| ขอ Firebase credentials | Team Lead |
| โค้ดพังหรือ error | Senior Developer |
| ไม่เข้าใจโครงสร้างโปรเจกต์ | อ่าน `implementation_plan.md` หรือถาม dev ในทีม |

---

## 🎓 เอกสารเพิ่มเติม

- [implementation_plan.md](./implementation_plan.md) - แผน refactoring ทั้งหมด
- [task.md](./task.md) - รายการงานที่ต้องทำ
- [README.md](./README.md) - Setup instructions

---

**สร้างโดย**: Team Smart-HR  
**อัปเดตล่าสุด**: 31 มกราคม 2026
