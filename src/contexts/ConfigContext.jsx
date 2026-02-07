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
                    setCompanyConfig({
                        id: docSnap.id,
                        ...docSnap.data(),
                        // ✅ Default Features (ถ้าไม่มีใน DB ให้ถือว่าเปิดหมด)
                        features: docSnap.data().features || {
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
