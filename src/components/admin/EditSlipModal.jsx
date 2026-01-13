import React, { useState, useEffect } from 'react';
import { X, Trash, Plus, FloppyDisk, ShieldCheck, Calculator, Clock } from '@phosphor-icons/react';

export default function EditSlipModal({ isOpen, onClose, employee }) {
  if (!isOpen) return null;

  const [taxMode, setTaxMode] = useState('none'); 
  const [income, setIncome] = useState([]);
  const [deduction, setDeduction] = useState([]);

  useEffect(() => {
    if (employee) {
      const currentTaxMode = employee.taxMode || 'sso';
      setTaxMode(currentTaxMode);
      const baseSalary = employee.salary || 25000;
      
      setIncome([
        { id: 'base', label: 'เงินเดือนพื้นฐาน', amount: baseSalary, type: 'fixed' },
        { id: 'incentive', label: 'เบี้ยขยัน', amount: 1000, type: 'manual' },
      ]);

      setDeduction([
        { id: 'late', label: 'มาสาย (45 นาที)', amount: 450, type: 'auto' },
      ]);
    }
  }, [isOpen, employee]);

  useEffect(() => {
    const baseItem = income.find(i => i.id === 'base');
    const baseSalary = baseItem ? Number(baseItem.amount) : 0;
    let taxItem = null;

    if (taxMode === 'sso') {
      const ssoBase = Math.max(1650, Math.min(baseSalary, 15000));
      const ssoAmount = Math.floor(ssoBase * 0.05);
      taxItem = { id: 'tax', label: 'ประกันสังคม (5%)', amount: ssoAmount, type: 'auto-tax' };
    } else if (taxMode === 'wht') {
      const whtAmount = Math.floor(baseSalary * 0.03);
      taxItem = { id: 'tax', label: 'หัก ณ ที่จ่าย (3%)', amount: whtAmount, type: 'auto-tax' };
    }

    setDeduction(prev => {
      const others = prev.filter(d => d.id !== 'tax');
      return taxItem ? [taxItem, ...others] : others;
    });
  }, [income, taxMode]);

  const totalIncome = income.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalDeduction = deduction.reduce((sum, item) => sum + Number(item.amount), 0);
  const netTotal = totalIncome - totalDeduction;

  const handleUpdateAmount = (type, id, val) => {
    const list = type === 'income' ? income : deduction;
    const setList = type === 'income' ? setIncome : setDeduction;
    setList(list.map(item => item.id === id ? { ...item, amount: Number(val) } : item));
  };

  const addOT = () => {
    const hourlyRate = (25000 / 30 / 8); 
    const otAmount = Math.floor(hourlyRate * 1.5 * 2); 
    setIncome([...income, { id: Date.now(), label: 'OT ปกติ (2 ชม.)', amount: otAmount, type: 'manual' }]);
  };

  const rowStyle = "flex items-center gap-3 h-10";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] animate-pulse-soft">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">แก้ไขสลิปเงินเดือน</h2>
            <p className="text-xs text-slate-500">งวด: พฤศจิกายน 2025 • {employee?.name || 'พนักงาน'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center transition"><X weight="bold" className="text-slate-500"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wide">รายได้ (Earnings)</h3>
              <div className="flex gap-2">
                 <button onClick={addOT} className="text-[10px] flex items-center gap-1 text-purple-600 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded transition"><Clock weight="fill"/> เพิ่ม OT</button>
                 <button className="text-[10px] flex items-center gap-1 text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded transition"><Plus weight="bold"/> รายการอื่น</button>
              </div>
            </div>
            <div className="space-y-2">
              {income.map((item) => (
                <div key={item.id} className={rowStyle}>
                  <div className="flex-1 truncate"><p className="text-xs font-bold text-slate-700">{item.label}</p>{item.type === 'auto' && <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">Auto</span>}</div>
                  <input type="number" value={item.amount} onChange={(e) => handleUpdateAmount('income', item.id, e.target.value)} className="w-28 bg-slate-50 border border-slate-200 rounded-lg p-2 text-right text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition focus:ring-2 focus:ring-emerald-100" />
                  <button className="w-6 text-slate-300 hover:text-rose-500"><Trash weight="bold"/></button>
                </div>
              ))}
            </div>
          </div>
          <hr className="border-slate-100" />
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-rose-500 uppercase tracking-wide">รายการหัก (Deductions)</h3>
              <div className="flex items-center gap-2">
                 <div className="relative">
                    <select value={taxMode} onChange={(e) => setTaxMode(e.target.value)} className="bg-rose-50 border border-rose-100 text-[10px] font-bold text-rose-600 rounded-lg py-1 pl-2 pr-6 appearance-none outline-none cursor-pointer hover:bg-rose-100 transition">
                      <option value="sso">ใช้ประกันสังคม (5%)</option>
                      <option value="wht">หัก ณ ที่จ่าย (3%)</option>
                      <option value="none">ไม่หักภาษี</option>
                    </select>
                    <ShieldCheck className="absolute right-2 top-1.5 text-rose-400 pointer-events-none" size={12} weight="fill"/>
                 </div>
                 <button className="text-[10px] flex items-center gap-1 text-rose-500 hover:bg-rose-50 px-2 py-1 rounded transition"><Plus weight="bold"/> เพิ่ม</button>
              </div>
            </div>
            <div className="space-y-2">
              {deduction.map((item) => (
                <div key={item.id} className={rowStyle}>
                  <div className="flex-1 truncate">
                    <p className="text-xs font-bold text-slate-700">{item.label}</p>
                    {item.type === 'auto-tax' ? <span className="text-[9px] bg-rose-100 text-rose-500 px-1.5 py-0.5 rounded font-bold flex items-center gap-1 w-fit"><Calculator weight="fill" size={10}/> Auto</span> : item.type === 'auto' ? <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">System</span> : null}
                  </div>
                  <input type="number" value={item.amount} readOnly={item.type === 'auto-tax'} onChange={(e) => handleUpdateAmount('deduction', item.id, e.target.value)} className={`w-28 border rounded-lg p-2 text-right text-sm font-bold outline-none transition ${item.type === 'auto-tax' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-200 text-rose-500 focus:border-rose-500'}`} />
                  {item.type !== 'auto-tax' ? <button className="w-6 text-slate-300 hover:text-rose-500"><Trash weight="bold"/></button> : <div className="w-6"></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6 bg-slate-900 text-white rounded-t-3xl shadow-inner">
          <div className="flex justify-between items-end mb-4">
            <div className="text-right flex-1 pr-6 border-r border-slate-700"><p className="text-xs text-slate-400 mb-1">รวมรายได้</p><p className="text-lg font-bold text-emerald-400">{totalIncome.toLocaleString()}</p></div>
            <div className="text-right flex-1 pr-6 border-r border-slate-700"><p className="text-xs text-slate-400 mb-1">รวมหัก</p><p className="text-lg font-bold text-rose-400">{totalDeduction.toLocaleString()}</p></div>
            <div className="text-right flex-1 pl-6"><p className="text-xs text-slate-400 mb-1">ยอดสุทธิ (Net)</p><p className="text-2xl font-bold text-white">฿ {netTotal.toLocaleString()}</p></div>
          </div>
          <button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center gap-2 active:scale-95"><FloppyDisk weight="bold" size={18}/> บันทึกการแก้ไข</button>
        </div>
      </div>
    </div>
  );
}