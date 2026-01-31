import React, { useState, useEffect } from 'react';
import {
  Camera, X, User, IdentificationCard, Calendar, Phone,
  Envelope, Bank, CurrencyBtc, CaretDown, Clock,
  ShieldCheck, Circle, Trash, WarningCircle
} from '@phosphor-icons/react';

export default function EmployeeModal({ isOpen, onClose, employee, onSave, onDelete, isLoading }) {
  if (!isOpen) return null;

  // Initial State (ค่าเริ่มต้นว่างๆ)
  const initialForm = {
    username: '',
    password: '',
    name: '',
    idCard: '',
    birthDate: '',
    phone: '',
    email: '',
    position: '',
    type: 'รายเดือน',
    salary: '',
    startDate: '',
    probationDate: '', // วันผ่านโปร
    taxMode: 'none',   // ภาษี (ค่าเริ่มต้น: ไม่หัก)
    shift: 'normal',   // กะงาน
    bank: 'กสิกรไทย (KBANK)',
    bankNumber: '',
    status: 'active',
    resignDate: '',    // วันที่ลาออก
    dayOffs: [0]
  };

  // State เก็บข้อมูลฟอร์ม
  const [formData, setFormData] = useState(initialForm);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset Form เมื่อเปิด Modal
  useEffect(() => {
    if (isOpen) {
      if (employee) {
        // ถ้าเป็นการแก้ไข ให้เอาข้อมูลเดิมมาใส่ (Merge กับค่า Default เผื่อฟิลด์ไหนไม่มี)
        setFormData({ ...initialForm, ...employee });
      } else {
        // ถ้าสร้างใหม่ ให้เคลียร์เป็นค่าว่าง
        setFormData(initialForm);
      }
    }
  }, [isOpen, employee]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleDay = (dayIndex) => {
    const current = formData.dayOffs;
    if (current.includes(dayIndex)) {
      setFormData(prev => ({ ...prev, dayOffs: current.filter(d => d !== dayIndex) }));
    } else {
      setFormData(prev => ({ ...prev, dayOffs: [...current, dayIndex] }));
    }
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  const handleDelete = () => {
    if (onDelete && employee) {
      onDelete(employee.id);
      setShowDeleteConfirm(false);
    }
  };

  const days = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  const inputStyle = "w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 font-medium outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-300 appearance-none";
  const labelStyle = "text-[10px] font-bold text-slate-400 mb-1.5 block uppercase tracking-wide";
  const sectionTitleStyle = "text-sm font-bold text-slate-800 mb-4 border-l-4 pl-3 flex items-center gap-2";

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slide-up flex flex-col h-[95vh]">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-3xl z-10">
          <h2 className="text-lg font-bold text-slate-800">{employee ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}</h2>
          <div className="flex gap-2">
            {employee && (
              <button onClick={() => setShowDeleteConfirm(true)} className="w-8 h-8 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-100 transition"><Trash weight="bold" /></button>
            )}
            <button onClick={onClose}><X weight="bold" className="text-slate-500 w-8 h-8" /></button>
          </div>
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto p-6 pb-32 space-y-8 bg-white">

          {/* Avatar */}
          <div className="flex flex-col items-center -mt-2">
            <div className="w-28 h-28 rounded-full bg-slate-50 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
              <User size={48} className="text-slate-300" />
            </div>
            <p className="text-xs text-slate-400 mt-2 font-medium">รูปโปรไฟล์ (เร็วๆ นี้)</p>
          </div>

          {/* Login Info (แก้ Autofill ตรงนี้) */}
          <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
            <h3 className="text-xs font-bold text-blue-600 mb-4 flex items-center gap-2">
              <User weight="fill" /> ข้อมูลเข้าระบบ (LOGIN)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>Email (User)</label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`${inputStyle} bg-white`}
                  placeholder="email@worker.com"
                  autoComplete="off" // ป้องกันจำ
                />
              </div>
              <div>
                <label className={labelStyle}>Password</label>
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`${inputStyle} bg-white`}
                  placeholder="******"
                  disabled={!!employee}
                  autoComplete="new-password" // บอก Browser ว่าเป็นรหัสใหม่ ห้ามเติมเอง
                />
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div>
            <h3 className={`${sectionTitleStyle} border-slate-800`}>ข้อมูลส่วนตัว</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelStyle}>ชื่อ-นามสกุล (ภาษาไทย)</label>
                <input name="name" type="text" value={formData.name} onChange={handleChange} className={inputStyle} />
              </div>
              <div className="col-span-2">
                <label className={labelStyle}>เลขบัตรประชาชน (13 หลัก)</label>
                <input name="idCard" type="text" value={formData.idCard} onChange={handleChange} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>เบอร์โทรศัพท์</label>
                <input name="phone" type="tel" value={formData.phone} onChange={handleChange} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>วันเกิด</label>
                <input name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} className={inputStyle} />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Work Info (เติมที่ขาดให้ครบ) */}
          <div>
            <h3 className={`${sectionTitleStyle} border-emerald-500`}>การจ้างงาน & ภาษี</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>ตำแหน่ง</label>
                <input name="position" type="text" value={formData.position} onChange={handleChange} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>ประเภทการจ้าง</label>
                <div className="relative">
                  <select name="type" value={formData.type} onChange={handleChange} className={inputStyle}>
                    <option>รายเดือน</option>
                    <option>รายวัน</option>
                  </select>
                  <CaretDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" weight="bold" />
                </div>
              </div>
              <div className="col-span-2">
                <label className={labelStyle}>เงินเดือน / ค่าจ้าง (บาท)</label>
                <input name="salary" type="number" value={formData.salary} onChange={handleChange} className={`${inputStyle} bg-emerald-50 border-emerald-200 text-emerald-700 font-bold`} />
              </div>

              {/* ภาษี */}
              <div className="col-span-2">
                <label className={labelStyle}>รูปแบบการหักภาษี</label>
                <div className="relative">
                  <select name="taxMode" value={formData.taxMode} onChange={handleChange} className={`${inputStyle} pl-10`}>
                    <option value="none">ไม่หัก (ค่าเริ่มต้น)</option>
                    <option value="sso">ประกันสังคม (5%)</option>
                    <option value="wht">หัก ณ ที่จ่าย (3%)</option>
                  </select>
                  <ShieldCheck className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <CaretDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" weight="bold" />
                </div>
              </div>

              {/* กะงาน */}
              <div className="col-span-2">
                <label className={labelStyle}>กะทำงานเริ่มต้น</label>
                <div className="relative">
                  <select name="shift" value={formData.shift} onChange={handleChange} className={`${inputStyle} pl-10`}>
                    <option value="normal">กะปกติ (09:00 - 18:00)</option>
                    <option value="afternoon">กะบ่าย (14:00 - 23:00)</option>
                  </select>
                  <Clock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <CaretDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" weight="bold" />
                </div>
              </div>

              {/* วันที่ */}
              <div>
                <label className={labelStyle}>วันที่เริ่มงาน</label>
                <input name="startDate" type="date" value={formData.startDate} onChange={handleChange} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>สิ้นสุดทดลองงาน (ถ้ามี)</label>
                <input name="probationDate" type="date" value={formData.probationDate} onChange={handleChange} className={inputStyle} />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Status */}
          <div>
            <h3 className={`${sectionTitleStyle} border-orange-400`}>สถานะการทำงาน</h3>
            <div className={`p-4 rounded-2xl border transition-colors ${formData.status === 'active' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelStyle}>สถานะ</label>
                  <div className="relative">
                    <select name="status" value={formData.status} onChange={handleChange} className={`${inputStyle} bg-white pl-10`}>
                      <option value="active">ทำงานอยู่ (Active)</option>
                      <option value="resigned">ลาออก (Resigned)</option>
                    </select>
                    <Circle weight="fill" className={`absolute left-3 top-3.5 ${formData.status === 'active' ? 'text-emerald-500' : 'text-rose-500'}`} size={12} />
                    <CaretDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" weight="bold" />
                  </div>
                </div>
                {formData.status === 'resigned' && (
                  <div className="col-span-2">
                    <label className={labelStyle}>วันที่ลาออก / เลิกจ้าง</label>
                    <input name="resignDate" type="date" value={formData.resignDate} onChange={handleChange} className={`${inputStyle} bg-white`} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bank Info */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-2"><Bank weight="fill" /> บัญชีรับเงินเดือน</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelStyle}>ธนาคาร</label>
                <div className="relative">
                  <select name="bank" value={formData.bank} onChange={handleChange} className={`${inputStyle} bg-white`}>
                    <option>กสิกรไทย (KBANK)</option>
                    <option>ไทยพาณิชย์ (SCB)</option>
                    <option>กรุงเทพ (BBL)</option>
                    <option>กรุงไทย (KTB)</option>
                    <option value="cash">จ่ายเงินสด</option>
                  </select>
                  <CaretDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" weight="bold" />
                </div>
              </div>
              <div className="col-span-2">
                <label className={labelStyle}>เลขที่บัญชี</label>
                <input name="bankNumber" type="text" value={formData.bankNumber} onChange={handleChange} className={`${inputStyle} bg-white font-mono`} placeholder="xxx-x-xxxxx-x" />
              </div>
            </div>
          </div>

          {/* Day Offs */}
          <div className="pb-4">
            <label className={labelStyle}>วันหยุดประจำสัปดาห์ (Day Off)</label>
            <div className="flex justify-between gap-2 mt-2">
              {days.map((d, index) => (
                <button key={index} onClick={() => toggleDay(index)} className={`flex-1 h-10 rounded-lg text-xs font-bold border transition-all ${formData.dayOffs.includes(index) ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-400'}`}>{d}</button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex gap-3 z-20 pb-8 rounded-b-3xl shadow-[0_-5px_15px_rgba(0,0,0,0.03)]">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition">ยกเลิก</button>
          <button onClick={handleSubmit} disabled={isLoading} className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-blue-600 text-white shadow-lg flex items-center justify-center gap-2">
            {isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
                  <WarningCircle weight="fill" size={24} className="text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">ยืนยันการลบพนักงาน</h3>
                  <p className="text-xs text-slate-500">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-6">
                คุณต้องการลบ <span className="font-bold">{employee?.name}</span> ออกจากระบบใช่หรือไม่?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-rose-600 text-white hover:bg-rose-700 transition flex items-center justify-center gap-2"
                >
                  <Trash weight="bold" />
                  {isLoading ? 'กำลังลบ...' : 'ยืนยันลบ'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}