# Smart-HR Application

Employee Management & HR System built with **React + Vite + Firebase**

> เอกสารนี้เขียนสำหรับ **developer** ที่เพิ่งเข้ามาใหม่
> เปิดไฟล์นี้แล้วทำตามได้ทันที ไม่ต้องไล่อ่านหลายที่

---

## 🧠 ภาพรวมสั้น ๆ (อ่านก่อน 30 วิ)

* โปรเจกต์เป็น **Frontend (React + Vite)**
* ใช้ **Firebase** (Auth / Firestore / Storage)
* ไฟล์ build / PWA **ไม่ถูกเก็บใน git** (generate ใหม่ได้เสมอ)
* ทำงานผ่าน **branch + Pull Request** เท่านั้น

---

## ✅ Prerequisites (เครื่องต้องพร้อมก่อน)

ต้องมีสิ่งเหล่านี้ในเครื่อง:

* Node.js **18+**
* npm (หรือ yarn)
* Firebase credentials (ขอจาก team lead)

### ตรวจสอบ Node.js

เปิด **Command Prompt / Terminal** แล้วพิมพ์:

```bash
node -v
```

ผลลัพธ์ที่ถูกต้องควรได้ประมาณ:

```text
v18.x.x
```

ถ้า:

* ขึ้นว่า `node is not recognized` → ยังไม่ได้ติดตั้ง Node.js
* เวอร์ชันต่ำกว่า 18 → ต้องอัปเดต

ดาวน์โหลด Node.js (LTS):
[https://nodejs.org](https://nodejs.org)

ติดตั้งเสร็จแล้ว **ปิด–เปิด CMD ใหม่** แล้วเช็คซ้ำอีกครั้ง

---

## 🚀 Quick Start (รันให้ติดใน 5 นาที)

### 1) Clone Repository

```bash
git clone <repo-url>
cd smart-hr
```

---

### 2) Install Dependencies

```bash
npm install
```

> ถ้า error แปลก ๆ
> ให้ลองลบ `node_modules` แล้วรันใหม่

---

### 3) Setup Environment Variables (จำเป็นมาก)

สร้างไฟล์ `.env` จากตัวอย่าง:

```bash
cp .env.example .env
```

แก้ไฟล์ `.env` แล้วใส่ Firebase credentials จริง:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

⚠️ **IMPORTANT**

* ห้าม commit ไฟล์ `.env` เด็ดขาด
* ถ้าไม่มีค่า → ขอจาก team lead เท่านั้น

---

### 4) Run Development Server

```bash
npm run dev
```

เปิดเว็บที่:

```text
http://localhost:5173
```

ถ้าเข้าได้ = พร้อมพัฒนา

---

## 📦 Common Commands

```bash
npm run dev        # รัน dev server
npm run build      # build สำหรับ production
npm run preview    # preview build ที่ build แล้ว
npm run lint       # ตรวจ eslint
```

---

## 🧹 กรณีไฟล์หาย (ปกติ ไม่ใช่บั๊ก)

ไฟล์เหล่านี้ **ไม่อยู่ใน git** และอาจหายได้เสมอ:

* `dev-dist/`
* `sw.js`
* `workbox-*.js`
* `registerSW.js`

ถ้าหาย **ไม่ต้องกู้** ให้ generate ใหม่ด้วย:

```bash
npm run dev
# หรือ
npm run build
```

---

## 🌍 Environment Usage

### Development

ใช้ไฟล์ `.env`

### Staging

```bash
cp .env.staging .env
npm run build
```

### Production

```bash
cp .env.production .env
npm run build
```

---

## 🏗️ Project Structure (ย่อ)

```text
src/
  app/        # Routes / Layouts
  pages/      # UI Pages (admin / employee)
  features/   # Feature-based logic (hooks, services)
  shared/     # Shared components & utilities
```

แผน refactor ดูที่:

* `MIGRATION_PLAN.md`

---

## 👥 Team Workflow (กฎที่ต้องทำตาม)

1. ❌ ห้าม commit `.env`
2. ❌ ห้าม commit ไฟล์ build / dev-dist
3. ✅ ทำงานผ่าน branch เท่านั้น
4. ✅ เปิด Pull Request ก่อน merge เข้า `main`

---

## 📝 License

Private – Internal Use Only
