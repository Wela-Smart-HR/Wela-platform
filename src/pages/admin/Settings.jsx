import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useDialog } from '../../contexts/DialogContext';
import {
  FloppyDisk, Buildings, CaretRight, UsersThree, ThumbsUp, Eye,
  MapPinArea, Clock, Plus, PencilSimple, Bell, LockKey, SignOut,
  Moon, Sun, Translate, Trash, X, Coins
} from '@phosphor-icons/react';
// ✅ Import Hook จาก Features Architecture
import { useSettings } from '../../features/settings/useSettings';

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const dialog = useDialog(); // เรียกใช้ Dialog
  const { logout, currentUser } = useAuth();
  const { theme, toggleTheme, language, toggleLanguage } = useApp();

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

  // --- Helper: Sorting ---
  const sortShifts = (shifts) => [...shifts].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const sortOTs = (ots) => [...ots].sort((a, b) => a.rate - b.rate);

  // --- Logic: Shift Management (Add/Edit/Sort) ---
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState({ id: null, name: '', startTime: '09:00', endTime: '18:00' });

  const openShiftModal = (shift = null) => {
    if (shift) {
      setShiftForm({ ...shift }); // โหมดแก้ไข
    } else {
      setShiftForm({ id: null, name: '', startTime: '09:00', endTime: '18:00' }); // โหมดสร้างใหม่
    }
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = () => {
    // ✅ เปลี่ยน alert เป็น dialog
    if (!shiftForm.name) return dialog.showAlert("กรุณาระบุชื่อกะงานให้ครบถ้วน", "ข้อมูลไม่ครบ", "error");

    let updatedShifts;
    if (shiftForm.id) {
      // แก้ไขรายการเดิม
      updatedShifts = storeConfig.shifts.map(s => s.id === shiftForm.id ? shiftForm : s);
    } else {
      // สร้างใหม่
      const newShiftItem = { ...shiftForm, id: `shift_${Date.now()}` };
      updatedShifts = [...(storeConfig.shifts || []), newShiftItem];
    }

    // เรียงลำดับตามเวลาเข้างาน
    setStoreConfig({ ...storeConfig, shifts: sortShifts(updatedShifts) });
    setIsShiftModalOpen(false);
  };

  // ✅ เพิ่ม async และใช้ dialog.showConfirm
  const handleDeleteShift = async (id) => {
    const isConfirmed = await dialog.showConfirm("คุณต้องการลบกะงานนี้ใช่หรือไม่?", "ยืนยันการลบ");

    if (isConfirmed) {
      const updatedShifts = storeConfig.shifts.filter(s => s.id !== id);
      setStoreConfig({ ...storeConfig, shifts: updatedShifts });
    }
  };

  // --- Logic: OT Management (Add/Edit/Sort) ---
  const [isOTModalOpen, setIsOTModalOpen] = useState(false);
  const [otForm, setOtForm] = useState({ id: null, name: '', rate: 1.5, enabled: true });

  const openOTModal = (ot = null) => {
    if (ot) {
      setOtForm({ ...ot }); // โหมดแก้ไข
    } else {
      setOtForm({ id: null, name: '', rate: 1.5, enabled: true }); // โหมดสร้างใหม่
    }
    setIsOTModalOpen(true);
  };

  const handleSaveOT = () => {
    // ✅ เปลี่ยน alert เป็น dialog
    if (!otForm.name || !otForm.rate) return dialog.showAlert("กรุณากรอกข้อมูลให้ครบถ้วน", "ข้อมูลไม่ครบ", "error");

    let updatedOTs;
    if (otForm.id) {
      // แก้ไขรายการเดิม
      updatedOTs = storeConfig.otTypes.map(ot => ot.id === otForm.id ? otForm : ot);
    } else {
      // สร้างใหม่
      const newOTItem = { ...otForm, id: `ot_${Date.now()}` };
      updatedOTs = [...(storeConfig.otTypes || []), newOTItem];
    }

    // เรียงลำดับตาม Rate (น้อยไปมาก)
    setStoreConfig({ ...storeConfig, otTypes: sortOTs(updatedOTs) });
    setIsOTModalOpen(false);
  };

  // ✅ เพิ่ม async และใช้ dialog.showConfirm
  const handleDeleteOT = async (id) => {
    const isConfirmed = await dialog.showConfirm("คุณต้องการลบประเภท OT นี้ใช่หรือไม่?", "ยืนยันการลบ");

    if (isConfirmed) {
      const updatedOTs = storeConfig.otTypes.filter(ot => ot.id !== id);
      setStoreConfig({ ...storeConfig, otTypes: updatedOTs });
    }
  };

  // --- Main Actions ---
  const handleSave = async () => {
    if (!currentUser?.companyId) return;
    setIsSaving(true);
    try {
      // ✅ ใช้ saveAll จาก hook แทน direct Firestore calls
      await saveAll(storeConfig);

      await dialog.showAlert("บันทึกข้อมูลเรียบร้อยแล้ว", "สำเร็จ!", "success");
    } catch (error) {
      console.error("Save Error:", error);
      await dialog.showAlert("เกิดข้อผิดพลาด: " + error.message, "ผิดพลาด", "error");
    }
    setIsSaving(false);
  };

  // ... (Logic เดิม: GPS, Logout) ...
  const [isLocating, setIsLocating] = useState(false); // ✅ State สำหรับ Button Loading

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      return dialog.showAlert("Browser ไม่รองรับ GPS", "Error", "error");
    }

    setIsLocating(true); // เริ่ม Spin

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false); // หยุด Spin
        setStoreConfig(prev => ({
          ...prev,
          location: {
            lat: pos.coords.latitude, // เก็บค่าจริง ไม่ปัดเศษ
            lng: pos.coords.longitude
          }
        }));
        await dialog.showAlert(
          `พิกัด: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`,
          "อัปเดตพิกัดสำเร็จ",
          "success"
        );
      },
      async (err) => {
        setIsLocating(false); // หยุด Spin
        console.error("GPS Error:", err);
        let msg = err.message;
        if (err.code === 1) msg = "กรุณาอนุญาตให้เข้าถึงตำแหน่ง (Allow Permission)";
        if (err.code === 2) msg = "ไม่สามารถระบุตำแหน่งได้ (Position Unavailable)";
        if (err.code === 3) msg = "หมดเวลาการเชื่อมต่อ (Timeout)";
        await dialog.showAlert("ไม่สามารถดึงพิกัดได้: " + msg, "GPS Error", "error");
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleLogout = async () => {
    // ✅ ใช้ dialog.showConfirm
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
            {/* ... ส่วน Display & Greeting (คงเดิม) ... */}
            <div className="modern-card overflow-hidden mb-6 p-5 space-y-4">
              <div><label className="block text-[10px] font-bold text-emerald-600 mb-1 uppercase">เข้างานทันเวลา</label><div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"><ThumbsUp size={18} weight="fill" className="text-emerald-500" /><input type="text" value={storeConfig.onTimeMessage} onChange={(e) => setStoreConfig({ ...storeConfig, onTimeMessage: e.target.value })} className="bg-transparent w-full text-sm text-slate-700 outline-none font-medium" placeholder="ข้อความทักทาย" /></div></div>
              <div><label className="block text-[10px] font-bold text-orange-500 mb-1 uppercase">เข้างานสาย</label><div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"><Eye size={18} weight="fill" className="text-orange-500" /><input type="text" value={storeConfig.lateMessage} onChange={(e) => setStoreConfig({ ...storeConfig, lateMessage: e.target.value })} className="bg-transparent w-full text-sm text-slate-700 outline-none font-medium" placeholder="ข้อความเตือน" /></div></div>
            </div>
          </div>
        )}

        {/* TAB 2: RULES */}
        {activeTab === 'rules' && !dataLoading && (
          <div className="animate-fade-in-up space-y-6">

            {/* 1. GPS */}
            <div className="modern-card p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><MapPinArea size={20} weight="fill" /></div><div><p className="text-sm font-bold text-slate-700">พิกัดร้าน (GPS)</p><p className="text-[10px] text-slate-400">ใช้สำหรับ Check-in</p></div></div>
                <button
                  onClick={getCurrentLocation}
                  disabled={isLocating}
                  className={`text-[10px] px-3 py-1.5 rounded-full font-bold transition flex items-center gap-1.5 ${isLocating ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                >
                  {isLocating ? (
                    <>
                      <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                      กำลังหา...
                    </>
                  ) : (
                    <>📍 ดึงพิกัดปัจจุบัน</>
                  )}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div><label className="text-[10px] font-bold text-slate-400 block mb-1">Latitude</label><input type="number" value={storeConfig.location?.lat} onChange={(e) => setStoreConfig({ ...storeConfig, location: { ...storeConfig.location, lat: parseFloat(e.target.value) } })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none" /></div>
                <div><label className="text-[10px] font-bold text-slate-400 block mb-1">Longitude</label><input type="number" value={storeConfig.location?.lng} onChange={(e) => setStoreConfig({ ...storeConfig, location: { ...storeConfig.location, lng: parseFloat(e.target.value) } })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none" /></div>
              </div>
              <div className="space-y-2 pt-3 border-t border-slate-50">
                <div className="flex justify-between text-xs font-bold text-slate-600"><span>รัศมี ({storeConfig.radius} ม.)</span></div>
                <input type="range" min="50" max="1000" step="50" value={storeConfig.radius} onChange={(e) => setStoreConfig({ ...storeConfig, radius: Number(e.target.value) })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3">
                <p className="text-xs font-bold text-slate-700">บังคับใช้ GPS</p>
                <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                  <input type="checkbox" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-300 checked:border-emerald-500" checked={storeConfig.gpsEnabled} onChange={(e) => setStoreConfig({ ...storeConfig, gpsEnabled: e.target.checked })} />
                  <label onClick={() => setStoreConfig({ ...storeConfig, gpsEnabled: !storeConfig.gpsEnabled })} className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${storeConfig.gpsEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}></label>
                </div>
              </div>
            </div>

            {/* 2. DEDUCTION RULES */}
            <div className="modern-card p-5 space-y-4 border-l-4 border-l-orange-400">
              <h3 className="text-sm font-bold text-slate-700 mb-2">กฎการหักเงิน</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold text-slate-500 mb-1">อนุโลม (นาที)</label><div className="relative"><input type="number" value={storeConfig.gracePeriod} onChange={(e) => setStoreConfig({ ...storeConfig, gracePeriod: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none text-center" /><span className="absolute right-8 top-2 text-[10px] text-slate-400">นาที</span></div></div>
                <div><label className="block text-[10px] font-bold text-slate-500 mb-1">หักนาทีละ</label><div className="relative"><input type="number" value={storeConfig.deductionPerMinute} onChange={(e) => setStoreConfig({ ...storeConfig, deductionPerMinute: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none text-center" /><span className="absolute right-8 top-2 text-[10px] text-slate-400">บาท</span></div></div>
              </div>
              <div><label className="block text-[10px] font-bold text-slate-500 mb-1">หักสูงสุดไม่เกิน (ต่อวัน)</label><input type="number" value={storeConfig.maxDeduction} onChange={(e) => setStoreConfig({ ...storeConfig, maxDeduction: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none" placeholder="0 = ไม่จำกัด" /></div>
            </div>

            {/* 3. SHIFTS (Editable & Sorted) */}
            <div>
              <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">กะทำงาน (Shifts)</h3>
                <button onClick={() => openShiftModal()} className="text-[10px] font-bold text-white bg-indigo-600 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm active:scale-95 transition"><Plus weight="bold" /> เพิ่มกะ</button>
              </div>
              <div className="modern-card overflow-hidden">
                {(!storeConfig.shifts || storeConfig.shifts.length === 0) && <div className="p-4 text-center text-xs text-slate-400">ยังไม่มีกะงาน</div>}
                {storeConfig.shifts?.map((shift, index) => (
                  <div key={index} className="p-4 border-b border-slate-50 last:border-0 flex justify-between items-center hover:bg-slate-50 transition group">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{shift.name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5 bg-slate-100 px-2 py-0.5 rounded inline-block">{shift.startTime} - {shift.endTime} น.</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openShiftModal(shift)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition"><PencilSimple weight="bold" /></button>
                      <button onClick={() => handleDeleteShift(shift.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition"><Trash weight="fill" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. OT TYPES (Editable & Sorted) */}
            <div>
              <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">ประเภท OT</h3>
                <button onClick={() => openOTModal()} className="text-[10px] font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm active:scale-95 transition"><Plus weight="bold" /> เพิ่ม OT</button>
              </div>
              <div className="modern-card overflow-hidden">
                {(!storeConfig.otTypes || storeConfig.otTypes.length === 0) && <div className="p-4 text-center text-xs text-slate-400">ยังไม่มีประเภท OT</div>}
                {storeConfig.otTypes?.map((ot, index) => (
                  <div key={index} className="p-4 border-b border-slate-50 last:border-0 flex justify-between items-center hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><Coins weight="fill" /></div>
                      <div><p className="text-sm font-bold text-slate-800">{ot.name}</p><p className="text-[10px] text-slate-500">ตัวคูณ: x{ot.rate}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                        <input type="checkbox" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-300 checked:border-emerald-500"
                          checked={ot.enabled}
                          onChange={() => {
                            const newOTs = [...storeConfig.otTypes];
                            newOTs[index].enabled = !newOTs[index].enabled;
                            setStoreConfig({ ...storeConfig, otTypes: newOTs });
                          }}
                        />
                        <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${ot.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}></label>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openOTModal(ot)} className="text-slate-300 hover:text-blue-500 p-1"><PencilSimple weight="bold" size={16} /></button>
                        <button onClick={() => handleDeleteOT(ot.id)} className="text-slate-300 hover:text-rose-500 p-1"><Trash weight="bold" size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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

      {/* --- MODAL: SHIFT (Create/Edit) --- */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsShiftModalOpen(false)}></div>
          <div className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl relative z-10 animate-zoom-in">
            <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-slate-800">{shiftForm.id ? 'แก้ไขกะงาน' : 'เพิ่มกะงานใหม่'}</h3><button onClick={() => setIsShiftModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"><X weight="bold" /></button></div>
            <div className="space-y-3">
              <div><label className="text-[10px] font-bold text-slate-400 mb-1 block">ชื่อกะงาน</label><input type="text" placeholder="เช่น กะเช้า" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none" value={shiftForm.name} onChange={e => setShiftForm({ ...shiftForm, name: e.target.value })} /></div>
              <div className="flex gap-2">
                <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 mb-1 block">เวลาเข้า</label><input type="time" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm font-bold outline-none" value={shiftForm.startTime} onChange={e => setShiftForm({ ...shiftForm, startTime: e.target.value })} /></div>
                <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 mb-1 block">เวลาออก</label><input type="time" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm font-bold outline-none" value={shiftForm.endTime} onChange={e => setShiftForm({ ...shiftForm, endTime: e.target.value })} /></div>
              </div>
              <button onClick={handleSaveShift} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg mt-2 hover:bg-indigo-700 active:scale-95 transition">บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: OT (Create/Edit) --- */}
      {isOTModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsOTModalOpen(false)}></div>
          <div className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl relative z-10 animate-zoom-in">
            <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-slate-800">{otForm.id ? 'แก้ไขประเภท OT' : 'เพิ่มประเภท OT'}</h3><button onClick={() => setIsOTModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"><X weight="bold" /></button></div>
            <div className="space-y-3">
              <div><label className="text-[10px] font-bold text-slate-400 mb-1 block">ชื่อ OT</label><input type="text" placeholder="เช่น OT พิเศษ" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none" value={otForm.name} onChange={e => setOtForm({ ...otForm, name: e.target.value })} /></div>
              <div><label className="text-[10px] font-bold text-slate-400 mb-1 block">อัตราคูณ (Rate)</label><input type="number" step="0.1" placeholder="1.5" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none text-center" value={otForm.rate} onChange={e => setOtForm({ ...otForm, rate: Number(e.target.value) })} /></div>
              <button onClick={handleSaveOT} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg mt-2 hover:bg-emerald-700 active:scale-95 transition">บันทึก</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}