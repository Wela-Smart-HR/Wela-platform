import React, { useState, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { House, Clock, CalendarCheck, Wallet, User, Fingerprint } from '@phosphor-icons/react';

// 1. NavItem Component (คงเดิม)
const NavItem = ({ path, icon: Icon, label, isActiveFunc }) => {
  const navigate = useNavigate();
  const active = isActiveFunc(path);

  return (
    <button
      onClick={() => navigate(path)}
      className={`
        relative flex items-center h-12 rounded-full overflow-hidden group shrink-0
        transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${active ? 'w-32 bg-white shadow-md' : 'w-12 hover:bg-white/10'}
      `}
    >
      <div className={`
         absolute flex items-center justify-center w-12 h-12 transition-all duration-500 left-0
         ${active ? 'text-blue-600' : 'text-white'}
      `}>
        <Icon weight={active ? "fill" : "bold"} size={24} />
      </div>

      <div className={`
         flex items-center pl-12 pr-4 h-full transition-all duration-500 delay-100
         ${active ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}
      `}>
        <span className="text-sm font-bold text-blue-600 whitespace-nowrap tracking-wide">
          {label}
        </span>
      </div>
    </button>
  );
};

export default function EmployeeLayout() {
  const location = useLocation();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const lastScrollY = useRef(0);

  const handleScroll = (e) => {
    const currentScrollY = e.target.scrollTop;
    if (Math.abs(currentScrollY - lastScrollY.current) < 10) return;
    if (currentScrollY > lastScrollY.current && isNavOpen) setIsNavOpen(false);
    else if (currentScrollY < lastScrollY.current && !isNavOpen) setIsNavOpen(true);
    lastScrollY.current = currentScrollY;
  };

  // 2. Logic เช็คหน้า Active (คงเดิม)
  const isActive = (path) => {
    const currentPath = location.pathname;

    // 🏠 กรณีปุ่ม Home (/connect)
    if (path === '/connect') {
      // ให้ Active ถ้าอยู่หน้า Dashboard หรือ หน้า Request/Leave
      return currentPath === '/connect' ||
        currentPath === '/connect/' ||
        currentPath.includes('/requests') ||
        currentPath.includes('/leave');
    }

    // กรณีปุ่มอื่นๆ
    return currentPath.startsWith(path);
  };

  return (
    // ✅ 1. ฉากหลังสีเทา (สำหรับ Desktop View)
    <div className="min-h-screen bg-slate-100 flex justify-center font-sans pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">

      {/* ✅ 2. กรอบมือถือ (Mobile Container) กำหนดความกว้างสูงสุด 480px */}
      <div className="w-full max-w-[480px] bg-[#FAFAFA] h-screen relative shadow-2xl overflow-hidden flex flex-col border-x border-slate-200">

        {/* 3. พื้นที่เนื้อหา (Scroll ภายในกรอบนี้) */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-28" onScroll={handleScroll}>
          <div key={location.pathname} className="animate-fade-in-up">
            <Outlet />
          </div>
        </div>

        {/* 4. แถบบาร์ลอยตัว */}
        <div className="absolute bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none">

          {/* 1. EXPANDED BAR - Slides from Right with Bounce */}
          <div className={`
             pointer-events-auto bg-blue-600 shadow-2xl shadow-blue-600/30 rounded-full px-2 py-2 flex items-center justify-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ring-4 ring-white/30 backdrop-blur-md origin-right
             ${isNavOpen ? 'scale-100 opacity-100 translate-x-0' : 'scale-90 opacity-0 translate-x-[400px] pointer-events-none'}
          `}>

            <NavItem path="/connect" icon={House} label="Home" isActiveFunc={isActive} />
            <NavItem path="/connect/time" icon={Clock} label="Time" isActiveFunc={isActive} />
            <NavItem path="/connect/my-work" icon={CalendarCheck} label="My Work" isActiveFunc={isActive} />
            <NavItem path="/connect/payslip" icon={Wallet} label="Payslip" isActiveFunc={isActive} />
            <NavItem path="/connect/profile" icon={User} label="Profile" isActiveFunc={isActive} />

          </div>

          {/* 2. COLLAPSED TRIGGER (Fingerprint) - Bottom Right */}
          <div className={`
             absolute right-6 bottom-0 pointer-events-auto transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
             ${!isNavOpen ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 rotate-90 pointer-events-none'}
          `}>
            <button
              onClick={() => setIsNavOpen(true)}
              className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full shadow-2xl shadow-blue-600/40 flex items-center justify-center text-white ring-4 ring-white/20 hover:scale-110 active:scale-95 transition-all duration-200"
            >
              <Fingerprint weight="fill" size={36} />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}