import React, { useState } from 'react';
import { MapPinArea, Plus } from '@phosphor-icons/react';
import { useDialog } from '../../../contexts/DialogContext';
import LocationPickerMap from '../LocationPickerMap';

export default function GeneralRules({ settings = {}, onChange }) {
    const dialog = useDialog();
    const [isLocating, setIsLocating] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            return dialog.showAlert("Browser ไม่รองรับ GPS", "Error", "error");
        }

        setIsLocating(true);

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                setIsLocating(false);
                const newLocation = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                };

                onChange({
                    ...settings,
                    location: newLocation
                });

                await dialog.showAlert(
                    `พิกัด: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`,
                    "อัปเดตพิกัดสำเร็จ",
                    "success"
                );
            },
            async (err) => {
                setIsLocating(false);
                console.error("GPS Error:", err);
                let msg = err.message;
                if (err.code === 1) msg = "กรุณาอนุญาตให้เข้าถึงตำแหน่ง (Allow Permission)";
                if (err.code === 2) msg = "ไม่สามารถระบุตำแหน่งได้ (Position Unavailable)";
                if (err.code === 3) msg = "หมดเวลาการเชื่อมต่อ (Timeout)";
                await dialog.showAlert("ไม่สามารถดึงพิกัดได้: " + msg, "GPS Error", "error");
            },
            { timeout: 10000, enableHighAccuracy: false }
        );
    };

    return (
        <div className="space-y-6">

            {/* 1. GPS */}
            <div className="modern-card p-5">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                            <MapPinArea size={20} weight="fill" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-700">พิกัดร้าน (GPS)</p>
                            <p className="text-[10px] text-slate-400">ใช้สำหรับ Check-in</p>
                        </div>
                    </div>
                    <button
                        onClick={getCurrentLocation}
                        disabled={isLocating}
                        className={`text-[10px] px-3 py-1.5 rounded-full font-bold transition flex items-center gap-1.5 ${isLocating ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                    >
                        {isLocating ? (
                            <>
                                <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                                กำลังหา...
                            </>
                        ) : (
                            <>📍 ดึงพิกัดปัจจุบัน</>
                        )}
                    </button>
                    <button
                        onClick={() => setShowMapPicker(true)}
                        className="px-3 py-1.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition flex items-center gap-1.5"
                    >
                        <MapPinArea size={14} weight="bold" /> เลือกบนแผนที่
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Latitude</label>
                        <input type="number"
                            value={settings.location?.lat || ''}
                            onChange={(e) => onChange({ ...settings, location: { ...settings.location, lat: parseFloat(e.target.value) } })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Longitude</label>
                        <input type="number"
                            value={settings.location?.lng || ''}
                            onChange={(e) => onChange({ ...settings, location: { ...settings.location, lng: parseFloat(e.target.value) } })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none"
                        />
                    </div>
                </div>
                <div className="space-y-2 pt-3 border-t border-slate-50">
                    <div className="flex justify-between text-xs font-bold text-slate-600"><span>รัศมี ({settings.radius} ม.)</span></div>
                    <input type="range" min="50" max="1000" step="50"
                        value={settings.radius || 350}
                        onChange={(e) => onChange({ ...settings, radius: Number(e.target.value) })}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3">
                    <p className="text-xs font-bold text-slate-700">บังคับใช้ GPS</p>
                    <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                        <input type="checkbox"
                            className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-300 checked:border-emerald-500"
                            checked={settings.gpsEnabled ?? true}
                            onChange={(e) => onChange({ ...settings, gpsEnabled: e.target.checked })}
                        />
                        <label onClick={() => onChange({ ...settings, gpsEnabled: !settings.gpsEnabled })} className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${settings.gpsEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}></label>
                    </div>
                </div>
            </div>

            {/* 2. DEDUCTION RULES */}
            <div className="modern-card p-5 space-y-4 border-l-4 border-l-orange-400">
                <h3 className="text-sm font-bold text-slate-700 mb-2">กฎการหักเงิน</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">อนุโลม (นาที)</label>
                        <div className="relative">
                            <input type="number"
                                value={settings.gracePeriod || 0}
                                onChange={(e) => onChange({ ...settings, gracePeriod: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none text-center"
                            />
                            <span className="absolute right-8 top-2 text-[10px] text-slate-400">นาที</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">หักนาทีละ</label>
                        <div className="relative">
                            <input type="number"
                                value={settings.deductionPerMinute || 0}
                                onChange={(e) => onChange({ ...settings, deductionPerMinute: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none text-center"
                            />
                            <span className="absolute right-8 top-2 text-[10px] text-slate-400">บาท</span>
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">หักสูงสุดไม่เกิน (ต่อวัน)</label>
                    <input type="number"
                        value={settings.maxDeduction || 0}
                        onChange={(e) => onChange({ ...settings, maxDeduction: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none"
                        placeholder="0 = ไม่จำกัด"
                    />
                </div>
            </div>

            {/* Map Picker Modal */}
            <LocationPickerMap
                isOpen={showMapPicker}
                onClose={() => setShowMapPicker(false)}
                initialLocation={settings.location}
                onConfirm={(loc) => {
                    const newLocation = { lat: loc.lat, lng: loc.lng };
                    onChange({
                        ...settings,
                        location: newLocation
                    });
                    dialog.showAlert(`อัปเดตตำแหน่งเรียบร้อย: ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`, "สำเร็จ", "success");
                }}
            />
        </div>
    );
}
