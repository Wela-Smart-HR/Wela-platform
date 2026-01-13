import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { SquaresFour, CalendarPlus, ChartBar, Wallet, Gear } from '@phosphor-icons/react';

// 1. สร้าง NavItem ไว้ข้างนอกเหมือนกัน เพื่อความลื่นไหลของ Animation
const NavItem = ({ path, icon: Icon, label, isActiveFunc }) => {
  const navigate = useNavigate();
  const active = isActiveFunc(path);

  return (
    <button 
      onClick={() => navigate(path)}
      className={`
        relative flex items-center h-10 rounded-full overflow-hidden group shrink-0
        transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${active ? 'w-32 bg-white shadow-lg shadow-white/10' : 'w-10 hover:bg-white/10'}
      `}
    >
      {/* ไอคอน */}
      <div className={`
         absolute flex items-center justify-center w-10 h-10 transition-all duration-500 left-0
         ${active ? 'text-[#0F172A]' : 'text-[#94A3B8] group-hover:text-white'}
      `}>
         <Icon weight={active ? "fill" : "regular"} size={20} />
      </div>

      {/* ข้อความ */}
      <div className={`
         flex items-center pl-10 pr-4 h-full transition-all duration-500 delay-100
         ${active ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}
      `}>
        <span className="text-sm font-bold text-[#0F172A] whitespace-nowrap tracking-wide">
          {label}
        </span>
      </div>
    </button>
  );
};

export default function AdminLayout() {
  const location = useLocation();

  // ฟังก์ชันเช็ค Active (ปรับให้รองรับหน้าย่อยเหมือนกัน)
  const isActive = (path) => {
    const currentPath = location.pathname;
    // 1. ถ้าเป็นหน้า Overview ('/') ให้รวม '/dashboard' และ '/requests' เป็นพวกเดียวกัน
    if (path === '/') {
        return currentPath === '/' || currentPath === '/dashboard' || currentPath === '/requests';
    }

    // 2. ถ้าเป็นหน้า Settings ให้รวม '/people' (จัดการพนักงาน) เป็นพวกเดียวกัน
    if (path === '/settings') {
        return currentPath.startsWith('/settings') || currentPath.startsWith('/people');
    }
    
    // 3. หน้าอื่นๆ เช็คตามปกติ
    return currentPath.startsWith(path);
  };

  const navItems = [
    { path: '/', icon: SquaresFour, label: 'Overview' },
    { path: '/schedule', icon: CalendarPlus, label: 'Schedule' },
    { path: '/reports', icon: ChartBar, label: 'Reports' },
    { path: '/payroll', icon: Wallet, label: 'Payroll' },
    { path: '/settings', icon: Gear, label: 'Settings' },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#FAFAFA] font-sans text-[#1E293B] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      
      {/* ส่วนเนื้อหา (Outlet) */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <Outlet />
      </div>

      {/* FLOATING PILL NAV */}
      <div className="fixed bottom-6 left-4 right-4 z-50 flex justify-center pointer-events-none">
        <nav className="pointer-events-auto bg-slate-900 rounded-full shadow-2xl shadow-slate-900/30 p-2 flex items-center justify-center gap-1 sm:gap-2 transition-all">
          {navItems.map((item) => (
            <NavItem 
              key={item.path}
              path={item.path}
              icon={item.icon}
              label={item.label}
              isActiveFunc={isActive}
            />
          ))}
        </nav>
      </div>

    </div>
  );
}