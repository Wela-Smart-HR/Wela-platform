import React from 'react';

/**
 * EmployeeForm Component
 * ฟอร์มสำหรับสร้าง/แก้ไขพนักงาน
 */
export default function EmployeeForm({ employee, onSubmit, onCancel }) {
    const [formData, setFormData] = React.useState({
        name: employee?.name || '',
        email: employee?.email || '',
        position: employee?.position || '',
        salary: employee?.salary || '',
        salaryType: employee?.salaryType || 'monthly',
        deductionProfile: employee?.deductionProfile || 'none'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่อ-นามสกุล *
                </label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ระบุชื่อ-นามสกุล"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    อีเมล *
                </label>
                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={!!employee} // ไม่ให้แก้อีเมลถ้าเป็นการ edit
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="example@company.com"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    ตำแหน่ง *
                </label>
                <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="เช่น พนักงานเสิร์ฟ, พ้อกเตอร์"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        เงินเดือน *
                    </label>
                    <input
                        type="number"
                        name="salary"
                        value={formData.salary}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        ประเภท *
                    </label>
                    <select
                        name="salaryType"
                        value={formData.salaryType}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="monthly">รายเดือน</option>
                        <option value="daily">รายวัน</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    รูปแบบการหัก
                </label>
                <select
                    name="deductionProfile"
                    value={formData.deductionProfile}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="none">ไม่หัก</option>
                    <option value="sso">ประกันสังคม</option>
                    <option value="tax">ภาษี</option>
                    <option value="sso_tax">ประกันสังคม + ภาษี</option>
                </select>
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    {employee ? 'บันทึกการแก้ไข' : 'สร้างพนักงาน'}
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
