import React from 'react';
import {
    Clock, PencilSimple, MagicWand, Gift, AirplaneTilt,
    Moon, WarningOctagon
} from '@phosphor-icons/react';

export default function ScheduleDailyView({
    currentDate, changeDay,
    workingStaff, leaveStaff, offStaff,
    openEditModal, setIsManageTodayOpen
}) {
    return (
        <div className="animate-fade-in-up">
            {/* Date Strip */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 px-1 mb-2">
                {Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(currentDate);
                    d.setDate(currentDate.getDate() - 3 + i);
                    const isSelected = d.getDate() === currentDate.getDate();
                    return (
                        <div key={i} onClick={() => changeDay(d.getDate())} className={`min-w-[56px] h-[76px] rounded-2xl flex flex-col justify-center items-center border transition-all cursor-pointer ${isSelected ? 'bg-slate-900 text-white shadow-lg -translate-y-1' : 'bg-white border-transparent shadow-sm text-slate-400'}`}>
                            <span className={`text-[10px] font-medium ${isSelected ? 'opacity-70' : ''}`}>{d.toLocaleDateString('th-TH', { weekday: 'short' })}</span>
                            <span className="text-lg font-bold">{d.getDate()}</span>
                        </div>
                    )
                })}
            </div>

            {/* Manage Button */}
            <div className="flex justify-between items-end mb-4 px-1">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">{currentDate.toLocaleDateString('th-TH', { dateStyle: 'long' })}</h2>
                    <p className="text-[10px] text-slate-400">ทีมงาน: {workingStaff.length} คน • ลา: {leaveStaff.length} • หยุด: {offStaff.length}</p>
                </div>
                {(workingStaff.length > 0 || offStaff.length > 0) && (
                    <button onClick={() => setIsManageTodayOpen(true)} className="text-[10px] font-bold text-slate-700 border border-slate-200 bg-white px-3 py-1.5 rounded-lg hover:bg-slate-50 transition active:scale-95 flex items-center gap-2 shadow-sm">
                        <MagicWand size={16} className="text-purple-500" /> แก้ไขวันนี้
                    </button>
                )}
            </div>

            {/* ZERO STAFF ALERT */}
            {workingStaff.length === 0 && (
                <div className="mb-6 bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3 animate-pulse">
                    <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-500 shrink-0">
                        <WarningOctagon weight="fill" size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-rose-700">ไม่มีพนักงานเข้ากะวันนี้!</h3>
                        <p className="text-xs text-rose-600 mt-1">
                            โปรดตรวจสอบตารางงาน อาจไม่มีใครมาทำงานเลย หรือทุกคนลางาน/หยุดพร้อมกัน
                        </p>
                        <button onClick={() => setIsManageTodayOpen(true)} className="mt-2 text-[10px] font-bold bg-white text-rose-600 px-3 py-1.5 rounded-lg border border-rose-200 shadow-sm hover:bg-rose-50">
                            จัดการกะงานด่วน
                        </button>
                    </div>
                </div>
            )}

            {/* WORKING STAFF */}
            <div className="space-y-3 mb-6">
                {workingStaff.map((staff) => (
                    <div key={staff.id} onClick={() => openEditModal(staff)} className="modern-card p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition rounded-xl bg-white border border-slate-100 shadow-sm relative overflow-hidden group">
                        {staff.otHours > 0 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400"></div>}
                        <div className="flex items-center gap-3">
                            <img src={staff.avatar || `https://ui-avatars.com/api/?name=${staff.name}`} className="w-10 h-10 rounded-full border border-slate-100" alt={staff.name} />
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-slate-700">{staff.name}</p>
                                    {staff.incentive > 0 && (
                                        <span className="text-[9px] font-bold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-100 flex items-center gap-1">
                                            <Gift weight="fill" /> +{staff.incentive}฿
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-[10px] text-slate-500 flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded"><Clock weight="bold" /> {staff.startTime} - {staff.endTime}</p>
                                    {staff.otHours > 0 && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">OT {staff.otHours}h</span>}
                                </div>
                            </div>
                        </div>
                        <PencilSimple className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                ))}
            </div>

            {/* LEAVE STAFF */}
            {leaveStaff.length > 0 && (
                <>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6 flex items-center gap-2"><AirplaneTilt weight="fill" className="text-orange-400" /> ลางาน ({leaveStaff.length})</h3>
                    <div className="space-y-2">
                        {leaveStaff.map((staff) => (
                            <div key={staff.id} onClick={() => openEditModal(staff)} className="p-3 flex items-center justify-between cursor-pointer bg-orange-50/50 hover:bg-orange-50 transition rounded-xl border border-orange-100">
                                <div className="flex items-center gap-3">
                                    <img src={staff.avatar || `https://ui-avatars.com/api/?name=${staff.name}`} className="w-8 h-8 rounded-full opacity-80" alt={staff.name} />
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">{staff.name}</p>
                                        <p className="text-[10px] text-orange-500">{staff.note || 'ลางาน'}</p>
                                    </div>
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-full shadow-sm">Leave</div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* OFF STAFF */}
            {offStaff.length > 0 && (
                <>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6 flex items-center gap-2"><Moon weight="fill" /> หยุดพักผ่อน ({offStaff.length})</h3>
                    <div className="space-y-2 opacity-80">
                        {offStaff.map((staff) => (
                            <div key={staff.id} onClick={() => openEditModal(staff)} className="p-3 flex items-center justify-between cursor-pointer hover:bg-white hover:shadow-sm transition rounded-xl border border-transparent hover:border-slate-100 group">
                                <div className="flex items-center gap-3 grayscale group-hover:grayscale-0 transition-all">
                                    <img src={staff.avatar || `https://ui-avatars.com/api/?name=${staff.name}`} className="w-8 h-8 rounded-full opacity-60" alt={staff.name} />
                                    <div>
                                        <p className="text-sm font-bold text-slate-500">{staff.name}</p>
                                        <p className="text-[10px] text-slate-400">{staff.type === 'holiday' ? 'ร้านปิด' : 'วันหยุด'}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
