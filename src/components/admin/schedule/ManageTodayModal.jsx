import React from 'react';
import { X, Gift, Coins, Storefront } from '@phosphor-icons/react';

export default function ManageTodayModal({
    isOpen, currentDate, setIsManageTodayOpen,
    manageTodayTab, setManageTodayTab,
    bulkForm, setBulkForm,
    executeBulkAction, otTypes
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:px-4 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsManageTodayOpen(false)}></div>
            <div className="bg-white w-full max-w-sm sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl relative z-10 animate-zoom-in">
                <div className="flex justify-between items-center mb-6"><div><h3 className="text-lg font-bold text-slate-800">แก้ไขวันนี้</h3><p className="text-xs text-slate-500">วันที่: {currentDate.toLocaleDateString()}</p></div><button onClick={() => setIsManageTodayOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800"><X weight="bold" /></button></div>
                <div className="bg-slate-100 p-1 rounded-xl flex mb-6">
                    <button onClick={() => setManageTodayTab('bonus')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${manageTodayTab === 'bonus' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Incentive / OT</button>
                    <button onClick={() => setManageTodayTab('close')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${manageTodayTab === 'close' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>ปิดร้าน</button>
                </div>
                {manageTodayTab === 'bonus' ? (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100"><label className="text-xs font-bold text-yellow-700 mb-2 block flex items-center gap-1"><Gift weight="fill" /> Incentive </label><div className="relative"><input type="number" placeholder="เช่น 200" value={bulkForm.incentive} onChange={e => setBulkForm({ ...bulkForm, incentive: e.target.value })} className="w-full bg-white border border-yellow-200 rounded-lg pl-3 pr-8 py-2 text-sm font-bold text-slate-800 outline-none" /><span className="absolute right-3 top-2 text-xs font-bold text-slate-400">THB</span></div></div>
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                            <label className="text-xs font-bold text-emerald-700 mb-2 block flex items-center gap-1"><Coins weight="fill" /> OT </label>
                            <select value={bulkForm.otType} onChange={e => setBulkForm({ ...bulkForm, otType: e.target.value })} className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none mb-2">
                                <option value="">-- ไม่แจก OT --</option>
                                {otTypes.map(ot => <option key={ot.id} value={ot.id}>{ot.name} (x{ot.rate})</option>)}
                            </select>
                            {bulkForm.otType && <div className="flex items-center gap-2"><input type="number" value={bulkForm.otHours} onChange={e => setBulkForm({ ...bulkForm, otHours: e.target.value })} className="w-20 bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 outline-none text-center" /><span className="text-xs text-emerald-700 font-bold">ชั่วโมง</span></div>}
                        </div>
                        <button onClick={executeBulkAction} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition active:scale-95">ยืนยันการแจก</button>
                    </div>
                ) : (
                    <div className="text-center py-4 animate-fade-in"><Storefront size={48} className="text-rose-200 mx-auto mb-3" weight="duotone" /><h4 className="font-bold text-rose-600">ต้องการปิดร้านวันนี้?</h4><p className="text-xs text-slate-500 mb-6">พนักงานทุกคนจะถูกเปลี่ยนสถานะเป็น "วันหยุด (Holiday)" และล้างค่า OT ทั้งหมด</p><button onClick={executeBulkAction} className="w-full bg-rose-500 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-rose-600 transition active:scale-95">ยืนยันปิดร้าน</button></div>
                )}
            </div>
        </div>
    );
}
