import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapPin, UserCircle, X } from '@phosphor-icons/react';

// --- Custom Icons (สร้างไอคอนจาก Phosphor ให้ลงแผนที่ได้) ---
const createIcon = (iconComponent, color, className) => {
    const iconHtml = renderToStaticMarkup(iconComponent);
    return L.divIcon({
        html: `<div class="${className}" style="color: ${color};">${iconHtml}</div>`,
        className: 'custom-leaflet-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 40], // จุดชี้อยู่ตรงกลางล่าง
    });
};

const CompanyIcon = createIcon(<MapPin weight="fill" size={40} />, '#EF4444', 'drop-shadow-lg'); // สีแดง
const UserIcon = createIcon(<UserCircle weight="fill" size={40} />, '#3B82F6', 'drop-shadow-lg bg-white rounded-full'); // สีฟ้า

// --- Helper: ปรับมุมมองแผนที่ให้เห็นทั้ง User และบริษัท ---
const MapReCenter = ({ userLoc, companyLoc }) => {
    const map = useMap();
    useEffect(() => {
        if (userLoc && companyLoc) {
            const bounds = L.latLngBounds([
                [userLoc.lat, userLoc.lng],
                [companyLoc.lat, companyLoc.lng]
            ]);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [userLoc, companyLoc, map]);
    return null;
};

export default function AttendanceMiniMap({ isOpen, onClose, userLocation, companyLocation, radius }) {
    if (!isOpen || !companyLocation) return null;

    // ถ้ายังไม่มีพิกัด User ให้ใช้พิกัดบริษัทเป็น Center ชั่วคราว
    const center = userLocation 
        ? [userLocation.lat, userLocation.lng] 
        : [companyLocation.lat, companyLocation.lng];

    return createPortal(
        <div 
            id="Attendance-MiniMap-Modal" 
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center pointer-events-none"
        >
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Map Card */}
            <div className="bg-white w-full sm:w-[400px] h-[50vh] sm:h-[600px] rounded-t-[32px] sm:rounded-[32px] shadow-2xl relative z-10 overflow-hidden flex flex-col pointer-events-auto animate-slide-up">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Check-in Location</h3>
                        <p className="text-[10px] text-slate-400">Green zone is required</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 text-slate-600 transition">
                        <X weight="bold" />
                    </button>
                </div>

                {/* Map Container */}
                <div className="att-map-container flex-1 relative bg-slate-50">
                    <MapContainer 
                        center={center} 
                        zoom={15} 
                        style={{ height: "100%", width: "100%" }} 
                        zoomControl={false}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        
                        {/* 1. จุดที่ตั้งบริษัท */}
                        <Marker position={[companyLocation.lat, companyLocation.lng]} icon={CompanyIcon} />
                        
                        {/* 2. รัศมีที่เช็คอินได้ (สีเขียว) */}
                        <Circle 
                            center={[companyLocation.lat, companyLocation.lng]}
                            radius={radius}
                            pathOptions={{ color: '#10B981', fillColor: '#10B981', fillOpacity: 0.15 }}
                            className="att-radius-circle"
                        />

                        {/* 3. จุดที่ User อยู่ปัจจุบัน */}
                        {userLocation && (
                            <Marker position={[userLocation.lat, userLocation.lng]} icon={UserIcon} />
                        )}

                        {/* Auto Focus */}
                        <MapReCenter userLoc={userLocation} companyLoc={companyLocation} />
                    </MapContainer>
                </div>
            </div>
        </div>,
        document.body
    );
}