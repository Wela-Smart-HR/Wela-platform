import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { Storefront, User, LockKey, CircleNotch } from '@phosphor-icons/react';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signupOwner } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signupOwner(email, password, name, companyName);
      navigate('/'); // สมัครเสร็จให้เด้งเข้าหน้า Dashboard เลย
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาด: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden relative z-10 p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">เปิดใช้งานใหม่ 🚀</h1>
          <p className="text-slate-400 text-sm">สำหรับเจ้าของธุรกิจ (Owner)</p>
        </div>

        {error && <div className="bg-red-50 text-red-500 text-xs p-3 rounded-lg mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">ชื่อร้าน / บริษัท</label>
            <div className="relative">
              <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 text-sm outline-none" placeholder="เช่น ร้านกาแฟปรายมี่" />
              <Storefront className="absolute left-3 top-3.5 text-slate-400" size={18} weight="bold" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">ชื่อเจ้าของ</label>
            <div className="relative">
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 text-sm outline-none" placeholder="ชื่อ-นามสกุล" />
              <User className="absolute left-3 top-3.5 text-slate-400" size={18} weight="bold" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">อีเมล (Login)</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm outline-none" placeholder="email@example.com" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">รหัสผ่าน</label>
            <div className="relative">
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 text-sm outline-none" placeholder="******" />
              <LockKey className="absolute left-3 top-3.5 text-slate-400" size={18} weight="bold" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
            {loading ? <CircleNotch className="animate-spin" size={20} /> : "ลงทะเบียนเจ้าของร้าน"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-slate-400">
          มีบัญชีอยู่แล้ว? <Link to="/login" className="text-blue-600 font-bold hover:underline">เข้าสู่ระบบ</Link>
        </div>
      </div>
    </div>
  );
}