import React, { useState } from 'react';
import {
    CaretLeft, CaretDown, Trash, ChartPieSlice, Check, Circle, Funnel, Users, Lock, Bank
} from '@phosphor-icons/react';
import { EmployeeListSkeleton } from './PayrollSkeleton';
import { EmptyState } from './EmptyState';
import Swal from 'sweetalert2';

export const EmployeeList = ({
    activeCycle,
    employees,
    totals,
    onBack,
    onSelectEmployee,
    onDeleteCycle,
    onLockCycle,
    onBatchPayment,
    isLoading
}) => {
    if (isLoading) return <EmployeeListSkeleton />;

    const [filterStatus, setFilterStatus] = useState('all');
    const [groupBy, setGroupBy] = useState('none');

    const fmt = (n) => (n || 0).toLocaleString();

    // ✅ ฟังก์ชันยืนยันการจ่ายทั้งรอบ
    const handleBatchPayment = async () => {
        if (!activeCycle) return;
        
        const remainingEmployees = employees.filter(emp => emp.paymentStatus !== 'paid');
        
        if (remainingEmployees.length === 0) {
            await Swal.fire({
                icon: 'info',
                title: 'ทุกคนจ่ายครบแล้ว',
                text: 'ไม่มีพนักงานที่ต้องจ่ายเงินในรอบนี้',
                confirmButtonColor: '#2563EB'
            });
            return;
        }

        const result = await Swal.fire({
            title: 'ยืนยันการจ่ายเงินทั้งรอบ?',
            html: `
                <div class="text-left space-y-2">
                    <p>ระบบจะบันทึกการจ่ายเงินพนักงานทั้งหมดในรอบนี้:</p>
                    <div class="bg-slate-50 p-3 rounded-lg">
                        <div class="flex justify-between mb-1">
                            <span>จำนวนพนักงาน:</span>
                            <span class="font-bold">${remainingEmployees.length} คน</span>
                        </div>
                        <div class="flex justify-between">
                            <span>ยอดค้างจ่ายทั้งหมด:</span>
                            <span class="font-bold text-red-600">฿${fmt(totals.totalRemaining)}</span>
                        </div>
                    </div>
                    <p class="text-sm text-slate-600">หลังจากยืนยันแล้ว จะไม่สามารถแก้ไขข้อมูลได้</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยันการจ่าย',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#ef4444',
            customClass: {
                popup: 'rounded-2xl',
                confirmButton: 'rounded-xl px-6 py-2.5',
                cancelButton: 'rounded-xl px-6 py-2.5'
            }
        });
        
        if (result.isConfirmed) {
            try {
                await onBatchPayment(activeCycle.id);
                await Swal.fire({
                    icon: 'success',
                    title: 'ยืนยันการจ่ายเรียบร้อย!',
                    text: 'บันทึกการจ่ายเงินพนักงานทั้งรอบเรียบร้อยแล้ว',
                    confirmButtonColor: '#10b981',
                    timer: 2000,
                    showConfirmButton: false,
                    customClass: { popup: 'rounded-2xl' }
                });
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: error.message || 'ไม่สามารถยืนยันการจ่ายเงินได้',
                    confirmButtonColor: '#2563EB'
                });
            }
        }
    };

    // Filtering Logic
    const filteredEmployees = employees.filter(emp => {
        if (filterStatus === 'remaining') return emp.paymentStatus !== 'paid';
        if (filterStatus === 'paid') return emp.paymentStatus === 'paid';
        return true;
    });

    // Grouping Logic
    const getGroupedList = () => {
        if (groupBy === 'none') {
            return [{ title: null, items: filteredEmployees, total: filteredEmployees.reduce((s, e) => s + (e.financials?.net || 0), 0) }];
        }

        const groups = {};
        filteredEmployees.forEach(emp => {
            const key = groupBy === 'type' ? (emp.employeeSnapshot?.type || 'monthly') : (emp.employeeSnapshot?.department || 'Other');
            const label = groupBy === 'type' ? (key === 'monthly' ? 'รายเดือน' : 'รายวัน') : key;

            if (!groups[key]) groups[key] = { title: label, items: [], total: 0 };
            groups[key].items.push(emp);
            groups[key].total += (emp.financials?.net || 0);
        });

        return Object.values(groups);
    };

    const groupedList = getGroupedList();

    const getProgressColor = (status) => {
        if (status === 'paid') return 'bg-emerald-500';
        if (status === 'partial') return 'bg-orange-500';
        return 'bg-transparent';
    };

    return (
        <div className="animate-fade-in pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 px-6 pt-6 pb-2 bg-[#FAFAFA]/90 backdrop-blur-sm">
                <div className="max-w-2xl mx-auto w-full">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <button onClick={onBack} className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors">
                                <CaretLeft size={20} weight="bold" />
                            </button>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PAYROLL PERIOD</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-base font-bold text-slate-800">{activeCycle?.title || `งวด ${activeCycle?.month} (${activeCycle?.period === 'full' ? 'ทั้งเดือน' : activeCycle?.period === 'first' ? 'ครึ่งแรก' : 'ครึ่งหลัง'})`}</span>
                                    <CaretDown size={12} weight="fill" className="text-slate-400" />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {activeCycle?.status !== 'locked' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onLockCycle?.(); }}
                                    className="w-10 h-10 rounded-full bg-white shadow-sm border border-blue-100 flex items-center justify-center text-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                    title="ปิดรอบเงินเดือน"
                                >
                                    <Lock size={18} weight="bold" />
                                </button>
                            )}
                            {totals.totalRemaining > 0 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleBatchPayment(); }}
                                    className="w-10 h-10 rounded-full bg-white shadow-sm border border-green-100 flex items-center justify-center text-green-600 hover:bg-green-50 hover:text-green-700 transition-colors"
                                    title="ยืนยันการจ่ายทั้งรอบ"
                                >
                                    <Bank size={18} weight="bold" />
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteCycle?.(); }}
                                className="w-10 h-10 rounded-full bg-white shadow-sm border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="ลบรอบบัญชีนี้"
                            >
                                <Trash size={18} weight="bold" />
                            </button>
                        </div>
                    </div>

                    {/* Dashboard Summary */}
                    <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                        <div className="flex-1 min-w-[140px] bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">ยอดรวม (Total)</p>
                            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">฿{fmt(totals.totalNet)}</h2>
                        </div>
                        <div className="flex-1 min-w-[140px] bg-slate-900 text-white rounded-2xl p-4 shadow-lg shadow-slate-900/10 relative overflow-hidden">
                            <div className="absolute right-0 top-0 p-3 opacity-20">
                                <ChartPieSlice size={40} weight="fill" />
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">ค้างจ่าย (Remaining)</p>
                            <h2 className="text-2xl font-bold text-white tracking-tight">฿{fmt(totals.totalRemaining)}</h2>

                            {/* Progress Bar */}
                            <div className="w-full bg-slate-800 h-1 mt-3 rounded-full overflow-hidden">
                                <div
                                    className="bg-emerald-500 h-full transition-all duration-500"
                                    style={{ width: `${(totals.totalPaid / totals.totalNet) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="px-6 pt-2 w-full max-w-2xl mx-auto space-y-6">

                {/* Controls: Filter & Group */}
                <div>
                    {/* Filters */}
                    <div className="bg-slate-100 p-1 rounded-xl flex mb-4">
                        {['all', 'remaining', 'paid'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === status ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-600'}`}
                            >
                                {status === 'all' ? 'ทั้งหมด' : (status === 'remaining' ? 'ค้างจ่าย' : 'ครบแล้ว')}
                            </button>
                        ))}
                    </div>

                    {/* Group By */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap mr-1 flex items-center gap-1"><Funnel /> จัดกลุ่ม:</span>
                        <button onClick={() => setGroupBy('none')} className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${groupBy === 'none' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>ไม่จัดกลุ่ม</button>
                        <button onClick={() => setGroupBy('type')} className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${groupBy === 'type' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>ประเภท</button>
                        <button onClick={() => setGroupBy('department')} className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${groupBy === 'department' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>แผนก</button>
                    </div>
                </div>

                {/* List */}
                <div className="space-y-4">
                    {filteredEmployees.length === 0 ? (
                        <div className="py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                            <EmptyState
                                title="ไม่พบรายชื่อพนักงาน"
                                message={filterStatus !== 'all' ? "ลองเปลี่ยนตัวกรองสถานะ" : "ยังไม่มีพนักงานในรอบบัญชีนี้"}
                            />
                        </div>
                    ) : (
                        groupedList.map((group, idx) => (
                            <div key={idx} className="space-y-3">
                                {group.title && (
                                    <div className="flex justify-between items-end px-1 mt-6 first:mt-0">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                            <div className="w-1 h-3 bg-slate-300 rounded-full"></div>
                                            {group.title}
                                        </h3>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">รวม: ฿{fmt(group.total)}</span>
                                    </div>
                                )}
                                {group.items.map(emp => {
                                    const paid = emp.paidAmount || 0;
                                    const net = emp.financials?.net || 0;
                                    const remaining = net - paid;
                                    const percent = net > 0 ? (paid / net) * 100 : 0;

                                    return (
                                        <div
                                            key={emp.id}
                                            onClick={() => onSelectEmployee(emp)}
                                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer relative overflow-hidden active:scale-[0.99] group"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={emp.employeeSnapshot?.avatar || `https://ui-avatars.com/api/?name=${emp.employeeSnapshot?.name}&background=random`}
                                                        className="w-10 h-10 rounded-full object-cover bg-slate-100 border border-slate-50"
                                                        alt=""
                                                    />
                                                    <div>
                                                        <h3 className="font-bold text-sm text-slate-800 group-hover:text-slate-900 transition-colors">{emp.employeeSnapshot?.name}</h3>
                                                        <div className="flex gap-2 mt-0.5">
                                                            <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 bg-slate-50 rounded">{emp.employeeSnapshot?.role}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">ยอดสุทธิ</p>
                                                    <p className="text-sm font-bold text-slate-800">฿{fmt(net)}</p>
                                                </div>
                                            </div>

                                            {/* Payment Bar */}
                                            <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between border border-slate-100">
                                                <div className="flex flex-col gap-1.5 w-full mr-4">
                                                    <div className="flex justify-between text-[10px] font-bold">
                                                        <span className="text-slate-500">จ่ายแล้ว: <span className="text-slate-800">฿{fmt(paid)}</span></span>
                                                        <span className={remaining > 0 ? 'text-red-500' : 'text-emerald-600'}>
                                                            {remaining > 0 ? `ค้าง: ฿${fmt(remaining)}` : 'ครบแล้ว'}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${getProgressColor(emp.paymentStatus)}`}
                                                            style={{ width: `${percent}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                                <div className="shrink-0">
                                                    {emp.paymentStatus === 'paid' && <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm"><Check size={14} weight="bold" /></div>}
                                                    {emp.paymentStatus === 'partial' && <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-500 border border-orange-200 flex items-center justify-center"><ChartPieSlice size={14} weight="bold" /></div>}
                                                    {emp.paymentStatus === 'pending' && <div className="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-300 flex items-center justify-center"><Circle size={14} weight="bold" /></div>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
};
