import React from 'react';
import { MapPin, CheckCircle, WarningCircle } from '@phosphor-icons/react';

/**
 * AttendanceStatus Component
 * แสดงสถานะการเข้างานวันนี้
 */
export default function AttendanceStatus({ todayRecord, loading }) {
    if (loading) {
        return (
            <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-gray-500">Loading...</p>
            </div>
        );
    }

    if (!todayRecord) {
        return (
            <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center gap-2">
                    <WarningCircle size={24} className="text-gray-400" />
                    <p className="text-gray-600">ยังไม่ได้บันทึกเวลา</p>
                </div>
            </div>
        );
    }

    const { type, status, createdAt, location } = todayRecord;
    const time = createdAt?.toDate ? createdAt.toDate().toLocaleTimeString('th-TH') : '--:--';

    return (
        <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <CheckCircle
                        size={32}
                        weight="fill"
                        className={status === 'late' ? 'text-red-500' : 'text-green-500'}
                    />
                    <div>
                        <p className="font-semibold">
                            {type === 'clock-in' ? 'เข้างาน' : 'ออกงาน'}
                        </p>
                        <p className="text-sm text-gray-500">{time}</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm ${status === 'late'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                        {status === 'late' ? 'มาสาย' : 'ตรงเวลา'}
                    </span>
                </div>
            </div>
            {location && (
                <div className="mt-3 flex items-start gap-2 text-sm text-gray-500">
                    <MapPin size={16} className="mt-0.5" />
                    <span>{location.address || `${location.lat}, ${location.lng}`}</span>
                </div>
            )}
        </div>
    );
}
