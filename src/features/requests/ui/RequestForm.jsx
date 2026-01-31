import React from 'react';
import { calculateLeaveDays } from '../requests.rules';

/**
 * RequestForm Component
 * ฟอร์มสำหรับส่งคำขอลา/แก้ไขเวลา
 */
export default function RequestForm({ type = 'leave', onSubmit, onCancel }) {
    const [formData, setFormData] = React.useState({
        type,
        startDate: '',
        endDate: '',
        date: '',
        timeIn: '',
        timeOut: '',
        reason: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const leaveDays = type === 'leave' && formData.startDate && formData.endDate
        ? calculateLeaveDays(new Date(formData.startDate), new Date(formData.endDate))
        : 0;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    ประเภทคำขอ
                </label>
                <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled
                >
                    <option value="leave">ลา</option>
                    <option value="attendance-adjustment">แก้ไขเวลา</option>
                </select>
            </div>

            {type === 'leave' ? (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                วันที่เริ่ม *
                            </label>
                            <input
                                type="date"
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                วันที่สิ้นสุด *
                            </label>
                            <input
                                type="date"
                                name="endDate"
                                value={formData.endDate}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    {leaveDays > 0 && (
                        <p className="text-sm text-gray-600">
                            รวม: <span className="font-semibold">{leaveDays} วัน</span>
                        </p>
                    )}
                </>
            ) : (
                <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            วันที่ *
                        </label>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                เวลาเข้า
                            </label>
                            <input
                                type="time"
                                name="timeIn"
                                value={formData.timeIn}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                เวลาออก
                            </label>
                            <input
                                type="time"
                                name="timeOut"
                                value={formData.timeOut}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    เหตุผล * (ขั้นต่ำ 10 ตัวอักษร)
                </label>
                <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    required
                    minLength={10}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="โปรดระบุเหตุผล..."
                />
                <p className="text-xs text-gray-500 mt-1">
                    {formData.reason.length}/10 ตัวอักษร
                </p>
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    ส่งคำขอ
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                    ยกเลิก
                </button>
            </div>
        </form>
    );
}
