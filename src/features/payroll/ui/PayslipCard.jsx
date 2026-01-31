import React from 'react';
import { formatMoney } from '@/shared/utils/money';

/**
 * PayslipCard Component
 * แสดงข้อมูลสลิปเงินเดือน
 */
export default function PayslipCard({ payslip }) {
    if (!payslip) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-500 text-center">ไม่มีข้อมูลสลิปเงินเดือน</p>
            </div>
        );
    }

    const {
        grossSalary = 0,
        deductions = {},
        totalDeductions = 0,
        netSalary = 0,
        workDays = 0,
        totalDays = 30
    } = payslip;

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                <p className="text-sm opacity-90">เงินเดือนสุทธิ</p>
                <h2 className="text-4xl font-bold mt-1">฿{formatMoney(netSalary)}</h2>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
                {/* รายได้ */}
                <div>
                    <p className="text-sm text-gray-500 mb-2">รายได้</p>
                    <div className="flex justify-between">
                        <span>เงินเดือน</span>
                        <span className="font-semibold">฿{formatMoney(grossSalary)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                        <span>จำนวนวันทำงาน</span>
                        <span>{workDays}/{totalDays} วัน</span>
                    </div>
                </div>

                <hr />

                {/* รายการหัก */}
                <div>
                    <p className="text-sm text-gray-500 mb-2">รายการหัก</p>
                    {deductions.lateDeduction > 0 && (
                        <div className="flex justify-between text-sm">
                            <span>หักสาย</span>
                            <span className="text-red-600">-฿{formatMoney(deductions.lateDeduction)}</span>
                        </div>
                    )}
                    {deductions.socialSecurity > 0 && (
                        <div className="flex justify-between text-sm mt-1">
                            <span>ประกันสังคม</span>
                            <span className="text-red-600">-฿{formatMoney(deductions.socialSecurity)}</span>
                        </div>
                    )}
                    {deductions.taxWithholding > 0 && (
                        <div className="flex justify-between text-sm mt-1">
                            <span>ภาษี</span>
                            <span className="text-red-600">-฿{formatMoney(deductions.taxWithholding)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
                        <span>รวมรายการหัก</span>
                        <span className="text-red-600">-฿{formatMoney(totalDeductions)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
