import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/shared/lib/firebase';

const ConfigContext = createContext();

export function useGlobalConfig() {
    return useContext(ConfigContext);
}

export function ConfigProvider({ children, companyId }) {
    const [companyConfig, setCompanyConfig] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribe;

        if (companyId) {
            setLoading(true);
            const docRef = doc(db, 'companies', companyId);

            // Real-time listener: 1 Read per session (unless changed)
            // This replaces multiple fetches in Dashboard, Payroll, Schedule, etc.
            unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setCompanyConfig({
                        id: docSnap.id,
                        ...data,

                        // ✅ Normalize: ดึง location/radius/gpsEnabled ออกจาก settings (nested) → top-level
                        //    ให้ทุกหน้าเข้าถึงได้ตรงๆ เช่น companyConfig.location, companyConfig.radius
                        location: data.settings?.location || data.location || null,
                        radius: data.settings?.radius || data.radius || 350,
                        gpsEnabled: data.settings?.gpsEnabled ?? data.gpsEnabled ?? true,

                        // ✅ Normalize: greeting / deduction (ตอนนี้อยู่ main doc แล้ว)
                        greeting: {
                            onTime: data.greeting?.onTimeMessage || '',
                            late: data.greeting?.lateMessage || ''
                        },
                        deduction: {
                            gracePeriod: data.deduction?.gracePeriod || 0,
                            deductionPerMinute: data.deduction?.deductionPerMinute || 0,
                            maxDeduction: data.deduction?.maxDeduction || 0
                        },

                        // ✅ Default Features
                        features: data.features || {
                            payroll: true,
                            attendance: true,
                            myWork: { overview: false, calendar: true }
                        }
                    });
                } else {
                    setCompanyConfig(null);
                }
                setLoading(false);
            }, (error) => {
                console.error("Error fetching company config:", error);
                setLoading(false);
            });
        } else {
            setCompanyConfig(null);
            setLoading(false);
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [companyId]);

    return (
        <ConfigContext.Provider value={{ companyConfig, loading }}>
            {children}
        </ConfigContext.Provider>
    );
}
