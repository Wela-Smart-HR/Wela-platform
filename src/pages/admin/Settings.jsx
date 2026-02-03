import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useDialog } from '../../contexts/DialogContext';
import {
  FloppyDisk, Buildings, CaretRight, UsersThree, ThumbsUp, Eye,
  Bell, LockKey, SignOut
} from '@phosphor-icons/react';
// ✅ Import Hook จาก Features Architecture
import { useSettings } from '../../features/settings/useSettings';
// ✅ Import Sub-components
import ShiftManager from '../../components/admin/settings/ShiftManager';
import OTManager from '../../components/admin/settings/OTManager';
import GeneralRules from '../../components/admin/settings/GeneralRules';

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const dialog = useDialog();
  const { logout, currentUser } = useAuth();

  // ✅ เรียกใช้ Hook ข้อมูล จาก Features
  const { settings, loading: dataLoading, saveAll } = useSettings(currentUser?.companyId);

  const [activeTab, setActiveTab] = useState(location.state?.defaultTab || 'general');
  const [isSaving, setIsSaving] = useState(false);

  // State หลัก
  const [storeConfig, setStoreConfig] = useState({
    name: "", taxId: "", radius: 350, gpsEnabled: true,
    location: { lat: 13.7563, lng: 100.5018 },
    maxDeduction: 0, gracePeriod: 0, deductionPerMinute: 0,
    onTimeMessage: "", lateMessage: "",
    shifts: [], otTypes: []
  });

  useEffect(() => {
    if (settings) {
      setStoreConfig(prev => ({
        ...prev,
        ...settings,
        location: settings.settings?.location || settings.location || prev.location,
        radius: settings.settings?.radius || settings.radius || prev.radius,
        gpsEnabled: settings.settings?.gpsEnabled ?? settings.gpsEnabled ?? prev.gpsEnabled,
        otTypes: settings.otTypes || []
      }));
    }
  }, [settings]);

  // --- Main Actions ---
  const handleSave = async () => {
    if (!currentUser?.companyId) return;
    setIsSaving(true);
    try {
      await saveAll(storeConfig);
      await dialog.showAlert("บันทึกข้อมูลเรียบร้อยแล้ว", "สำเร็จ!", "success");
    } catch (error) {
      console.error("Save Error:", error);
      await dialog.showAlert("เกิดข้อผิดพลาด: " + error.message, "ผิดพลาด", "error");
    }
    setIsSaving(false);
  };

  const handleLogout = async () => {
    const isConfirmed = await dialog.showConfirm("คุณต้องการออกจากระบบใช่หรือไม่?", "ยืนยัน");
    if (isConfirmed) {
      await logout();
      navigate('/login');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] text-[#1E293B] font-sans">

      {/* HEADER */}
      <header className="px-6 pt-6 pb-2 z-20 bg-[#FAFAFA]/90 backdrop-blur-sm sticky top-0">
        <div className="flex justify-between items-center mb-2">
          <div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Control Center</p><h1 className="text-2xl font-bold text-slate-800">ตั้งค่าระบบ</h1></div>
          <button onClick={handleSave} disabled={isSaving || dataLoading} className="w-10 h-10 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition active:scale-95 disabled:opacity-50"><FloppyDisk size={20} weight="bold" /></button>
        </div>
        <div className="flex gap-1 bg-slate-200 p-1 rounded-xl mt-2">
          <button onClick={() => setActiveTab('general')} className={`tab-btn flex-1 py-2 rounded-lg text-xs font-bold ${activeTab === 'general' ? 'active' : ''}`}>ทั่วไป</button>
          <button onClick={() => setActiveTab('rules')} className={`tab-btn flex-1 py-2 rounded-lg text-xs font-bold ${activeTab === 'rules' ? 'active' : ''}`}>กฎ & กะงาน</button>
          <button onClick={() => setActiveTab('account')} className={`tab-btn flex-1 py-2 rounded-lg text-xs font-bold ${activeTab === 'account' ? 'active' : ''}`}>บัญชี</button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6 pt-4">
        {dataLoading && <div className="text-center py-4 text-xs text-slate-400">กำลังโหลด...</div>}

        {/* TAB 1: GENERAL */}
        {activeTab === 'general' && !dataLoading && (
          <div className="animate-fade-in-up">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">ข้อมูลหลัก</h3>
            <div className="modern-card overflow-hidden mb-6">
              <div className="p-4 border-b border-slate-50 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center"><Buildings size={20} weight="fill" /></div>
                <div className="flex-1">
                  <input type="text" value={storeConfig.name} onChange={(e) => setStoreConfig({ ...storeConfig, name: e.target.value })} className="text-sm font-bold text-slate-700 w-full bg-transparent outline-none mb-1" placeholder="ชื่อร้าน / บริษัท" />
                  <div className="flex items-center gap-2"><span className="text-[10px] text-slate-400">TAX ID:</span><input type="text" value={storeConfig.taxId} onChange={(e) => setStoreConfig({ ...storeConfig, taxId: e.target.value })} className="text-[10px] text-slate-600 bg-slate-50 rounded px-1 w-32 outline-none" placeholder="1234567890" /></div>
                </div>
              </div>
              <div onClick={() => navigate('/people')} className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition">
                <div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-md shadow-blue-200"><UsersThree size={20} weight="fill" /></div><div><p className="text-sm font-bold text-slate-800">จัดการพนักงาน</p><p className="text-[10px] text-slate-500">เพิ่ม/ลบ, เงินเดือน</p></div></div>
                <CaretRight size={18} weight="bold" className="text-slate-300" />
              </div>
            </div>

            <div className="modern-card overflow-hidden mb-6 p-5 space-y-4">
              <div><label className="block text-[10px] font-bold text-emerald-600 mb-1 uppercase">เข้างานทันเวลา</label><div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"><ThumbsUp size={18} weight="fill" className="text-emerald-500" /><input type="text" value={storeConfig.onTimeMessage} onChange={(e) => setStoreConfig({ ...storeConfig, onTimeMessage: e.target.value })} className="bg-transparent w-full text-sm text-slate-700 outline-none font-medium" placeholder="ข้อความทักทาย" /></div></div>
              <div><label className="block text-[10px] font-bold text-orange-500 mb-1 uppercase">เข้างานสาย</label><div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"><Eye size={18} weight="fill" className="text-orange-500" /><input type="text" value={storeConfig.lateMessage} onChange={(e) => setStoreConfig({ ...storeConfig, lateMessage: e.target.value })} className="bg-transparent w-full text-sm text-slate-700 outline-none font-medium" placeholder="ข้อความเตือน" /></div></div>
            </div>
          </div>
        )}

        {/* TAB 2: RULES */}
        {activeTab === 'rules' && !dataLoading && (
          <div className="animate-fade-in-up space-y-6">

            {/* 1. General Rules (GPS & Deductions) */}
            <GeneralRules
              settings={storeConfig}
              onChange={(newSettings) => setStoreConfig({ ...storeConfig, ...newSettings })}
            />

            {/* 2. Shifts */}
            <ShiftManager
              shifts={storeConfig.shifts}
              onChange={(newShifts) => setStoreConfig({ ...storeConfig, shifts: newShifts })}
            />

            {/* 3. OT Types */}
            <OTManager
              otTypes={storeConfig.otTypes}
              onChange={(newOTs) => setStoreConfig({ ...storeConfig, otTypes: newOTs })}
            />

          </div>
        )}

        {/* TAB 3: ACCOUNT */}
        {activeTab === 'account' && (
          <div className="animate-fade-in-up">
            <div className="modern-card p-4 flex items-center gap-4 mb-6">
              <div className="relative"><img src={`https://ui-avatars.com/api/?name=${currentUser?.name || 'Admin'}&background=0F172A&color=fff`} className="w-16 h-16 rounded-full border-4 border-slate-50 shadow-sm" alt="Admin" /></div>
              <div className="flex-1"><h2 className="text-lg font-bold text-slate-800">ผู้ดูแลระบบสูงสุด</h2><p className="text-xs text-slate-500">{currentUser?.email}</p></div>
            </div>
            <div className="modern-card overflow-hidden mb-6">
              <div className="p-4 border-b border-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-50"><div className="flex items-center gap-3"><Bell size={20} weight="fill" className="text-slate-400" /><span className="text-sm font-bold text-slate-700">การแจ้งเตือน</span></div><CaretRight weight="bold" className="text-slate-300" /></div>
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"><div className="flex items-center gap-3"><LockKey size={20} weight="fill" className="text-slate-400" /><span className="text-sm font-bold text-slate-700">เปลี่ยนรหัสผ่าน</span></div><CaretRight weight="bold" className="text-slate-300" /></div>
            </div>
            <button onClick={handleLogout} className="w-full bg-white border border-red-100 text-red-600 font-bold py-3 rounded-xl shadow-sm hover:bg-red-50 transition flex items-center justify-center gap-2"><SignOut weight="bold" size={18} /> ออกจากระบบ</button>
          </div>
        )}
      </main>
    </div>
  );
}