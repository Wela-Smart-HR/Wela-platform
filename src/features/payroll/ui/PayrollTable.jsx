import React from 'react';
import { formatMoney } from '@/shared/utils/money';

/**
 * PayrollTable Component
 * ตารางแสดงเงินเดือนพนักงานทั้งหมด
 */
export default function PayrollTable({ payrollData, onEditEmployee }) {
    if (!payrollData || payrollData.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-500 text-center">ไม่มีข้อมูลเงินเดือน</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                ชื่อ
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                ตำแหน่ง
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                เงินเดือน
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                หัก
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                สุทธิ
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                จัดการ
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {payrollData.map((employee, index) => (
                            <tr key={employee.userId || index} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                        {employee.name || employee.employeeName}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">
                                        {employee.position || employee.role}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <div className="text-sm text-gray-900">
                                        ฿{formatMoney(employee.grossSalary || 0)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <div className="text-sm text-red-600">
                                        -฿{formatMoney(employee.totalDeductions || 0)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <div className="text-sm font-semibold text-green-600">
                                        ฿{formatMoney(employee.netSalary || 0)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => onEditEmployee && onEditEmployee(employee)}
                                        className="text-blue-600 hover:text-blue-900"
                                    >
                                        แก้ไข
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                        <tr>
                            <td colSpan="4" className="px-6 py-4 text-right font-semibold text-gray-700">
                                รวมทั้งหมด
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-green-600">
                                ฿{formatMoney(payrollData.reduce((sum, emp) => sum + (emp.netSalary || 0), 0))}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
