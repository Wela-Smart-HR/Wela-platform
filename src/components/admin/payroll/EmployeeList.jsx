import React, { useState } from 'react';
import {
    CaretLeft, CaretDown, Trash, ChartPieSlice, Check, Circle
} from '@phosphor-icons/react';
import { EmployeeListSkeleton } from './PayrollSkeleton';
import { EmptyState } from './EmptyState';

export const EmployeeList = ({
    activeCycle,
    employees,
    totals,
    onBack,
    onSelectEmployee,
    onDeleteCycle,
    isLoading
}) => {
    if (isLoading) return <EmployeeListSkeleton />;

    const [filterStatus, setFilterStatus] = useState('all');
    const [groupBy, setGroupBy] = useState('none');

    const fmt = (n) => (n || 0).toLocaleString();

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
        if (status === 'paid') return 'bg-green-500';
        if (status === 'partial') return 'bg-orange-500';
        return 'bg-transparent';
    };

    return (
        <div className="animate-fade-in pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 px-5 pt-4 pb-4 bg-[#F2F2F7]/95 backdrop-blur-xl border-b border-black/5">
                <div className="max-w-2xl mx-auto w-full">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-blue-600 hover:bg-gray-50 transition-colors">
                            <CaretLeft size={20} weight="bold" />
                        </button>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">PAYROLL PERIOD</span>
                            <div className="flex items-center gap-1">
                                <span className="text-base font-bold text-black">{activeCycle?.title}</span>
                                <CaretDown size={12} weight="fill" className="text-gray-400" />
                            </div>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteCycle?.(); }}
                            className="w-10 h-10 rounded-full bg-white shadow-sm border border-red-200 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="ลบรอบบัญชีนี้"
                        >
                            <Trash size={18} weight="bold" />
                        </button>
                    </div>

                    {/* Dashboard Summary */}
                    <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar">
                        <div className="flex-1 min-w-[140px] bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">ยอดรวม (Total)</p>
                            <h2 className="text-2xl font-display font-bold text-black">฿{fmt(totals.totalNet)}</h2>
                        </div>
                        <div className="flex-1 min-w-[140px] bg-black text-white rounded-2xl p-4 shadow-lg shadow-black/20 relative overflow-hidden">
                            <div className="absolute right-0 top-0 p-3 opacity-20">
                                <ChartPieSlice size={40} weight="fill" />
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">ค้างจ่าย (Remaining)</p>
                            <h2 className="text-2xl font-display font-bold text-white">฿{fmt(totals.totalRemaining)}</h2>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-700 h-1 mt-3 rounded-full overflow-hidden">
                                <div
                                    className="bg-blue-500 h-full transition-all duration-500"
                                    style={{ width: `${(totals.totalPaid / totals.totalNet) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="px-5 pt-4 w-full max-w-2xl mx-auto">
                {/* Filters */}
                <div className="bg-gray-200/50 p-1 rounded-xl flex mb-4">
                    {['all', 'remaining', 'paid'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === status ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}
                        >
                            {status === 'all' ? 'ทั้งหมด' : (status === 'remaining' ? 'ค้างจ่าย' : 'ครบแล้ว')}
                        </button>
                    ))}
                </div>

                {/* Group By */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar">
                    <span className="text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap mr-1">จัดกลุ่ม:</span>
                    <button onClick={() => setGroupBy('none')} className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${groupBy === 'none' ? 'bg-black text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>ไม่จัดกลุ่ม</button>
                    <button onClick={() => setGroupBy('type')} className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${groupBy === 'type' ? 'bg-black text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>ประเภท (รายวัน/เดือน)</button>
                    <button onClick={() => setGroupBy('department')} className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${groupBy === 'department' ? 'bg-black text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>แผนก</button>
                </div>

                {/* List */}
                <div className="space-y-6">
                    {filteredEmployees.length === 0 ? (
                        <div className="py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                            <EmptyState
                                title="ไม่พบรายชื่อพนักงาน"
                                message={filterStatus !== 'all' ? "ลองเปลี่ยนตัวกรองสถานะ" : "ยังไม่มีพนักงานในรอบบัญชีนี้"}
                            />
                        </div>
                    ) : (
                        groupedList.map((group, idx) => (
                            <div key={idx}>
                                {group.title && (
                                    <div className="flex justify-between items-end mb-3 px-1">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{group.title}</h3>
                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">รวม: ฿{fmt(group.total)}</span>
                                    </div>
                                )}
                                <div className="space-y-3">
                                    {group.items.map(emp => {
                                        const paid = emp.paidAmount || 0;
                                        const net = emp.financials?.net || 0;
                                        const remaining = net - paid;
                                        const percent = net > 0 ? (paid / net) * 100 : 0;

                                        return (
                                            <div
                                                key={emp.id}
                                                onClick={() => onSelectEmployee(emp)}
                                                className="bg-white p-4 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-transparent hover:border-gray-200 hover:shadow-md transition-all cursor-pointer relative overflow-hidden active:scale-[0.99]"
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={emp.employeeSnapshot?.avatar || `https://ui-avatars.com/api/?name=${emp.employeeSnapshot?.name}&background=random`}
                                                            className="w-10 h-10 rounded-full object-cover bg-gray-100 border border-gray-50"
                                                            alt=""
                                                        />
                                                        <div>
                                                            <h3 className="font-bold text-sm text-gray-900">{emp.employeeSnapshot?.name}</h3>
                                                            <div className="flex gap-2 mt-0.5">
                                                                <span className="text-[10px] text-gray-500 font-medium">{emp.employeeSnapshot?.role}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-400 font-medium mb-0.5">ยอดสุทธิ</p>
                                                        <p className="text-sm font-bold text-gray-900">฿{fmt(net)}</p>
                                                    </div>
                                                </div>

                                                {/* Payment Bar */}
                                                <div className="bg-gray-50 rounded-lg p-2.5 flex items-center justify-between border border-gray-100">
                                                    <div className="flex flex-col gap-1 w-full mr-4">
                                                        <div className="flex justify-between text-[10px] font-bold">
                                                            <span className="text-gray-500">จ่ายแล้ว: ฿{fmt(paid)}</span>
                                                            <span className={remaining > 0 ? 'text-red-500' : 'text-green-500'}>
                                                                {remaining > 0 ? `ค้าง: ฿${fmt(remaining)}` : 'ครบแล้ว'}
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(emp.paymentStatus)}`}
                                                                style={{ width: `${percent}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0">
                                                        {emp.paymentStatus === 'paid' && <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shadow-sm"><Check size={12} weight="bold" /></div>}
                                                        {emp.paymentStatus === 'partial' && <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-500 border border-orange-200 flex items-center justify-center"><ChartPieSlice size={12} weight="bold" /></div>}
                                                        {emp.paymentStatus === 'pending' && <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center"><Circle size={12} weight="bold" /></div>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
};
