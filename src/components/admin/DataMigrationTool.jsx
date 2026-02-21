import React, { useState } from 'react';
import { db } from '../../shared/lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Swal from 'sweetalert2';

dayjs.extend(utc);
dayjs.extend(timezone);

const COMPANY_TIMEZONE = 'Asia/Bangkok';

export const DataMigrationTool = ({ companyId }) => {
    const [isMigrating, setIsMigrating] = useState(false);

    const handleMigration = async () => {
        const result = await Swal.fire({
            title: 'Inject Manual Data?',
            text: "ระบบจะทำการอัปเดตข้อมูลของ เต้ย, นุช, ปาย ลงในฐานข้อมูลโดยตรง",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Start Injection'
        });

        if (!result.isConfirmed) return;

        try {
            setIsMigrating(true);
            const companyId = 'COMP-1768062566486'; // Company ID ของคุณ
            const batch = writeBatch(db);

            // 🎯 1. ข้อมูลดิบที่ HR ดึงมาจากมือถือพนักงาน
            const manualData = [
                // 👤 เต้ย (LJI98sfXnya2bKDfUwe5frh8iux2)
                { id: 'LJI98sfXnya2bKDfUwe5frh8iux2', date: '2026-02-02', in: '09:33', out: '17:15' },
                { id: 'LJI98sfXnya2bKDfUwe5frh8iux2', date: '2026-02-03', in: '09:52', out: '17:03' },
                { id: 'LJI98sfXnya2bKDfUwe5frh8iux2', date: '2026-02-04', in: '09:49', out: null },
                { id: 'LJI98sfXnya2bKDfUwe5frh8iux2', date: '2026-02-05', in: null, out: null }, // วันหยุด
                { id: 'LJI98sfXnya2bKDfUwe5frh8iux2', date: '2026-02-06', in: '09:46', out: '17:10' },
                { id: 'LJI98sfXnya2bKDfUwe5frh8iux2', date: '2026-02-07', in: '09:47', out: '17:56' },
                { id: 'LJI98sfXnya2bKDfUwe5frh8iux2', date: '2026-02-08', in: '09:43', out: '18:21' },
                { id: 'LJI98sfXnya2bKDfUwe5frh8iux2', date: '2026-02-09', in: '09:52', out: '17:07' },
                { id: 'LJI98sfXnya2bKDfUwe5frh8iux2', date: '2026-02-10', in: '09:45', out: '17:08' },
                
                // 👤 นุช (Y0uY0mLvzva1VOeszzd8CXKtMiT2)
                { id: 'Y0uY0mLvzva1VOeszzd8CXKtMiT2', date: '2026-02-02', in: '09:45', out: '17:31' },
                { id: 'Y0uY0mLvzva1VOeszzd8CXKtMiT2', date: '2026-02-03', in: '09:39', out: '17:11' },
                { id: 'Y0uY0mLvzva1VOeszzd8CXKtMiT2', date: '2026-02-04', in: '09:40', out: '17:22' },
                { id: 'Y0uY0mLvzva1VOeszzd8CXKtMiT2', date: '2026-02-05', in: null, out: null }, // วันหยุด
                { id: 'Y0uY0mLvzva1VOeszzd8CXKtMiT2', date: '2026-02-06', in: '09:50', out: null },
                { id: 'Y0uY0mLvzva1VOeszzd8CXKtMiT2', date: '2026-02-07', in: '09:47', out: null },
                { id: 'Y0uY0mLvzva1VOeszzd8CXKtMiT2', date: '2026-02-08', in: '09:44', out: '18:21' },
                { id: 'Y0uY0mLvzva1VOeszzd8CXKtMiT2', date: '2026-02-09', in: '09:32', out: '17:20' },
                { id: 'Y0uY0mLvzva1VOeszzd8CXKtMiT2', date: '2026-02-10', in: '09:37', out: '17:10' },

                // 👤 ปาย (57G16CeEv4PjWlmHuoXRyTIRrug1)
                { id: '57G16CeEv4PjWlmHuoXRyTIRrug1', date: '2026-02-06', in: '11:40', out: '17:17' },
                { id: '57G16CeEv4PjWlmHuoXRyTIRrug1', date: '2026-02-07', in: '09:34', out: null },
                { id: '57G16CeEv4PjWlmHuoXRyTIRrug1', date: '2026-02-08', in: '09:52', out: '18:28' },
            ];

            let count = 0;

            // 🎯 2. วนลูปแปลงเวลาและเขียนลงฐานข้อมูล
            manualData.forEach(record => {
                // ข้ามวันที่ไม่มีทั้งเวลาเข้าและออก (เช่น 2026-02-05) เพื่อไม่ให้รก Database
                if (!record.in && !record.out) return; 

                // สร้าง ID แบบเดียวกับระบบหลักเป๊ะ ป้องกันข้อมูลซ้ำซ้อน
                const deterministicId = `${companyId}_${record.id}_${record.date}`;
                const newDocRef = doc(db, 'attendance_logs', deterministicId);

                // แปลง String เป็น Timestamp (ถ้าเป็น null ก็ปล่อย null)
                const clockInDate = record.in ? dayjs.tz(`${record.date} ${record.in}`, COMPANY_TIMEZONE).toDate() : null;
                const clockOutDate = record.out ? dayjs.tz(`${record.date} ${record.out}`, COMPANY_TIMEZONE).toDate() : null;

                batch.set(newDocRef, {
                    company_id: companyId,
                    employee_id: record.id,
                    shift_date: record.date,
                    clock_in: clockInDate,
                    clock_out: clockOutDate,
                    status: clockInDate ? 'present' : 'absent', // ถ้ามีเวลาเข้าถือว่ามาทำงาน
                    timezone: COMPANY_TIMEZONE,
                    is_migrated: true,
                    migrated_at: serverTimestamp(),
                    source: 'manual_hr_seeding' // ระบุที่มาว่าแอดมินเพิ่มเอง
                }, { merge: true });

                count++;
            });

            await batch.commit();
            Swal.fire('Success', `ฝังข้อมูลเรียบร้อย ${count} วัน!\nกรุณากด Rebuild Payroll Cycle เพื่อคำนวณเงินใหม่`, 'success');

        } catch (error) {
            console.error(error);
            Swal.fire('Error', error.message, 'error');
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <button 
            onClick={handleMigration} 
            disabled={isMigrating}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-bold"
        >
            {isMigrating ? 'กำลังย้ายข้อมูล...' : '🔧 Fix Missing Data (1-10)'}
        </button>
    );
};
