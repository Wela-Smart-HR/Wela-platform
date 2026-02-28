import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { usePayslip } from '@/features/payroll/usePayslip';
import { formatMoney } from '@/shared/utils/money';
import { db } from '@/shared/lib/firebase'; // ✅ เพิ่ม Import db
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'; // ✅ เพิ่ม Import คำสั่ง Firestore
import {
    CaretLeft, CaretRight, DownloadSimple,
    TrendUp, TrendDown, Wallet, CalendarBlank,
    Eye, EyeSlash, FilePdf, Spinner, CheckCircle // ✅ เพิ่มไอคอน CheckCircle
} from '@phosphor-icons/react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function Payslip() {
    const { currentUser } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isDownloading, setIsDownloading] = useState(false);
    const [isAcknowledging, setIsAcknowledging] = useState(false); // State สำหรับปุ่มกดยืนยัน
    const [showAmount, setShowAmount] = useState(false);
    // ✅ 1. เพิ่ม State เพื่อเก็บสถานะการกดในหน้านี้ชั่วคราว
    const [isLocalAcknowledged, setIsLocalAcknowledged] = useState(false);
    const [companyName, setCompanyName] = useState('');

    // Use payslip hook
    const { payslip: payslipData, loading } = usePayslip(currentUser?.uid, currentDate);

    // ดึงข้อมูลบริษัท
    useEffect(() => {
        const fetchCompany = async () => {
            if (payslipData?.companyId) {
                try {
                    const snap = await getDoc(doc(db, 'companies', payslipData.companyId));
                    if (snap.exists()) {
                        const data = snap.data();
                        // ดึงจาก name ตรงๆ หรือใน greeting ตามที่ user แจ้งว่าอาจจะอยู่ในนั้น
                        const name = data.name || data.greeting?.name || 'บริษัท เวฬา แพลตฟอร์ม จำกัด';
                        setCompanyName(name);
                    }
                } catch (err) {
                    console.error("Failed to fetch company", err);
                }
            }
        };
        fetchCompany();
    }, [payslipData?.companyId]);

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

    // ฟังก์ชันกดยืนยันยอดเงิน (พนักงานยอมรับสลิป)
    const handleAcknowledge = async () => {
        if (!payslipData?.id) return;
        setIsAcknowledging(true);
        try {
            const payslipRef = doc(db, 'payslips', payslipData.id);
            await updateDoc(payslipRef, {
                isAcknowledged: true,
                acknowledgedAt: serverTimestamp(),
                paymentStatus: payslipData.paymentStatus === 'locked' ? 'acknowledged' : payslipData.paymentStatus // เปลี่ยนสถานะถ้ายืนยันแล้ว
            });
            // สั่งให้ State เปลี่ยนเป็น true ทันทีที่เซฟผ่าน!
            setIsLocalAcknowledged(true);

        } catch (error) {
            console.error("Acknowledge Error:", error);
            alert("ไม่สามารถบันทึกการยืนยันได้ กรุณาลองใหม่");
        } finally {
            setIsAcknowledging(false);
        }
    };

    // ฟังก์ชันสร้าง PDF (ฉบับ A4)
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
    const customIncomes = (payslipData?.customItems || []).filter(item => item.type === 'income');
    const customDeductions = (payslipData?.customItems || []).filter(item => item.type === 'deduct');

    const earningsList = payslipData ? [
        { title: 'เงินเดือน / Salary', amount: payslipData.financials?.salary || 0 },
        { title: 'ค่าล่วงเวลา / Overtime', amount: payslipData.financials?.ot || 0 },
        { title: 'เบี้ยขยัน / Incentive', amount: payslipData.financials?.incentive || 0 },
        ...customIncomes.map(item => ({ title: item.label, amount: item.amount }))
    ].filter(i => i.amount > 0) : [];

    const deductionsList = payslipData ? [
        { title: 'มาสาย/ขาดงาน / Late/Absent', amount: payslipData.financials?.deductions || 0 },
        { title: 'ประกันสังคม / Social Security', amount: payslipData.financials?.sso || 0 },
        { title: 'ภาษี / Withholding Tax', amount: payslipData.financials?.tax || 0 },
        ...customDeductions.map(item => ({ title: item.label, amount: item.amount }))
    ].filter(i => i.amount > 0) : [];

    const totalEarnings = earningsList.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalDeductions = deductionsList.reduce((acc, curr) => acc + Number(curr.amount), 0);

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] font-sans text-[#1E293B]">

            {/* 📱 ส่วนแสดงผลบนหน้าจอ (Mobile UI) */}
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
                            <div className="mb-4 relative z-10 h-10 flex items-center">{showAmount ? <h2 className="text-4xl font-bold tracking-tight">฿{formatMoney(payslipData.financials?.net || 0)}</h2> : <h2 className="text-4xl font-bold tracking-widest text-slate-500 mt-2">••••••</h2>}</div>
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg w-fit border border-white/5"><div className={`w-1.5 h-1.5 rounded-full ${payslipData.paymentStatus === 'paid' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : (payslipData.isAcknowledged || isLocalAcknowledged) ? 'bg-blue-400' : 'bg-orange-400'}`}></div><span className="text-[10px] font-bold tracking-wide text-slate-200">{payslipData.paymentStatus === 'paid' ? 'โอนจ่ายเรียบร้อย' : (payslipData.isAcknowledged || isLocalAcknowledged) ? 'ยืนยันยอดแล้ว' : 'รอตรวจสอบ'}</span></div>
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

            {/* Button Section (Gatekeeping Logic) */}
            {payslipData && (
                <div className="p-6 pt-2 bg-[#FAFAFA]">
                    {/* เช็คเงื่อนไขเพิ่ม isLocalAcknowledged */}
                    {(payslipData.isAcknowledged || isLocalAcknowledged) ? (
                        <button onClick={handleDownloadPDF} disabled={isDownloading} className="w-full bg-white border border-slate-200 text-slate-500 py-3 rounded-xl text-xs font-bold shadow-sm hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50">
                            {isDownloading ? <><Spinner className="animate-spin" size={16} /> กำลังสร้าง PDF...</> : <><DownloadSimple size={16} weight="bold" /> ดาวน์โหลดสลิป (A4)</>}
                        </button>
                    ) : (
                        <button onClick={handleAcknowledge} disabled={isAcknowledging} className="w-full bg-blue-600 text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50">
                            {isAcknowledging ? <><Spinner className="animate-spin" size={16} /> กำลังบันทึก...</> : <><CheckCircle size={18} weight="bold" /> ตรวจสอบแล้ว ยืนยันยอดเงิน</>}
                        </button>
                    )}
                </div>
            )}

            {/* ส่วนลับ: A4 Formal Template (Bank-Grade Standard) */}
            {payslipData && (
                <div id="formal-payslip-a4" style={{
                    position: 'absolute', top: '-9999px', left: '-9999px',
                    width: '210mm', minHeight: '297mm', backgroundColor: 'white',
                    padding: '20mm', color: '#000000', fontFamily: '"Sarabun", "Helvetica", sans-serif',
                    boxSizing: 'border-box'
                }}>
                    {/* CONFIDENTIAL STAMP */}
                    <div className="absolute top-10 right-10 border-4 border-red-500 text-red-500 text-2xl font-bold p-2 transform rotate-12 opacity-20 uppercase tracking-widest rounded">
                        Confidential
                    </div>

                    <div className="border-2 border-gray-800 h-full p-8 flex flex-col relative z-10 bg-white">
                        {/* 1. Header & Company Info */}
                        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
                            <div className="flex items-center">
                                <div>
                                    <h1 className="text-2xl font-bold tracking-wide">{companyName || 'บริษัท เวฬา แพลตฟอร์ม จำกัด'}</h1>
                                </div>
                            </div>
                            <div className="text-right">
                                <h2 className="text-3xl font-extrabold tracking-widest text-gray-900">PAYSLIP</h2>
                                <p className="text-lg font-bold mt-1 text-gray-700">ใบแจ้งเงินเดือน</p>
                            </div>
                        </div>

                        {/* 2. Employee Info Grid */}
                        <div className="grid grid-cols-2 gap-8 mb-6 text-sm">
                            <div className="space-y-3">
                                <div className="flex border-b border-gray-200 pb-1"><span className="w-32 font-bold text-gray-700">รหัสพนักงาน:</span> <span className="text-gray-900">{payslipData.employeeId?.slice(0, 6)}</span></div>
                                <div className="flex border-b border-gray-200 pb-1"><span className="w-32 font-bold text-gray-700">ชื่อ-สกุล:</span> <span className="text-gray-900">{payslipData.employeeSnapshot?.name || currentUser?.name}</span></div>
                                <div className="flex border-b border-gray-200 pb-1"><span className="w-32 font-bold text-gray-700">ตำแหน่ง:</span> <span className="text-gray-900">{payslipData.employeeSnapshot?.role || currentUser?.role}</span></div>
                                <div className="flex border-b border-gray-200 pb-1"><span className="w-32 font-bold text-gray-700">เลขบัตรประชาชน:</span> <span className="text-gray-900">{payslipData.employeeSnapshot?.idCard || '-'}</span></div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex border-b border-gray-200 pb-1"><span className="w-40 font-bold text-gray-700">ประจำงวดเดือน:</span> <span className="text-gray-900">{currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</span></div>
                                <div className="flex border-b border-gray-200 pb-1"><span className="w-40 font-bold text-gray-700">วันที่จ่ายเงิน:</span> <span className="text-gray-900">{payslipData.updatedAt ? formatDate(payslipData.updatedAt.toDate()) : '-'}</span></div>
                                <div className="flex border-b border-gray-200 pb-1"><span className="w-40 font-bold text-gray-700">ธนาคาร:</span> <span className="text-gray-900">{payslipData.employeeSnapshot?.bankName || '-'}</span></div>
                                <div className="flex border-b border-gray-200 pb-1"><span className="w-40 font-bold text-gray-700">เลขที่บัญชี:</span> <span className="text-gray-900">{payslipData.employeeSnapshot?.bankAccount || '-'}</span></div>
                            </div>
                        </div>

                        {/* 3. Financial Table */}
                        <div className="border-2 border-gray-800 flex-1 flex flex-col mb-8 bg-white">
                            {/* Table Header */}
                            <div className="grid grid-cols-2 border-b-2 border-gray-800 bg-gray-100 font-bold text-center">
                                <div className="p-3 border-r-2 border-gray-800 text-gray-800 uppercase tracking-wider text-sm">รายได้ (EARNINGS)</div>
                                <div className="p-3 text-gray-800 uppercase tracking-wider text-sm">รายการหัก (DEDUCTIONS)</div>
                            </div>

                            {/* Table Body */}
                            <div className="grid grid-cols-2 flex-1 min-h-[160px] text-sm">
                                {/* Earnings */}
                                <div className="border-r-2 border-gray-800 p-4 space-y-2">
                                    {earningsList.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center">
                                            <span className="text-gray-700">{item.title}</span>
                                            <span className="font-medium text-gray-900">{formatMoney(item.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                                {/* Deductions */}
                                <div className="p-4 space-y-2">
                                    {deductionsList.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center">
                                            <span className="text-gray-700">{item.title}</span>
                                            <span className="font-medium text-gray-900">{formatMoney(item.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Table Footer */}
                            <div className="grid grid-cols-2 border-t-2 border-gray-800 font-bold bg-gray-50">
                                <div className="p-3 border-r-2 border-gray-800 flex justify-between items-center">
                                    <span className="text-gray-800">รวมรายได้ (Total Earnings)</span>
                                    <span className="text-lg text-gray-900">{formatMoney(totalEarnings)}</span>
                                </div>
                                <div className="p-3 flex justify-between items-center">
                                    <span className="text-gray-800">รวมรายการหัก (Total Deductions)</span>
                                    <span className="text-lg text-gray-900">{formatMoney(totalDeductions)}</span>
                                </div>
                            </div>
                        </div>

                        {/* 4. Net Pay Summary */}
                        <div className="flex justify-end mb-12">
                            <div className="border-2 border-gray-800 w-[70%] flex items-stretch shadow-sm">
                                <div className="w-[40%] p-4 bg-gray-100 font-bold border-r-2 border-gray-800 flex flex-col justify-center items-center text-center leading-tight">
                                    <span className="text-lg text-gray-800">เงินได้สุทธิ</span>
                                    <span className="text-xs font-normal text-gray-600 mt-0.5">(Net Payable)</span>
                                </div>
                                <div className="w-[60%] p-4 flex items-baseline justify-end gap-3 bg-white text-gray-900 pr-8">
                                    <span className="text-2xl font-extrabold">{formatMoney(payslipData.financials?.net || 0)}</span>
                                    <span className="text-base font-bold text-gray-700">บาท</span>
                                </div>
                            </div>
                        </div>

                        {/* 5. Footer / Signatures */}
                        <div className="mt-auto grid grid-cols-2 gap-12 text-sm pt-4">
                            <div className="flex flex-col">
                                <p className="font-bold mb-2 text-gray-800">หมายเหตุ (Remarks):</p>
                                <ul className="list-disc pl-5 text-gray-600 text-xs space-y-1.5">
                                    <li>เอกสารฉบับนี้จัดพิมพ์จากระบบคอมพิวเตอร์ ถือเป็นเอกสารที่ถูกต้องและสมบูรณ์</li>
                                    <li>โปรดตรวจสอบความถูกต้องของรายการทั้งหมด หากมีข้อสงสัยติดต่อฝ่ายทรัพยากรบุคคล</li>
                                    <li>กรุณาเก็บรักษาข้อมูลในเอกสารฉบับนี้ไว้เป็นความลับส่วนบุคคล (Confidential)</li>
                                </ul>
                            </div>
                            <div className="flex flex-col items-center justify-end pb-2">
                                <div className="border-b border-gray-800 w-3/4 mb-3 border-dashed"></div>
                                <p className="font-bold text-gray-800">ผู้มีอำนาจลงนาม / ฝ่ายทรัพยากรบุคคล</p>
                                <p className="text-gray-500 text-xs mt-0.5 uppercase tracking-wider">Authorized Signature</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}