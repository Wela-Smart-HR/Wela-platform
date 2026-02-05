import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  MagnifyingGlass, Funnel, Plus, PencilSimple,
  Money, WarningCircle, CheckCircle
} from '@phosphor-icons/react';

// ✅ Import Hook จาก Features Architecture
import { usePeopleAdmin } from '../../features/people/usePeopleAdmin';
import { useDialog } from '../../contexts/DialogContext';

// Components
import EmployeeModal from '../../components/admin/EmployeeModal';
import WarningModal from '../../components/admin/WarningModal';

export default function People() {
  const { currentUser } = useAuth();
  const dialog = useDialog(); // ✅ 2. เรียกใช้ Dialog

  // ✅ เรียกใช้ Logic จาก Features Hook
  const { employees, loading, createEmployee, updateEmployee, deleteEmployee, hasMore, loadMore } = usePeopleAdmin(currentUser?.companyId, currentUser);

  // --- UI STATE ---
  // ❌ ลบ showSuccess ออก เพราะเราจะใช้ Global Dialog แทนครับ
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [warningTarget, setWarningTarget] = useState(null);
  const [isSaving, setIsSaving] = useState(false); // Local loading state ตอนกดบันทึก

  // --- HANDLERS (สะอาดขึ้นมาก) ---
  const handleSaveEmployee = async (formData) => {
    setIsSaving(true);
    try {
      if (selectedEmployee) {
        // 🔥 LOGIC 1: แก้ไข (เรียกใช้ updateEmployee จาก Hook)
        const { password, ...updateData } = formData; // แยก password ออกไม่ให้อัปเดต
        await updateEmployee(selectedEmployee.id, updateData);

      } else {
        // 🔥 LOGIC 2: สร้างใหม่ (เรียกใช้ createEmployee จาก Hook)
        await createEmployee(formData, formData.password);
      }

      // Success Flow
      setIsModalOpen(false);
      setSelectedEmployee(null);

      // ✅ 3. ใช้ Dialog แทน Custom Popup เดิม
      await dialog.showAlert("ข้อมูลพนักงานถูกอัปเดตลงในระบบแล้ว", "บันทึกเรียบร้อย!", "success");

    } catch (error) {
      // ✅ 4. เปลี่ยน alert เป็น dialog
      dialog.showAlert("เกิดข้อ ผิดพลาด: " + error.message, "Error", "error");
    }
    setIsSaving(false);
  };

  const handleEdit = (emp) => { setSelectedEmployee(emp); setIsModalOpen(true); };
  const handleNew = () => { setSelectedEmployee(null); setIsModalOpen(true); };
  const handleOpenWarning = (e, emp) => { e.stopPropagation(); setWarningTarget(emp); setIsWarningModalOpen(true); };

  const handleDeleteEmployee = async (id) => {
    setIsSaving(true);
    try {
      await deleteEmployee(id);
      setIsModalOpen(false);
      await dialog.showAlert("ลบพนักงานออกจากระบบเรียบร้อยแล้ว", "สำเร็จ", "success");
    } catch (error) {
      dialog.showAlert("เกิดข้อผิดพลาด: " + error.message, "Error", "error");
    }
    setIsSaving(false);
  };

  return (
    <div id="page-admin-people" className="flex flex-col h-full bg-[#FAFAFA] text-[#1E293B] font-sans">

      {/* HEADER */}
      <header className="px-6 pt-6 pb-2 z-20 bg-[#FAFAFA]/90 backdrop-blur-sm sticky top-0">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-slate-800">จัดการพนักงาน</h1>
          <button
            onClick={handleNew}
            className="w-10 h-10 bg-blue-600 rounded-full shadow-lg text-white flex items-center justify-center hover:bg-blue-700 transition active:scale-95"
          >
            <Plus weight="bold" size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 mb-2">
          <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-sm">
            <MagnifyingGlass className="text-slate-400" />
            <input type="text" placeholder="ค้นหาชื่อ..." className="bg-transparent text-sm w-full outline-none" />
          </div>
          <button className="bg-white border border-slate-200 w-11 rounded-xl flex items-center justify-center text-slate-500 shadow-sm">
            <Funnel size={18} />
          </button>
        </div>
      </header>

      {/* CONTENT LIST */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6 pt-2">
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-xs">กำลังโหลดข้อมูล...</div>
          ) : employees.length === 0 ? (
            <div className="text-center py-10 opacity-50">
              <p>ยังไม่มีพนักงาน</p>
              <p className="text-xs">กดปุ่ม + เพื่อเริ่มสร้างทีมของคุณ</p>
            </div>
          ) : (
            employees.map((emp) => (
              <div
                key={emp.id}
                onClick={() => handleEdit(emp)}
                className={`modern-card p-4 flex items-center gap-4 cursor-pointer active:scale-95 transition relative group bg-white rounded-2xl border border-slate-100 shadow-sm ${emp.status === 'resigned' ? 'grayscale opacity-60' : ''}`}
              >
                <img src={`https://ui-avatars.com/api/?name=${emp.name}&background=random`} className="w-12 h-12 rounded-full border border-slate-100 shadow-sm" alt={emp.name} />

                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-800">{emp.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${emp.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
                      {emp.status === 'active' ? 'Active' : 'Resigned'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{emp.position || 'ไม่ระบุตำแหน่ง'} • {emp.type || 'Full Time'}</p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Money weight="fill" /> {emp.salary ? Number(emp.salary).toLocaleString() : '0'}
                  </p>
                </div>

                <div className="flex flex-col gap-2 z-10">
                  <button className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition">
                    <PencilSimple weight="bold" />
                  </button>
                  <button onClick={(e) => handleOpenWarning(e, emp)} className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100 transition" title="ออกใบเตือน">
                    <WarningCircle weight="fill" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* LOAD MORE BUTTON */}
        {
          !loading && hasMore && employees.length > 0 && (
            <div className="mt-4 text-center">
              <button
                onClick={loadMore}
                className="text-sm text-blue-600 font-bold hover:bg-blue-50 px-4 py-2 rounded-full transition"
              >
                โหลดเพิ่มเติม (+20)
              </button>
            </div>
          )
        }
      </main >

      {/* --- MODALS --- */}
      {
        EmployeeModal && (
          <EmployeeModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            employee={selectedEmployee}
            onSave={handleSaveEmployee}
            onDelete={handleDeleteEmployee}
            isLoading={isSaving}
          />
        )
      }

      <WarningModal isOpen={isWarningModalOpen} onClose={() => setIsWarningModalOpen(false)} employee={warningTarget} />

      {/* ❌ ลบส่วน SUCCESS POPUP เดิมออกไปเลย เพราะใช้ Dialog แล้ว */}
    </div >
  );
}