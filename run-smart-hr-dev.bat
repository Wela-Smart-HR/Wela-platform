@echo off
title Smart-HR Dev Server

<<<<<<< Updated upstream
REM ไปที่โฟลเดอร์ src
cd /d G:\Dev\smart-hr\src

REM ถอยกลับไป root (ที่มี package.json)
cd ..
=======
REM ไปที่โฟลเดอร์ project
cd C:\Users\heart\OneDrive\Desktop\Wela\smart-hr
>>>>>>> Stashed changes

REM เช็คว่า node มีไหม
node -v >nul 2>&1
if errorlevel 1 (
    echo ❌ ไม่พบ Node.js
    echo 👉 กรุณาติดตั้ง Node.js ก่อน
    pause
    exit /b
)

REM รัน dev server
echo 🚀 Starting Smart-HR Dev Server...
npm run dev

pause
