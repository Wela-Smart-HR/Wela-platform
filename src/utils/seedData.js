import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';

export const generateMockData = async (companyId) => {
    if (!companyId) return alert("ไม่พบ Company ID");
    
    const confirm = window.confirm("⚠️ ยืนยันการสร้างข้อมูล Mockup ในปีปัจจุบัน?");
    if (!confirm) return;

    console.log("Starting Seeding...");

    // 1. สร้างพนักงาน 5 คน
    const mockEmployees = [
        { name: "สมชาย ใจดี", role: "ผู้จัดการ", salary: 35000 },
        { name: "มานี มีตา", role: "โปรแกรมเมอร์", salary: 28000 },
        { name: "ปิติ ใจสู้", role: "การตลาด", salary: 22000 },
        { name: "ชูใจ รักเรียน", role: "พนักงานทั่วไป", salary: 15000 },
        { name: "วีระ กล้าหาญ", role: "ช่างเทคนิค", salary: 18000 }
    ];

    const empIds = [];
    for (const emp of mockEmployees) {
        const empRef = await addDoc(collection(db, "users"), {
            companyId,
            email: `mock_${Math.random().toString(36).substring(7)}@demo.com`,
            name: emp.name,
            role: 'employee', // แก้เป็น employee
            position: emp.role,
            baseSalary: emp.salary,
            employeeId: `EMP-${Math.floor(Math.random() * 1000)}`,
            createdAt: new Date().toISOString()
        });
        empIds.push({ id: empRef.id, ...emp });
    }

    // 2. สร้างข้อมูลย้อนหลัง 6 เดือน (ของปีปัจจุบัน)
    const currentYear = new Date().getFullYear(); // ✅ แก้ให้เป็นปีปัจจุบัน (2025)
    
    // สร้าง Array เดือน 01 ถึง 06 (ม.ค. - มิ.ย.)
    const months = Array.from({ length: 6 }, (_, i) => {
        const m = String(i + 1).padStart(2, '0');
        return { id: `${currentYear}-${m}` };
    });

    for (const month of months) {
        for (const emp of empIds) {
            const ot = Math.floor(Math.random() * 3000); 
            const sso = 750;
            const tax = Math.floor(emp.salary * 0.03);
            const net = emp.salary + ot - sso - tax;

            await addDoc(collection(db, "payslips"), {
                companyId,
                userId: emp.id,
                name: emp.name,
                role: emp.role,
                monthId: month.id, 
                baseSalary: emp.salary,
                otPay: ot,
                incentive: 0,
                socialSecurity: sso,
                tax: tax,
                lateDeduction: 0,
                netTotal: net,
                status: 'paid',
                createdAt: new Date().toISOString()
            });
        }
    }

    alert("✅ สร้างข้อมูล Mockup ปี " + currentYear + " เรียบร้อย!");
    window.location.reload(); // รีเฟรชหน้าจอให้อัตโนมัติ
};