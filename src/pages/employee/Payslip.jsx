import React, { useState } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { usePayslip } from '@/features/payroll/usePayslip';
import { formatMoney } from '@/shared/utils/money';
import {
    CaretLeft, CaretRight, DownloadSimple,
    TrendUp, TrendDown, Wallet, CalendarBlank,
    Eye, EyeSlash, FilePdf, Spinner, Buildings
} from '@phosphor-icons/react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function Payslip() {
    const { currentUser } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isDownloading, setIsDownloading] = useState(false);
    const [showAmount, setShowAmount] = useState(false);

    // Use payslip hook
    const { payslip: payslipData, loading } = usePayslip(currentUser?.uid, currentDate);

    // Helper
    const getMonthKey = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const handlePrevMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    // ✅ ฟังก์ชันสร้าง PDF (ฉบับ A4)
    const handleDownloadPDF = async () => {
        setIsDownloading(true);

        // รอแป๊บให้ React เรนเดอร์ส่วน A4 (แม้จะซ่อนอยู่)
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            // 👇 เปลี่ยนเป้าหมาย! ไปถ่ายรูปที่ ID 'formal-payslip-a4' แทน
            const element = document.getElementById('formal-payslip-a4');

            // ใช้ scale: 3 เพื่อความคมชัดระดับ Print
            const canvas = await html2canvas(element, { scale: 3, useCORS: true });
            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Payslip_${currentUser?.name}_${getMonthKey(currentDate)}.pdf`);

        } catch (error) {
            console.error("PDF Error:", error);
            alert("เกิดข้อผิดพลาดในการสร้าง PDF");
        } finally {
            setIsDownloading(false);
        }
    };

    // เตรียมข้อมูลสำหรับแสดงผล
    const earningsList = payslipData ? [
        { title: 'เงินเดือน / Salary', amount: payslipData.baseSalary },
        { title: 'ค่าล่วงเวลา / Overtime', amount: payslipData.otPay },
        { title: 'เบี้ยขยัน / Incentive', amount: payslipData.incentive },
        ...(payslipData.customIncomes || [])
    ].filter(i => i.amount > 0) : [];

    const deductionsList = payslipData ? [
        { title: 'มาสาย/ขาดงาน / Late/Absent', amount: payslipData.lateDeduction },
        { title: 'ประกันสังคม / Social Security', amount: payslipData.socialSecurity },
        { title: 'ภาษี / Withholding Tax', amount: payslipData.tax },
        ...(payslipData.customDeductions || [])
    ].filter(i => i.amount > 0) : [];

    const totalEarnings = earningsList.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalDeductions = deductionsList.reduce((acc, curr) => acc + Number(curr.amount), 0);

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] font-sans text-[#1E293B]">

            {/* 📱 ส่วนแสดงผลบนหน้าจอ (Mobile UI) - เหมือนเดิมเป๊ะ */}
            <header className="px-6 pt-6 pb-4 bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-100">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Financial</p>
                        <h1 className="text-2xl font-bold text-slate-800">สลิปเงินเดือน</h1>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><FilePdf size={16} weight="fill" /></div>
                </div>
                <div className="flex items-center justify-between bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition"><CaretLeft weight="bold" size={16} /></button>
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-2"><CalendarBlank weight="bold" className="text-blue-500" />{currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition"><CaretRight weight="bold" size={16} /></button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-6 py-6 no-scrollbar space-y-6">
                {loading ? (<div className="text-center py-10 text-slate-400 text-sm animate-pulse">กำลังโหลดข้อมูล...</div>) : !payslipData ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300 opacity-60"><Wallet size={64} weight="duotone" className="mb-4" /><p className="text-sm font-bold">ยังไม่มีสลิปเงินเดือน</p></div>
                ) : (
                    <>
                        {/* Mobile Cards (Net Pay, Charts, List) */}
                        <div className="bg-gradient-to-br from-[#1e293b] to-[#334155] rounded-3xl p-6 text-white shadow-xl shadow-slate-200 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5"><Wallet size={120} weight="fill" /></div>
                            <div className="flex justify-between items-start mb-2 relative z-10">
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">ยอดเงินสุทธิ (Net Pay)</p>
                                <button onClick={() => setShowAmount(!showAmount)} className="text-slate-400 hover:text-white transition">{showAmount ? <Eye size={18} weight="bold" /> : <EyeSlash size={18} weight="bold" />}</button>
                            </div>
                            <div className="mb-4 relative z-10 h-10 flex items-center">{showAmount ? <h2 className="text-4xl font-bold tracking-tight">฿{formatMoney(payslipData.netTotal)}</h2> : <h2 className="text-4xl font-bold tracking-widest text-slate-500 mt-2">••••••</h2>}</div>
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg w-fit border border-white/5"><div className={`w-1.5 h-1.5 rounded-full ${payslipData.status === 'paid' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-orange-400'}`}></div><span className="text-[10px] font-bold tracking-wide text-slate-200">{payslipData.status === 'paid' ? 'โอนจ่ายเรียบร้อย' : 'รอตรวจสอบ'}</span></div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center"><div className="flex items-center gap-1.5 mb-1 text-emerald-600"><TrendUp weight="bold" size={12} /><span className="text-[10px] font-bold uppercase">รับรวม</span></div><p className="text-sm font-bold text-slate-700 pl-1">{showAmount ? formatMoney(totalEarnings) : '••••'}</p></div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center"><div className="flex items-center gap-1.5 mb-1 text-rose-500"><TrendDown weight="bold" size={12} /><span className="text-[10px] font-bold uppercase">หักรวม</span></div><p className="text-sm font-bold text-slate-700 pl-1">{showAmount ? formatMoney(totalDeductions) : '••••'}</p></div>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-5 border-b border-slate-50"><h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">รายการรายได้</h3><div className="space-y-3">{earningsList.map((item, idx) => (<div key={idx} className="flex justify-between items-center"><span className="text-xs font-bold text-slate-600 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>{item.title}</span><span className="text-xs font-bold text-emerald-600">{showAmount ? `+ ${formatMoney(item.amount)}` : '•••'}</span></div>))}</div></div>
                            <div className="p-5 bg-slate-50/50"><h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">รายการหัก</h3><div className="space-y-3">{deductionsList.map((item, idx) => (<div key={idx} className="flex justify-between items-center"><span className="text-xs font-bold text-slate-600 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>{item.title}</span><span className="text-xs font-bold text-rose-500">{showAmount ? `- ${formatMoney(item.amount)}` : '•••'}</span></div>))}</div></div>
                        </div>
                    </>
                )}
            </main>

            {/* Button */}
            {payslipData && (
                <div className="p-6 pt-2 bg-[#FAFAFA]">
                    <button onClick={handleDownloadPDF} disabled={isDownloading} className="w-full bg-white border border-slate-200 text-slate-500 py-3 rounded-xl text-xs font-bold shadow-sm hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50">
                        {isDownloading ? <><Spinner className="animate-spin" size={16} /> กำลังสร้าง PDF...</> : <><DownloadSimple size={16} weight="bold" /> ดาวน์โหลดสลิป (A4)</>}
                    </button>
                </div>
            )}

            {/* 📄 ส่วนลับ: A4 Formal Template (ซ่อนไว้ด้วย position absolute) */}
            {payslipData && (
                <div id="formal-payslip-a4" style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '210mm', minHeight: '297mm', backgroundColor: 'white', padding: '15mm', color: '#1f2937', fontFamily: 'sans-serif' }}>

                    {/* 1. Header */}
                    <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
                        <div className="flex gap-4 items-center">
                            <div className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center text-2xl font-bold rounded-lg">W</div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 uppercase tracking-wider">Wela HR Platform</h1>
                                <p className="text-xs text-slate-500">บริษัท เวฬา แพลตฟอร์ม จำกัด (สำนักงานใหญ่)</p>
                                <p className="text-xs text-slate-500">123 ถนนสาทร แขวงยานนาวา เขตสาทร กทม. 10120</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-bold text-slate-800 uppercase">Payslip</h2>
                            <p className="text-sm font-semibold text-slate-500">ใบแจ้งเงินเดือน</p>
                            <div className="mt-2 bg-slate-100 px-3 py-1 rounded text-sm font-bold text-slate-700 inline-block">
                                งวด: {currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                            </div>
                        </div>
                    </div>

                    {/* 2. Employee Info */}
                    <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase mb-1">พนักงาน (Employee)</p>
                            <p className="font-bold text-lg text-slate-900">{payslipData.name}</p>
                            <p className="text-slate-600">{payslipData.role} | ID: {payslipData.userId?.slice(0, 6)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-400 text-xs font-bold uppercase mb-1">วันที่จ่าย (Payment Date)</p>
                            <p className="font-bold text-lg text-slate-900">{payslipData.updatedAt ? formatDate(payslipData.updatedAt.toDate()) : '-'}</p>
                            <p className="text-slate-600">สถานะ: {payslipData.status === 'paid' ? 'โอนจ่ายแล้ว (Paid)' : 'รอตรวจสอบ'}</p>
                        </div>
                    </div>

                    {/* 3. Table */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden mb-8">
                        <div className="grid grid-cols-2 bg-slate-50 border-b border-slate-200">
                            <div className="p-3 font-bold text-center border-r border-slate-200 text-slate-700">รายได้ (Earnings)</div>
                            <div className="p-3 font-bold text-center text-slate-700">รายการหัก (Deductions)</div>
                        </div>
                        <div className="grid grid-cols-2">
                            {/* ฝั่งรายได้ */}
                            <div className="border-r border-slate-200 p-4 space-y-2 min-h-[200px]">
                                {earningsList.map((item, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span className="text-slate-600">{item.title}</span>
                                        <span className="font-bold text-emerald-600">{formatMoney(item.amount)}</span>
                                    </div>
                                ))}
                            </div>
                            {/* ฝั่งรายจ่าย */}
                            <div className="p-4 space-y-2 min-h-[200px]">
                                {deductionsList.map((item, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span className="text-slate-600">{item.title}</span>
                                        <span className="font-bold text-red-500">{formatMoney(item.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Total Row */}
                        <div className="grid grid-cols-2 border-t border-slate-200 bg-slate-50">
                            <div className="p-3 flex justify-between border-r border-slate-200">
                                <span className="font-bold text-sm text-slate-700">รวมรายได้</span>
                                <span className="font-bold text-sm text-emerald-600">{formatMoney(totalEarnings)}</span>
                            </div>
                            <div className="p-3 flex justify-between">
                                <span className="font-bold text-sm text-slate-700">รวมรายการหัก</span>
                                <span className="font-bold text-sm text-red-500">{formatMoney(totalDeductions)}</span>
                            </div>
                        </div>
                    </div>

                    {/* 4. Net Pay Big Box */}
                    <div className="flex justify-end mb-12">
                        <div className="bg-slate-900 text-white p-6 rounded-lg min-w-[300px] text-right">
                            <p className="text-slate-400 text-xs font-bold uppercase mb-1">ยอดเงินสุทธิ (Net Pay)</p>
                            <h2 className="text-4xl font-bold">{formatMoney(payslipData.netTotal)} <span className="text-sm font-normal text-slate-400">บาท</span></h2>
                        </div>
                    </div>

                    {/* 5. Footer / Signature */}
                    <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-200">
                        <div>
                            <p className="text-xs text-slate-400 mb-8">หมายเหตุ: เอกสารนี้ถูกสร้างขึ้นโดยระบบอัตโนมัติ ไม่จำเป็นต้องประทับตราสำคัญ</p>
                        </div>
                        <div className="text-center">
                            <div className="border-b border-slate-300 w-full h-8 mb-2"></div>
                            <p className="text-xs font-bold text-slate-500">ผู้มีอำนาจลงนาม (Authorized Signature)</p>
                        </div>
                    </div>

                </div>
            )}

        </div>
    );
}