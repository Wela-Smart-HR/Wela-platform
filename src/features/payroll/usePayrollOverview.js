import { useState, useEffect } from 'react';
import { db } from '@/shared/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export function usePayrollOverview(companyId, selectedYear) {
    const [loading, setLoading] = useState(false);
    const [yearlyStats, setYearlyStats] = useState({
        totalSalary: 0,
        totalSSO: 0,
        totalTax: 0,
        monthlyTrend: Array(12).fill(0),
        employeeSummary: []
    });

    useEffect(() => {
        if (!companyId) return;

        const fetchYearlyData = async () => {
            setLoading(true);
            try {
                // ✅ เปลี่ยนกลับมาใช้วิธีดึงตาม CompanyId อย่างเดียว (ชัวร์สุด ไม่ติด Permission)
                // ข้อมูลหลักร้อย/พันรายการ โหลดแบบนี้เร็วกว่ารอ Index ครับ
                const q = query(collection(db, "payslips"), where("companyId", "==", companyId));

                const snap = await getDocs(q);
                const allSlips = snap.docs.map(d => d.data());

                // ตัวแปรสำหรับคำนวณ
                let salary = 0;
                let sso = 0;
                let tax = 0;
                const monthlyData = Array(12).fill(0);
                const empMap = {};

                // กรองปีที่เลือกใน JS แทน (Stable Version)
                const targetYearStr = String(selectedYear);

                allSlips.forEach(slip => {
                    // เช็คว่า monthId มีจริง และขึ้นต้นด้วยปีที่เลือก (เช่น "2025-01")
                    if (!slip.monthId || !slip.monthId.startsWith(targetYearStr)) return;

                    const net = Number(slip.netTotal) || 0;
                    const slipTax = Number(slip.tax) || 0;
                    const slipSSO = Number(slip.socialSecurity) || 0;

                    // รายได้รวมสำหรับ 50 ทวิ
                    const base = Number(slip.baseSalary) || 0;
                    const ot = Number(slip.otPay) || 0;
                    const inc = Number(slip.incentive) || 0;
                    const totalIncome = base + ot + inc;

                    // สะสมยอดรวม
                    salary += net;
                    sso += slipSSO;
                    tax += slipTax;

                    // ลงกราฟรายเดือน
                    const mPart = slip.monthId.split('-')[1];
                    if (mPart) {
                        const mIndex = parseInt(mPart) - 1;
                        if (mIndex >= 0 && mIndex < 12) monthlyData[mIndex] += net;
                    }

                    // สรุปรายคน
                    if (!empMap[slip.userId]) {
                        empMap[slip.userId] = {
                            id: slip.userId,
                            name: slip.name,
                            role: slip.role,
                            totalIncome: 0,
                            totalTax: 0,
                            totalSSO: 0
                        };
                    }
                    empMap[slip.userId].totalIncome += totalIncome;
                    empMap[slip.userId].totalTax += slipTax;
                    empMap[slip.userId].totalSSO += slipSSO;
                });

                setYearlyStats({
                    totalSalary: salary,
                    totalSSO: sso,
                    totalTax: tax,
                    monthlyTrend: monthlyData,
                    employeeSummary: Object.values(empMap)
                });

                setLoading(false);
            } catch (err) {
                console.error("Overview Error:", err);
                setLoading(false);
            }
        };

        fetchYearlyData();
    }, [companyId, selectedYear]);

    return { yearlyStats, loading };
}