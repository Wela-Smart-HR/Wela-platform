import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { 
  User, SignOut, Envelope, Phone, 
  IdentificationCard, CaretRight, 
  Gear, Question, ShieldCheck, X, FloppyDisk, Key, LockKey
} from '@phosphor-icons/react';
import { useDialog } from '../../contexts/DialogContext';

export default function Profile() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const dialog = useDialog();
  
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [editForm, setEditForm] = useState({ displayName: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (currentUser) {
        setEditForm({
            displayName: currentUser.displayName || currentUser.name || '',
            phone: currentUser.phone || ''
        });
    }
  }, [currentUser]);

  const onConfirmLogout = async () => {
    try {
        await logout();
        navigate('/login');
    } catch (error) {
        console.error("Logout error:", error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editForm.displayName.trim()) return dialog.showAlert("กรุณาระบุชื่อ-สกุล", "ข้อมูลไม่ครบ", "warning");

    setLoading(true);
    try {
        if (currentUser) {
            await updateProfile(currentUser, { displayName: editForm.displayName });
        }
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
            name: editForm.displayName,
            displayName: editForm.displayName,
            phone: editForm.phone,
            updatedAt: serverTimestamp()
        });

        await dialog.showAlert("บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว", "สำเร็จ", "success");
        setShowEditModal(false);
    } catch (error) {
        console.error(error);
        dialog.showAlert("เกิดข้อผิดพลาด: " + error.message, "Error", "error");
    }
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword) return dialog.showAlert("กรุณาระบุรหัสผ่านเดิมเพื่อยืนยันตัวตน", "ข้อมูลไม่ครบ", "warning");
    if (passwordForm.newPassword.length < 6) return dialog.showAlert("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร", "รหัสสั้นไป", "warning");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return dialog.showAlert("รหัสผ่านยืนยันไม่ตรงกัน", "รหัสไม่ตรง", "warning");
    if (passwordForm.currentPassword === passwordForm.newPassword) return dialog.showAlert("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม", "รหัสซ้ำ", "warning");

    setLoading(true);
    try {
        if (currentUser && currentUser.email) {
            const credential = EmailAuthProvider.credential(currentUser.email, passwordForm.currentPassword);
            await reauthenticateWithCredential(currentUser, credential);
            await updatePassword(currentUser, passwordForm.newPassword);

            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, {
                lastPasswordChange: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            await dialog.showAlert("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กรุณาล็อกอินใหม่", "สำเร็จ", "success");
            setShowPasswordModal(false);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            
            await logout();
            navigate('/login');
        }
    } catch (error) {
        console.error(error);
        if (error.code === 'auth/wrong-password') {
            dialog.showAlert("รหัสผ่านเดิมไม่ถูกต้อง", "ยืนยันตัวตนไม่ผ่าน", "error");
        } else if (error.code === 'auth/too-many-requests') {
            dialog.showAlert("ทำรายการผิดหลายครั้งเกินไป กรุณารอสักครู่", "ระงับชั่วคราว", "error");
        } else {
            dialog.showAlert("เกิดข้อผิดพลาด: " + error.message, "Error", "error");
        }
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] font-sans text-[#1E293B]">
      
      {/* Header */}
      <header className="px-6 pt-6 pb-4 bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-100">
        <div className="flex justify-between items-center">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">My Account</p>
                <h1 className="text-2xl font-bold text-slate-800">โปรไฟล์ของฉัน</h1>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <User size={16} weight="fill" />
            </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-6 py-6 no-scrollbar space-y-6">
        
        {/* Hero */}
        <div className="flex flex-col items-center animate-fade-in-up">
            <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-slate-200">
                    <img 
                        src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.displayName || 'User'}&background=0D8ABC&color=fff`} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 border-4 border-[#FAFAFA] rounded-full flex items-center justify-center text-white shadow-sm">
                    <User size={12} weight="fill" />
                </div>
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-800">{currentUser?.displayName || currentUser?.name || 'พนักงาน'}</h2>
            <p className="text-sm font-medium text-slate-400">{currentUser?.role || 'พนักงานทั่วไป'}</p>
        </div>

        {/* Info Cards */}
        <div className="space-y-3 animate-fade-in-up delay-75">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">ข้อมูลส่วนตัว</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 flex items-center gap-4 border-b border-slate-50">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><Envelope weight="fill" size={16}/></div>
                    <div className="flex-1 min-w-0"><p className="text-[10px] font-bold text-slate-400 uppercase">อีเมล</p><p className="text-sm font-bold text-slate-700 truncate">{currentUser?.email}</p></div>
                </div>
                <div className="p-4 flex items-center gap-4 border-b border-slate-50">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0"><Phone weight="fill" size={16}/></div>
                    <div className="flex-1"><p className="text-[10px] font-bold text-slate-400 uppercase">เบอร์โทรศัพท์</p><p className="text-sm font-bold text-slate-700">{currentUser?.phone || '-'}</p></div>
                </div>
                <div className="p-4 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center shrink-0"><IdentificationCard weight="fill" size={16}/></div>
                    <div className="flex-1"><p className="text-[10px] font-bold text-slate-400 uppercase">รหัสพนักงาน</p><p className="text-sm font-bold text-slate-700">{currentUser?.employeeId || currentUser?.uid?.slice(0,6).toUpperCase()}</p></div>
                </div>
            </div>
        </div>

        {/* Settings Menu */}
        <div className="space-y-3 animate-fade-in-up delay-100">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">ตั้งค่า & ความปลอดภัย</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <button onClick={() => setShowEditModal(true)} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition border-b border-slate-50 text-left">
                    <div className="flex items-center gap-3"><Gear weight="fill" className="text-slate-400" size={20}/><span className="text-sm font-bold text-slate-600">แก้ไขข้อมูลส่วนตัว</span></div><CaretRight weight="bold" className="text-slate-300" size={16}/>
                </button>
                <button onClick={() => setShowPasswordModal(true)} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition border-b border-slate-50 text-left">
                    <div className="flex items-center gap-3"><ShieldCheck weight="fill" className="text-slate-400" size={20}/><span className="text-sm font-bold text-slate-600">เปลี่ยนรหัสผ่าน</span></div><CaretRight weight="bold" className="text-slate-300" size={16}/>
                </button>
                <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left">
                    <div className="flex items-center gap-3"><Question weight="fill" className="text-slate-400" size={20}/><span className="text-sm font-bold text-slate-600">ช่วยเหลือ & แจ้งปัญหา</span></div><CaretRight weight="bold" className="text-slate-300" size={16}/>
                </button>
            </div>
        </div>

        {/* Logout Button */}
        <div className="pt-2 pb-6">
            <button onClick={() => setShowLogoutModal(true)} className="w-full bg-white border border-rose-100 text-rose-500 py-3.5 rounded-2xl font-bold shadow-sm hover:bg-rose-50 active:scale-95 transition flex items-center justify-center gap-2">
                <SignOut size={20} weight="bold" />
                ออกจากระบบ
            </button>
            <p className="text-center text-[10px] text-slate-300 mt-4 font-bold tracking-wider">VERSION 1.0.0</p>
        </div>

      </main>

      {/* --- MODAL 1: LOGOUT --- */}
      {showLogoutModal && createPortal(
        <div className="fixed inset-0 z-[99] flex items-end justify-center sm:items-center animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)}></div>
            {/* ✅ แก้ไข class: w-full (เต็มจอ), rounded-t-[32px] (มนบน), ไม่มี mb-4 */}
            <div className="bg-white w-full sm:max-w-xs rounded-t-[32px] sm:rounded-[32px] p-6 relative z-10 animate-slide-up shadow-2xl">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4 shadow-sm"><SignOut size={32} weight="fill" /></div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">ออกจากระบบ?</h3>
                    <p className="text-sm text-slate-500 mb-6">คุณต้องการออกจากระบบใช่หรือไม่ <br/>คุณจะต้องเข้าสู่ระบบใหม่ในครั้งถัดไป</p>
                    <div className="flex gap-3 w-full">
                        <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">ยกเลิก</button>
                        <button onClick={onConfirmLogout} className="flex-1 py-3 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-200 transition">ยืนยัน</button>
                    </div>
                </div>
            </div>
        </div>, document.body
      )}

      {/* --- MODAL 2: EDIT PROFILE --- */}
      {showEditModal && createPortal(
        <div className="fixed inset-0 z-[99] flex items-end justify-center sm:items-center animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
            <div className="bg-white w-full sm:max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 relative z-10 animate-slide-up shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800"><User className="text-blue-500"/> แก้ไขข้อมูลส่วนตัว</h3>
                    <button onClick={() => setShowEditModal(false)}><X weight="bold" className="text-slate-400"/></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">ชื่อ-นามสกุล (Display Name)</label>
                        <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" value={editForm.displayName} onChange={e => setEditForm({...editForm, displayName: e.target.value})} placeholder="ระบุชื่อของคุณ" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">เบอร์โทรศัพท์</label>
                        <input type="tel" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} placeholder="ระบุเบอร์โทร" />
                    </div>
                    <button onClick={handleUpdateProfile} disabled={loading} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 mt-2 shadow-lg hover:bg-slate-800 active:scale-95 transition disabled:opacity-50">
                        {loading ? 'กำลังบันทึก...' : <><FloppyDisk weight="bold"/> บันทึกข้อมูล</>}
                    </button>
                </div>
            </div>
        </div>, document.body
      )}

      {/* --- MODAL 3: CHANGE PASSWORD --- */}
      {showPasswordModal && createPortal(
        <div className="fixed inset-0 z-[99] flex items-end justify-center sm:items-center animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPasswordModal(false)}></div>
            <div className="bg-white w-full sm:max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 relative z-10 animate-slide-up shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800"><Key className="text-emerald-500"/> เปลี่ยนรหัสผ่าน</h3>
                    <button onClick={() => setShowPasswordModal(false)}><X weight="bold" className="text-slate-400"/></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1 flex items-center gap-1"><LockKey weight="fill"/> รหัสผ่านเดิม (Current Password)</label>
                        <input type="password" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:border-blue-500 outline-none" value={passwordForm.currentPassword} onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} placeholder="ระบุรหัสปัจจุบันเพื่อยืนยัน" />
                    </div>
                    <div className="border-t border-slate-100 my-2"></div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">รหัสผ่านใหม่ (New Password)</label>
                        <input type="password" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:border-emerald-500 outline-none" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} placeholder="********" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">ยืนยันรหัสผ่านใหม่ (Confirm)</label>
                        <input type="password" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:border-emerald-500 outline-none" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} placeholder="********" />
                    </div>
                    <button onClick={handleChangePassword} disabled={loading} className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 mt-2 shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-95 transition disabled:opacity-50">
                        {loading ? 'กำลังดำเนินการ...' : <><ShieldCheck weight="bold"/> ยืนยันเปลี่ยนรหัสผ่าน</>}
                    </button>
                </div>
            </div>
        </div>, document.body
      )}

    </div>
  );
}