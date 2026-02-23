import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboard } from '../../hooks/useDashboard';
import { useSalaryCalculator } from '../../hooks/useSalaryCalculator';
import { db } from '../../shared/lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';

import {
  CalendarBlank, Receipt, WarningCircle, CaretRight,
  CalendarCheck, ClockCounterClockwise, Bell, User, Fingerprint,
  CheckCircle, XCircle, Alarm, Wallet, TrendUp, AirplaneTilt
} from '@phosphor-icons/react';

export default function Connect() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Logic เดิม
  const {
    todayRecord, missingPunch, absentAlert, loading, notifications, unreadCount
  } = useDashboard(currentUser);

  // Logic Widget เงินเดือน
  const [attendanceList, setAttendanceList] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [deductionConfig, setDeductionConfig] = useState({ dailyWage: 500, employmentType: 'daily' });

  useEffect(() => {
    if (!currentUser) return;
    const fetchConfig = async () => {
      if (currentUser.companyId) {
        const docRef = doc(db, "companies", currentUser.companyId, "settings", "deduction");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setDeductionConfig(prev => ({ ...prev, ...docSnap.data() }));
      }
    };
    fetchConfig();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const qAtt = query(collection(db, "attendance"), where("userId", "==", currentUser.uid), where("createdAt", ">=", startOfMonth));
    const unsubAtt = onSnapshot(qAtt, (snapshot) => {
      setAttendanceList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubAtt();
  }, [currentUser]);

  const { stats } = useSalaryCalculator(attendanceList, [], deductionConfig, currentMonth, deductionConfig.employmentType);

  // Helpers
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);
  const todayDate = new Date();
  const dateStr = todayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  const formatTime = (dateObj) => dateObj ? dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const formatDateShort = (dateObj) => dateObj ? dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
  const timeAgo = (timestamp) => {
    if (!timestamp) return '';
    const seconds = Math.floor((new Date() - timestamp.toDate()) / 1000);
    if (seconds < 60) return 'เมื่อกี้';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ชม. ที่แล้ว`;
    return `${Math.floor(hours / 24)} วันที่แล้ว`;
  };

  // ✅ 1. MenuCard ดีไซน์ใหม่ (Admin Style: White Card, Border, Clean)
  const MenuCard = ({ title, subtitle, icon: Icon, colorClass, onClick }) => {
    return (
      <div
        onClick={onClick}
        // ใช้สไตล์เดียวกับ Card ใน Admin Dashboard (bg-white, rounded-24px, shadow-sm, border)
        className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 relative overflow-hidden group active:scale-95 transition-all duration-200 cursor-pointer flex flex-col justify-between h-[150px] hover:border-slate-300"
      >
        <div className="flex justify-between items-start">
          {/* ไอคอนสีเทาจางๆ เหมือนหน้า Admin */}
          <div className="text-slate-300 group-hover:text-slate-400 transition-colors">
            <Icon weight="duotone" size={24} className="sm:w-6 sm:h-6" />
          </div>

          {/* Tag เล็กๆ ด้านขวาบน */}
          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${colorClass}`}>
            Open
          </span>
        </div>

        <div>
          <h3 className="text-lg font-bold text-[#0F172A] group-hover:text-blue-600 transition-colors leading-tight mb-1">{title}</h3>
          <p className="text-[11px] text-slate-400 font-medium">{subtitle}</p>
        </div>
      </div>
    );
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#F8F9FD] px-6 pt-8 pb-24 font-sans text-slate-800">

      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{dateStr}</p>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Dashboard</h1>
        </div>
        <div className="flex gap-3">
          {/* Notifications removed as requested by user */}
          <button onClick={() => navigate('/connect/profile')} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 transition overflow-hidden">
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User weight="bold" size={20} />
            )}
          </button>
        </div>
      </div>

      {/* ALERT CARDS */}
      {missingPunch && (
        <div onClick={() => navigate('/connect/time', { state: { openRetro: true } })} className="bg-gradient-to-r from-[#EF4444] to-[#F43F5E] rounded-2xl p-4 shadow-lg shadow-red-500/20 mb-6 flex items-center justify-between cursor-pointer active:scale-95 transition relative overflow-hidden group animate-pulse-soft">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white border border-white/20 shrink-0">
              <WarningCircle weight="bold" size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Action Required</h3>
              <p className="text-white/90 text-[11px] font-medium leading-tight mt-0.5">
                ลืมตอกบัตรออกวันที่ <span className="underline decoration-white/50 underline-offset-2 font-bold">{formatDateShort(missingPunch.date)}</span>
                <br />แตะเพื่อแก้ไข
              </p>
            </div>
          </div>
          <CaretRight weight="bold" className="text-white/80 shrink-0" size={18} />
        </div>
      )}

      {!missingPunch && absentAlert && (
        <div onClick={() => navigate('/connect/time')} className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-2xl p-4 shadow-lg shadow-amber-500/20 mb-6 flex items-center justify-between cursor-pointer active:scale-95 transition relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white border border-white/20 shrink-0 animate-bounce">
              <Alarm weight="bold" size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">เริ่มงานแล้วนะ! ⏰</h3>
              <p className="text-white/90 text-[11px] font-medium leading-tight mt-0.5">
                คุณมีกะงานวันนี้เวลา <span className="font-bold bg-white/20 px-1 rounded">{absentAlert.startTime}</span>
                <br />แต่ยังไม่ได้ตอกบัตรเข้างาน
              </p>
            </div>
          </div>
          <div className="px-3 py-1.5 bg-white text-amber-600 text-[10px] font-bold rounded-lg shadow-sm">Check In</div>
        </div>
      )}

      {/* WORK STATUS */}
      <div className="mb-8">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">WORK STATUS</h3>
        <div onClick={() => navigate('/connect/time')} className="bg-gradient-to-br from-[#2563EB] to-[#4F46E5] rounded-[28px] p-6 shadow-xl shadow-blue-500/20 relative overflow-hidden cursor-pointer active:scale-[0.98] transition group">
          <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:opacity-20 transition duration-500 transform rotate-[-15deg]">
            <Fingerprint size={200} weight="fill" className="text-white" />
          </div>
          <div className="flex items-center gap-2 mb-6">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-slate-400' : (todayRecord.in && !todayRecord.out ? 'bg-[#34D399] animate-pulse' : 'bg-slate-300')}`}></div>
            <span className="text-white font-bold text-sm">
              {loading ? 'Loading...' : (todayRecord.in && !todayRecord.out ? 'Working Now' : 'Today')}
            </span>
          </div>
          <div className="flex items-start relative z-10">
            <div className="pr-6 border-r border-white/20">
              <p className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">CLOCK IN</p>
              <h2 className="text-4xl font-bold text-white tracking-tighter mb-1">
                {formatTime(todayRecord.in)}
              </h2>
              <p className="text-white/80 text-xs font-medium">
                {todayRecord.in ? 'Recorded' : 'Waiting...'}
              </p>
            </div>
            <div className="pl-6">
              <p className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">CLOCK OUT</p>
              <h2 className={`text-4xl font-bold tracking-tighter mb-1 ${todayRecord.out ? 'text-white' : 'text-white/50'}`}>
                {formatTime(todayRecord.out)}
              </h2>
              <p className="text-blue-200/80 text-xs font-medium">
                {todayRecord.out ? 'Completed' : 'Pending'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ 2. MENU GRID (ปรับใหม่ให้เหมือน Admin Dashboard 100%) */}
      <div>
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Menu</h3>
        <div className="grid grid-cols-2 gap-4">

          {/* 1. Leave Request */}
          <MenuCard
            title="Leave Request"
            subtitle="Sick, Vacation"
            icon={AirplaneTilt}
            colorClass="bg-orange-50 text-orange-600"
            onClick={() => navigate('/connect/requests')}
          />

          {/* 2. Income Widget (Admin Style) */}
          <div
            onClick={() => navigate('/connect/my-work')}
            className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 relative overflow-hidden group active:scale-95 transition-all duration-200 cursor-pointer flex flex-col justify-between h-[150px] hover:border-slate-300"
          >
            <div className="flex justify-between items-start">
              <div className="text-slate-300 group-hover:text-slate-400 transition-colors">
                <Wallet weight="duotone" size={24} className="sm:w-6 sm:h-6" />
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600">
                Forecast
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#0F172A] mb-1 group-hover:text-emerald-600 transition-colors">
                ฿{(stats.estimatedIncome / 1000).toFixed(1)}k
              </h2>
              <p className="text-[11px] text-emerald-500 font-bold">Est. Income</p>
            </div>
          </div>

          {/* 3. Schedule */}
          <MenuCard
            title="Schedule"
            subtitle="Work calendar"
            icon={CalendarCheck}
            colorClass="bg-blue-50 text-blue-600"
            onClick={() => navigate('/connect/my-work', { state: { defaultTab: 'calendar' } })}
          />

          {/* 4. Time Logs */}
          <MenuCard
            title="Time Logs"
            subtitle="Check in/out"
            icon={ClockCounterClockwise}
            colorClass="bg-indigo-50 text-indigo-600"
            onClick={() => navigate('/connect/time', { state: { defaultTab: 'logs' } })}
          />

        </div>
      </div>

    </div>
  );
}