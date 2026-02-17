import React, { useState, useEffect } from 'react';

export const PaymentModal = ({ isOpen, onClose, remaining = 0, onConfirm }) => {
    const [amount, setAmount] = useState('');

    useEffect(() => {
        if (isOpen) setAmount(remaining);
    }, [isOpen, remaining]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        const val = Number(amount);
        if (val > 0) {
            onConfirm(val);
            onClose();
        }
    };

    const fmt = n => n.toLocaleString();

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-md p-6 animate-fade-in">
            <div className="absolute inset-0" onClick={onClose}></div>
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl scale-100 transition-all animate-scale-up relative z-10">
                <h3 className="text-lg font-bold text-center mb-1">ระบุยอดที่จ่าย</h3>
                <p className="text-xs text-gray-500 text-center mb-6">ยอดคงเหลือ: ฿{fmt(remaining)}</p>

                <div className="bg-gray-100 rounded-2xl p-4 mb-6 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-400 mr-2">฿</span>
                    <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="bg-transparent text-4xl font-display font-bold text-center w-full outline-none"
                        autoFocus
                        placeholder="0"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <button onClick={() => setAmount(remaining)} className="py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors">จ่ายทั้งหมด</button>
                    <button onClick={() => setAmount(Math.floor(remaining / 2))} className="py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors">จ่าย 50%</button>
                </div>

                <button
                    onClick={handleConfirm}
                    className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 mb-3 hover:bg-blue-700 transition-colors active:scale-[0.98]"
                >
                    ยืนยันการจ่าย
                </button>
                <button onClick={onClose} className="w-full text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors">ยกเลิก</button>
            </div>
        </div>
    );
};
