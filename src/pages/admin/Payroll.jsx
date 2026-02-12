import React, { useState, useEffect, useMemo } from 'react';
import {
    CalendarBlank, CaretDown, Wallet, CheckCircle, Clock,
    PlusCircle, MinusCircle, Plus, Trash, X, FloppyDisk,
    ListBullets, Receipt, RocketLaunch, ArrowsClockwise,
    ChartBar, ChartPie, CaretLeft, CaretRight, FileText,
    Lock, LockKey, Bank, Buildings, FilePdf, Question
} from '@phosphor-icons/react';
import { generateMockData } from '../../utils/seedData';
import { useAuth } from '../../contexts/AuthContext';
// ✅ Import Hooks จาก Features Architecture
import { usePayrollAdmin } from '../../features/payroll/usePayrollAdmin';
import { usePayrollOverview } from '../../features/payroll/usePayrollOverview';
import { useDialog } from '../../contexts/DialogContext'; // ✅ 1. Import Dialog

// --- COMPONENTS ---
const ProgressBar = ({ label, value, total, color }) => {
    const percent = total > 0 ? (value / total) * 100 : 0;
    return (
        <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-slate-600">{label}</span>
                <span className="font-bold text-slate-800">{value.toLocaleString()} ({percent.toFixed(1)}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${percent}%` }}></div>
            </div>
        </div>
    );
};

const InputRow = ({ label, value, onChange }) => (
    <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-slate-600">{label}</label>
        <input
            type="number"
            className="w-24 text-right text-sm border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-blue-500 font-bold text-slate-700"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            onFocus={(e) => e.target.select()}
        />
    </div>
);

export default function Payroll() {
    const { currentUser } = useAuth();
    const dialog = useDialog(); // ✅ 2. เรียกใช้ Dialog

    const [activeTab, setActiveTab] = useState('overview');
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const { payrollData, summary, loading: loadingCurrent, hasSavedData, isMonthPaid, startCalculation, savePayslip, confirmMonthPayment } = usePayrollAdmin(currentUser?.companyId, selectedMonth);
    const { yearlyStats, loading: loadingYear } = usePayrollOverview(currentUser?.companyId, selectedYear);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingEmp, setEditingEmp] = useState(null);
    const [modalTab, setModalTab] = useState('summary');
    const [showTaxInfo, setShowTaxInfo] = useState(false);

    const [editForm, setEditForm] = useState({
        baseSalary: 0, otPay: 0, incentive: 0,
        deductionProfile: 'none', socialSecurity: 0, tax: 0, lateDeduction: 0,
        customIncomes: [], customDeductions: []
    });

    const fmt = (n) => (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

    const changeMonth = (offset) => {
        const newDate = new Date(selectedMonth);
        newDate.setMonth(newDate.getMonth() + offset);
        setSelectedMonth(newDate);
    };

    const handleEditClick = (emp) => {
        setEditingEmp(emp);
        setModalTab('summary');
        setEditForm({
            baseSalary: emp.baseSalary || 0,
            otPay: emp.otPay || 0,
            incentive: emp.incentive || 0,
            deductionProfile: emp.deductionProfile || 'none',
            socialSecurity: emp.socialSecurity || 0,
            tax: emp.tax || 0,
            lateDeduction: emp.lateDeduction || 0,
            customIncomes: emp.customIncomes || [],
            customDeductions: emp.customDeductions || []
        });
        setIsEditModalOpen(true);
    };

    useEffect(() => {
        if (!isEditModalOpen) return;
        const base = Number(editForm.baseSalary);
        let sso = 0, tax = 0;
        if (editForm.deductionProfile.includes('sso')) sso = Math.min(base, 15000) * 0.05;
        if (editForm.deductionProfile.includes('tax')) tax = base * 0.03;
        if (editForm.deductionProfile !== 'custom') {
            setEditForm(prev => ({ ...prev, socialSecurity: sso, tax: tax }));
        }
    }, [editForm.deductionProfile, editForm.baseSalary, isEditModalOpen]);

    const addCustomItem = (type) => {
        const newItem = { label: 'รายการใหม่', amount: 0 };
        if (type === 'income') setEditForm(prev => ({ ...prev, customIncomes: [...prev.customIncomes, newItem] }));
        else setEditForm(prev => ({ ...prev, customDeductions: [...prev.customDeductions, newItem] }));
    };

    const updateCustomItem = (type, index, key, value) => {
        const field = type === 'income' ? 'customIncomes' : 'customDeductions';
        const list = [...editForm[field]];
        list[index][key] = value;
        setEditForm(prev => ({ ...prev, [field]: list }));
    };

    const removeCustomItem = (type, index) => {
        const field = type === 'income' ? 'customIncomes' : 'customDeductions';
        const list = [...editForm[field]];
        list.splice(index, 1);
        setEditForm(prev => ({ ...prev, [field]: list }));
    };

    const calculateTotals = () => {
        const customInc = editForm.customIncomes.reduce((s, i) => s + Number(i.amount), 0);
        const customDed = editForm.customDeductions.reduce((s, i) => s + Number(i.amount), 0);
        const totalIncome = editForm.baseSalary + editForm.otPay + editForm.incentive + customInc;
        const totalDeduction = editForm.socialSecurity + editForm.tax + editForm.lateDeduction + customDed;
        return { totalIncome, totalDeduction, net: totalIncome - totalDeduction };
    };

    const handleSave = async () => {
        if (!editingEmp) return;
        if (isMonthPaid) {
            // ✅ 3. เปลี่ยน Alert แจ้งเตือนปิดงวด
            dialog.showAlert("งวดนี้ปิดบัญชีแล้ว ไม่สามารถแก้ไขได้ 🔒", "แก้ไขไม่ได้", "warning");
            return;
        }
        const { net } = calculateTotals();
        try {
            await savePayslip({
                userId: editingEmp.userId || editingEmp.id,
                name: editingEmp.name || 'พนักงาน',
                role: editingEmp.role || 'พนักงานทั่วไป',
                avatar: editingEmp.avatar || null,
                ...editForm,
                netTotal: net
            });
            // ✅ 4. เปลี่ยน Alert บันทึกสำเร็จ
            await dialog.showAlert("ข้อมูลเงินเดือนถูกบันทึกเรียบร้อย ✅", "บันทึกสำเร็จ", "success");
            setIsEditModalOpen(false);
        } catch (e) {
            // ✅ 5. เปลี่ยน Alert Error
            dialog.showAlert("เกิดข้อผิดพลาด: " + e.message, "Error", "error");
        }
    };

    const totals = calculateTotals();

    const forecastData = useMemo(() => {
        if (!payrollData.length) return null;
        return payrollData.reduce((acc, curr) => ({
            salary: acc.salary + (curr.baseSalary || 0),
            ot: acc.ot + (curr.otPay || 0),
            incentive: acc.incentive + (curr.incentive || 0),
            deduction: acc.deduction + (curr.lateDeduction || 0) + (curr.socialSecurity || 0) + (curr.tax || 0)
        }), { salary: 0, ot: 0, incentive: 0, deduction: 0 });
    }, [payrollData]);

    const hasTrendData = yearlyStats.monthlyTrend.some(v => v > 0);
    const displayTrend = hasTrendData
        ? yearlyStats.monthlyTrend
        : [15000, 15000, 18000, 20000, 18000, 22000, 25000, 24000, 26000, 28000, 27000, 30000];

    const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const maxVal = Math.max(...displayTrend, 1);

    return (
        <div className="flex flex-col min-h-full bg-[#FAFAFA] text-[#1E293B] font-sans">

            {/* HEADER */}
            <header className="px-6 pt-6 pb-2 sticky top-0 bg-[#FAFAFA]/90 z-20">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-slate-800">ระบบเงินเดือน</h1>

                    {activeTab === 'current' ? (
                        <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-full border border-slate-200 shadow-sm">
                            <button onClick={() => changeMonth(-1)} className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400"><CaretLeft weight="bold" /></button>
                            <div className="flex items-center gap-2 px-2">
                                <CalendarBlank weight="fill" className="text-slate-400" />
                                <span className="text-sm font-bold text-slate-700 min-w-[100px] text-center">{selectedMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</span>
                            </div>
                            <button onClick={() => changeMonth(1)} className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400"><CaretRight weight="bold" /></button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                            <span className="text-xs text-slate-400 font-bold">ปีภาษี:</span>
                            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="font-bold text-slate-700 bg-transparent outline-none cursor-pointer">
                                {Array.from({ length: (new Date().getFullYear() + 1) - 2025 + 1 }, (_, i) => 2025 + i).map(year => (
                                    <option key={year} value={year}>{year + 543}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex gap-1 bg-slate-200 p-1 rounded-xl mb-2">
                    <button onClick={() => setActiveTab('overview')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'overview' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                        <ChartPie weight="fill" /> ภาพรวมภาษี & ประวัติ (รายปี)
                    </button>
                    <button onClick={() => setActiveTab('current')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'current' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                        <Wallet weight="fill" /> จัดการเงินเดือน (งวดนี้)
                    </button>
                </div>
            </header>

            <main className="flex-1 px-6 pb-6 pt-2">

                {/* ================= TAB 1: OVERVIEW ================= */}
                {activeTab === 'overview' && (
                    <div className="animate-fade-in space-y-6">

                        {/* 1. Tax & Cost Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                                <p className="text-slate-400 text-xs font-bold uppercase mb-1">ยอดจ่ายจริงสะสม (ม.ค. - ธ.ค.)</p>
                                <h2 className="text-3xl font-bold">฿ {fmt(yearlyStats.totalSalary)}</h2>
                                <div className="absolute right-0 top-0 p-4 opacity-10"><Wallet size={80} weight="fill" /></div>
                            </div>
                            <div className="bg-emerald-500 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                                <p className="emerald-100 text-xs font-bold uppercase mb-1">นำส่งประกันสังคม (SSO)</p>
                                <h2 className="text-3xl font-bold">฿ {fmt(yearlyStats.totalSSO)}</h2>
                                <div className="absolute right-0 top-0 p-4 opacity-10"><Bank size={80} weight="fill" /></div>
                            </div>
                            <div className="bg-blue-500 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                                <p className="text-blue-100 text-xs font-bold uppercase mb-1">ภาษีหัก ณ ที่จ่าย (ภ.ง.ด. 1)</p>
                                <h2 className="text-3xl font-bold">฿ {fmt(yearlyStats.totalTax)}</h2>
                                <div className="absolute right-0 bottom-0 p-4 opacity-10"><Buildings size={80} weight="fill" /></div>
                            </div>
                        </div>

                        {/* 2. Yearly Trend Chart */}
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 relative">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><ChartBar className="text-purple-500" /> แนวโน้มรายจ่าย (Monthly Trend)</h3>
                                {!hasTrendData && <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">ตัวอย่างข้อมูล (Mockup)</span>}
                            </div>

                            <div className="h-40 flex items-end gap-2 relative mt-4">
                                {displayTrend.map((val, i) => {
                                    const height = maxVal > 0 ? (val / maxVal) * 80 : 0;
                                    return (
                                        <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1 group relative cursor-pointer">
                                            <div className="absolute bottom-full mb-1 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white px-1 rounded whitespace-nowrap z-10">฿{val > 1000 ? (val / 1000).toFixed(1) + 'k' : val}</div>
                                            <div style={{ height: `${height}%` }} className={`w-full rounded-t-md transition-all min-h-[4px] ${hasTrendData ? 'bg-blue-500 group-hover:bg-blue-600' : 'bg-slate-200 opacity-50'}`}></div>
                                            <span className="text-[9px] text-slate-400 h-4 flex items-center">{TH_MONTHS[i]}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. ตารางสรุป ภ.ง.ด. 1 ก */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
                                <div>
                                    <h3 className="font-bold text-slate-800">สรุปรายได้สะสม (ภ.ง.ด. 1 ก)</h3>
                                    <p className="text-xs text-slate-500">ข้อมูลสำหรับออกใบ 50 ทวิ ให้พนักงาน</p>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button onClick={() => setShowTaxInfo(true)} className="text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold text-blue-600 flex items-center gap-1 transition">
                                        <Question weight="bold" /> คืออะไร?
                                    </button>
                                    <button className="text-xs bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-lg font-bold text-slate-600 flex items-center gap-1 transition">
                                        <FilePdf weight="bold" /> Export PDF
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-left text-xs min-w-[800px]">
                                    <thead className="bg-white text-slate-500 border-b border-slate-100">
                                        <tr><th className="p-4">พนักงาน</th><th className="p-4 text-right">รายได้รวม</th><th className="p-4 text-right">ภาษีสะสม</th><th className="p-4 text-right">ประกันสังคม</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {yearlyStats.employeeSummary.length > 0 ? yearlyStats.employeeSummary.map((emp, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition">
                                                <td className="p-4 font-bold text-slate-700">{emp.name} <span className="block text-[10px] text-slate-400 font-normal">{emp.role}</span></td>
                                                <td className="p-4 text-right font-bold text-slate-800">฿ {fmt(emp.totalIncome)}</td>
                                                <td className="p-4 text-right text-red-500">฿ {fmt(emp.totalTax)}</td>
                                                <td className="p-4 text-right text-emerald-600">฿ {fmt(emp.totalSSO)}</td>
                                            </tr>
                                        )) : <tr><td colSpan="4" className="p-8 text-center text-slate-400">ยังไม่มีข้อมูลในปีนี้</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= TAB 2: CURRENT ================= */}
                {activeTab === 'current' && (
                    <div className="animate-fade-in space-y-4 h-full flex flex-col">

                        {!loadingCurrent && payrollData.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                                <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center mb-6 text-blue-500 animate-bounce-slow">
                                    <RocketLaunch size={40} weight="fill" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800 mb-2">เริ่มทำเงินเดือนงวดนี้</h2>
                                <p className="text-slate-400 text-sm mb-8 max-w-xs">ระบบจะดึงข้อมูลการเข้างาน และการตั้งค่าล่าสุดมาคำนวณให้</p>
                                <button onClick={startCalculation} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-slate-200 hover:scale-105 transition active:scale-95 flex items-center gap-3">
                                    <RocketLaunch weight="bold" /> คำนวณเงินเดือน
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className={`text-white rounded-3xl shadow-xl p-6 relative transition-colors ${isMonthPaid ? 'bg-slate-700' : 'bg-slate-900'}`}>
                                    <div className="relative z-10 flex flex-col gap-4">
                                        <div>
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">ยอดจ่ายสุทธิ (Net Total)</p>
                                            <h2 className="text-4xl sm:text-5xl font-bold tracking-tighter mb-2">฿ {fmt(summary.totalPay)}</h2>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-xs text-slate-400">• {summary.totalStaff} พนักงาน</p>
                                                {isMonthPaid ? <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border border-emerald-500/30"><LockKey weight="fill" /> จ่ายแล้ว (Closed)</span> : hasSavedData ? <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded text-[10px] font-bold border border-yellow-500/30">บันทึกแล้ว (รอปิดงวด)</span> : null}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            {!isMonthPaid && (
                                                <button onClick={startCalculation} className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition active:scale-95"><ArrowsClockwise weight="bold" /> คำนวณใหม่</button>
                                            )}
                                            {payrollData.length > 0 && !isMonthPaid && (
                                                <button onClick={confirmMonthPayment} className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-900/20"><CheckCircle weight="fill" size={16} /> ปิดงวดบัญชี</button>
                                            )}
                                        </div>
                                    </div>
                                    <Wallet size={120} weight="fill" className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none" />
                                </div>

                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><ChartPie className="text-purple-500" /> ต้นทุนเดือนนี้</h3>
                                    <ProgressBar label="เงินเดือน (Salary)" value={forecastData?.salary || 0} total={summary.totalPay} color="bg-blue-500" />
                                    <ProgressBar label="ค่าล่วงเวลา (OT)" value={forecastData?.ot || 0} total={summary.totalPay} color="bg-emerald-500" />
                                    <ProgressBar label="เบี้ยขยัน / พิเศษ (Incentive)" value={forecastData?.incentive || 0} total={summary.totalPay} color="bg-yellow-500" />
                                </div>

                                <div className="space-y-3 pb-20">
                                    {loadingCurrent ? <div className="text-center py-10 text-slate-400 text-xs">กำลังประมวลผลข้อมูล...</div> :
                                        payrollData.map((emp) => (
                                            <div key={emp.id} onClick={() => handleEditClick(emp)} className={`p-4 rounded-2xl border shadow-sm flex justify-between items-center cursor-pointer transition active:scale-[0.99] ${emp.status === 'paid' ? 'bg-slate-50 border-slate-200 opacity-75' : emp.status === 'saved' ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
                                                <div className="flex items-center gap-3">
                                                    <img src={emp.avatar || `https://ui-avatars.com/api/?name=${emp.name}`} className="w-10 h-10 rounded-full border border-slate-100" alt="" />
                                                    <div><p className="font-bold text-slate-800 text-sm">{emp.name}</p><p className="text-[10px] text-slate-400">{emp.role}</p></div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-slate-900">฿ {fmt(emp.netTotal)}</p>
                                                    {emp.status === 'paid' ?
                                                        <span className="text-[9px] font-bold text-slate-500 flex items-center justify-end gap-1"><Lock weight="fill" /> จ่ายแล้ว</span> :
                                                        emp.status === 'saved' ?
                                                            <span className="text-[9px] font-bold text-emerald-600 flex items-center justify-end gap-1"><CheckCircle weight="fill" /> บันทึกแล้ว</span> :
                                                            <span className="text-[9px] font-bold text-orange-400 flex items-center justify-end gap-1"><Clock weight="fill" /> รอตรวจสอบ</span>
                                                    }
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* FULL MODAL EDIT */}
                {isEditModalOpen && editingEmp && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:px-4 animate-fade-in">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}></div>
                        <div className="bg-white w-full max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl relative z-10 flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh] animate-slide-up">
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                                <div className="flex justify-between items-center mb-4">
                                    <div><h3 className="text-lg font-bold text-slate-800">ตรวจสอบเงินเดือน</h3><p className="text-xs text-slate-500">{editingEmp.name}</p></div>
                                    <button onClick={() => setIsEditModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"><X weight="bold" /></button>
                                </div>
                                <div className="flex bg-slate-200 p-1 rounded-lg">
                                    <button onClick={() => setModalTab('summary')} className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition-all ${modalTab === 'summary' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}><Receipt size={14} weight="bold" /> สรุปยอด</button>
                                    <button onClick={() => setModalTab('daily')} className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1 transition-all ${modalTab === 'daily' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}><ListBullets size={14} weight="bold" /> รายละเอียดรายวัน</button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                                {modalTab === 'summary' ? (
                                    <>
                                        <div>
                                            <div className="flex justify-between items-center mb-2"><h4 className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-1"><PlusCircle weight="fill" /> รายได้</h4><button onClick={() => addCustomItem('income')} className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1"><Plus weight="bold" /> เพิ่ม</button></div>
                                            <div className="space-y-2">
                                                <InputRow label="เงินเดือน" value={editForm.baseSalary} onChange={v => setEditForm({ ...editForm, baseSalary: v })} />
                                                <InputRow label={`OT (${(editingEmp.otHours || 0).toFixed(1)} ชม.)`} value={editForm.otPay} onChange={v => setEditForm({ ...editForm, otPay: v })} />
                                                <InputRow label="Incentive" value={editForm.incentive} onChange={v => setEditForm({ ...editForm, incentive: v })} />
                                                {editForm.customIncomes.map((item, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center">
                                                        <input type="text" value={item.label} onChange={e => updateCustomItem('income', idx, 'label', e.target.value)} className="flex-1 text-xs border rounded px-2 py-1.5 bg-slate-50 outline-none focus:border-blue-500" placeholder="ชื่อรายการ" />
                                                        <input type="number" value={item.amount} onChange={e => updateCustomItem('income', idx, 'amount', e.target.value)} className="w-24 text-right text-sm border rounded px-2 py-1.5 font-bold outline-none focus:border-blue-500" />
                                                        <button onClick={() => removeCustomItem('income', idx)} className="text-slate-300 hover:text-red-500"><Trash weight="bold" /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-2"><h4 className="text-xs font-bold text-red-500 uppercase flex items-center gap-1"><MinusCircle weight="fill" /> รายการหัก</h4><button onClick={() => addCustomItem('deduction')} className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-1 rounded-full flex items-center gap-1"><Plus weight="bold" /> เพิ่ม</button></div>
                                            <div className="mb-3">
                                                <select value={editForm.deductionProfile} onChange={e => setEditForm({ ...editForm, deductionProfile: e.target.value })} className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white text-slate-600">
                                                    <option value="none">-- ไม่หักภาษี/ประกันสังคม --</option>
                                                    <option value="sso">หักประกันสังคม (5%)</option>
                                                    <option value="tax">หัก ณ ที่จ่าย (3%)</option>
                                                    <option value="custom">กำหนดเอง (Custom)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                {editForm.deductionProfile !== 'none' && (
                                                    <>
                                                        {['sso', 'custom'].includes(editForm.deductionProfile) && <InputRow label="ประกันสังคม (SSO)" value={editForm.socialSecurity} onChange={v => setEditForm({ ...editForm, socialSecurity: v, deductionProfile: 'custom' })} />}
                                                        {['tax', 'custom'].includes(editForm.deductionProfile) && <InputRow label="หัก ณ ที่จ่าย (Tax)" value={editForm.tax} onChange={v => setEditForm({ ...editForm, tax: v, deductionProfile: 'custom' })} />}
                                                    </>
                                                )}
                                                <div className="flex justify-between items-center bg-red-50/50 p-2 rounded-lg border border-red-50">
                                                    <div><p className="text-xs font-bold text-slate-600">มาสาย / ขาดงาน</p><p className="text-[10px] text-red-400">สาย {editingEmp.lateCount || 0} ครั้ง ({editingEmp.lateMinutes || 0} นาที)</p></div>
                                                    <input type="number" value={editForm.lateDeduction} onChange={e => setEditForm({ ...editForm, lateDeduction: Number(e.target.value) })} className="w-24 text-right text-sm border border-red-200 rounded px-2 py-1 font-bold text-red-600 bg-white outline-none focus:border-red-500" />
                                                </div>
                                                {editForm.customDeductions.map((item, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center">
                                                        <input type="text" value={item.label} onChange={e => updateCustomItem('deduction', idx, 'label', e.target.value)} className="flex-1 text-xs border rounded px-2 py-1.5 bg-slate-50 outline-none focus:border-blue-500" placeholder="ระบุชื่อรายการ" />
                                                        <input type="number" value={item.amount} onChange={e => updateCustomItem('deduction', idx, 'amount', e.target.value)} className="w-24 text-right text-sm border rounded px-2 py-1.5 font-bold text-red-600 outline-none focus:border-blue-500" />
                                                        <button onClick={() => removeCustomItem('deduction', idx)} className="text-slate-300 hover:text-red-500"><Trash weight="bold" /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                                        <table className="w-full text-left text-[10px] sm:text-xs">
                                            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold"><tr><th className="p-3">วันที่</th><th className="p-3">เวลา</th><th className="p-3 text-right">รายได้</th><th className="p-3 text-right">หัก</th><th className="p-3">Note</th></tr></thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {editingEmp.dailyDetails?.length > 0 ? editingEmp.dailyDetails.map((day, i) => (
                                                    <tr key={i} className={`hover:bg-slate-50/50 ${day.status === 'absent' ? 'bg-red-50/50' : ''}`}>
                                                        <td className="p-3 font-bold text-slate-700">{new Date(day.date).getDate()} <span className="text-[9px] font-normal text-slate-400 block">{new Date(day.date).toLocaleDateString('th-TH', { weekday: 'short' })}</span></td>
                                                        <td className="p-3">{day.status === 'absent' ? <span className="text-red-500 text-[9px] font-bold border border-red-200 px-2 py-0.5 rounded-full bg-white">ขาดงาน</span> : <><div className="font-medium text-slate-600">{day.checkIn} - {day.checkOut}</div><div className="text-[9px] text-slate-400">กะ {day.shift}</div></>}</td>
                                                        <td className="p-3 text-right">{day.income > 0 ? <span className="text-emerald-600 font-bold">+{day.income}</span> : '-'}</td>
                                                        <td className="p-3 text-right">{day.deduction > 0 ? <span className="text-red-500 font-bold">-{day.deduction}</span> : '-'}</td>
                                                        <td className="p-3">{day.note && <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[9px]">{day.note}</span>}</td>
                                                    </tr>
                                                )) : <tr><td colSpan="5" className="text-center py-6 text-slate-400">ไม่มีข้อมูลการเข้างาน</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {modalTab === 'summary' && (
                                <div className="p-5 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
                                    <div className="flex justify-between items-end mb-1 text-xs text-slate-500"><span>รวมรายได้</span><span className="font-bold text-emerald-600">{fmt(totals.totalIncome)}</span></div>
                                    <div className="flex justify-between items-end mb-3 text-xs text-slate-500 border-b border-slate-200 pb-2"><span>รวมหัก</span><span className="font-bold text-red-500">-{fmt(totals.totalDeduction)}</span></div>
                                    <div className="flex justify-between items-center mb-4"><span className="text-sm font-bold text-slate-800">ยอดสุทธิ (Net Total)</span><span className="text-2xl font-bold text-slate-900">฿ {fmt(totals.net)}</span></div>

                                    {!isMonthPaid ? (
                                        <button onClick={handleSave} className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-sm shadow-lg hover:bg-slate-800 transition active:scale-95 flex items-center justify-center gap-2"><FloppyDisk weight="bold" /> บันทึกข้อมูล</button>
                                    ) : (
                                        <button disabled className="w-full py-3 rounded-xl bg-slate-200 text-slate-400 font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed"><Lock weight="fill" /> งวดนี้ปิดบัญชีแล้ว</button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* INFO MODAL */}
                {showTaxInfo && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-fade-in">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowTaxInfo(false)}></div>
                        <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="bg-slate-900 text-white p-5 flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold flex items-center gap-2"><Question weight="fill" className="text-yellow-400" /> สรุปเรื่องภาษีฉบับย่อ</h3>
                                    <p className="text-slate-400 text-xs mt-1">เข้าใจง่ายใน 1 นาที สำหรับเจ้าของกิจการ</p>
                                </div>
                                <button onClick={() => setShowTaxInfo(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"><X weight="bold" /></button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-600">
                                {/* Content เดิม */}
                                {/* 1. ภ.ง.ด. 1 */}
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0"><FileText weight="fill" size={20} /></div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">1. ภ.ง.ด. 1 (รายเดือน)</h4>
                                        <p className="mt-1">คือการนำส่งภาษีที่หักจากเงินเดือนพนักงาน</p>
                                        <ul className="list-disc pl-4 mt-1 space-y-1 text-xs">
                                            <li><b className="text-slate-800">ใครโดน:</b> พนักงานที่มีรายได้ถึงเกณฑ์ (ประมาณ 26,000+ บาท/เดือน)</li>
                                            <li><b className="text-slate-800">หน้าที่คุณ:</b> หักเงินเขาไว้ แล้วนำส่งสรรพากรภายในวันที่ 7 ของเดือนถัดไป</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* 2. ประกันสังคม */}
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0"><Bank weight="fill" size={20} /></div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">2. ประกันสังคม (รายเดือน)</h4>
                                        <p className="mt-1">เงินสมทบกองทุนเพื่อสวัสดิการลูกจ้าง</p>
                                        <ul className="list-disc pl-4 mt-1 space-y-1 text-xs">
                                            <li><b className="text-slate-800">สูตร:</b> หักลูกน้อง 5% + นายจ้างจ่ายสมทบ 5% (ฐานเงินเดือนสูงสุดไม่เกิน 15,000)</li>
                                            <li><b className="text-slate-800">ส่งเมื่อไหร่:</b> ภายในวันที่ 15 ของเดือนถัดไป</li>
                                        </ul>
                                    </div>
                                </div>

                                <hr className="border-slate-100" />

                                {/* 3. ภ.ง.ด. 1 ก (ไฮไลท์) */}
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0"><Buildings weight="fill" size={20} /></div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 flex items-center gap-2">3. ภ.ง.ด. 1 ก (รายปี) <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full">สำคัญ!</span></h4>
                                        <p className="mt-1">คือใบสรุปยอดจ่ายเงินเดือน <b>"ทั้งปี"</b> เพื่อแจ้งสรรพากรว่าปีที่ผ่านมาจ้างใครบ้าง</p>
                                        <div className="bg-slate-50 p-3 rounded-lg mt-2 border border-slate-100">
                                            <p className="font-bold text-slate-800 mb-1">💡 สิ่งที่คุณต้องทำตอนสิ้นปี:</p>
                                            <p className="text-xs">เปิดหน้านี้ ดูตาราง <b>"สรุปรายได้สะสม"</b> แล้วนำตัวเลขไปกรอกในใบ <b>50 ทวิ</b> แจกให้พนักงานทุกคน (เพื่อให้เขาไปยื่นภาษีส่วนตัว)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                                <button onClick={() => setShowTaxInfo(false)} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold text-xs shadow-lg hover:bg-slate-800 transition">เข้าใจแล้ว</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}