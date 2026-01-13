import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. ล็อกอิน
      const userCredential = await login(email, password);
      const user = userCredential.user;

      // 2. เช็ค Role จาก Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      let role = 'employee';
      
      if (userDoc.exists()) {
        role = userDoc.data().role;
      }

      // 3. แยกทางเดินตาม Role
      if (role === 'owner') {
        navigate('/');
      } else {
        navigate('/connect');
      }

    } catch (err) {
      console.error(err);
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl text-center">
        
        {/* ✅ แก้ไขส่วนโลโก้ตรงนี้ครับ */}
        {/* ลบกล่องสีฟ้าเดิมออก และใส่ img แทน เพื่อให้เห็นสีของโลโก้ Wela ชัดเจน */}
        <div className="flex justify-center mx-auto mb-6">
           <img 
             src="/logo.svg" 
             alt="Wela HR Logo" 
             className="w-20 h-20 object-contain drop-shadow-sm" 
           />
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-2">WELA PLATFORM</h2>
        <p className="text-slate-500 mb-8 text-sm">ระบบลงเวลางานยุคใหม่</p>
        
        {error && <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl mb-4 border border-red-100">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
              placeholder="******@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-1">Password</label>
             <input 
              type="password" 
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-800 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-slate-700 active:scale-95 transition mt-4"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-400">
          ยังไม่มีบัญชีร้านค้า? <Link to="/signup" className="text-blue-600 font-bold hover:underline">สมัครสมาชิกเจ้าของร้าน</Link>
        </p>

      </div>
    </div>
  );
}