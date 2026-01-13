import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, onSnapshot, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export function useCompanySettings(companyId) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);

    // 1. Company Data (General, Shifts, OT)
    const unsubCompany = onSnapshot(doc(db, "companies", companyId), (companySnap) => {
      const companyData = companySnap.exists() ? companySnap.data() : {};

      // 2. Greeting Data
      const unsubGreeting = onSnapshot(doc(db, "companies", companyId, "settings", "greeting"), (greetingSnap) => {
        const greetingData = greetingSnap.exists() ? greetingSnap.data() : {};

        // 3. Deduction Data (กฎการหักเงิน)
        const unsubDeduction = onSnapshot(doc(db, "companies", companyId, "settings", "deduction"), (deductionSnap) => {
            const deductionData = deductionSnap.exists() ? deductionSnap.data() : {};

            // Defaults
            const defaultShifts = [{ id: 'shift_normal', name: 'กะปกติ', startTime: '09:00', endTime: '18:00' }];
            const defaultOT = [
                { id: 'ot_1_5', name: 'OT ปกติ (1.5)', rate: 1.5, enabled: true },
                { id: 'ot_2_0', name: 'OT วันหยุด (2.0)', rate: 2.0, enabled: true },
                { id: 'ot_3_0', name: 'OT พิเศษ (3.0)', rate: 3.0, enabled: false }
            ];

            // รวมร่างข้อมูลทั้งหมด
            setSettings({
                ...companyData,
                shifts: companyData.shifts || defaultShifts,
                otTypes: companyData.otTypes || defaultOT,
                ...greetingData,
                ...deductionData, // gracePeriod, deductionPerMinute, maxDeduction
            });
            setLoading(false);
        });
        return () => unsubDeduction();
      });
      return () => unsubGreeting();
    }, (err) => {
      console.error("Fetch Error:", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubCompany();
  }, [companyId]);

  // ฟังก์ชันบันทึกที่ฉลาดขึ้น (แยกลง 3 ถัง)
  const updateSettings = async (newData) => {
    if (!companyId) return;
    try {
      const companyUpdates = {};
      const greetingUpdates = {};
      const deductionUpdates = {};

      Object.keys(newData).forEach(key => {
        // ถัง Greeting
        if (['onTimeMessage', 'lateMessage'].includes(key)) {
            greetingUpdates[key] = newData[key];
        } 
        // ถัง Deduction
        else if (['gracePeriod', 'deductionPerMinute', 'maxDeduction'].includes(key)) {
            deductionUpdates[key] = Number(newData[key]); // แปลงเป็นตัวเลขเสมอ
        } 
        // ถัง Company หลัก
        else {
            companyUpdates[key] = newData[key];
        }
      });

      const promises = [];
      if (Object.keys(companyUpdates).length > 0) {
        promises.push(updateDoc(doc(db, "companies", companyId), { ...companyUpdates, updatedAt: serverTimestamp() }));
      }
      if (Object.keys(greetingUpdates).length > 0) {
        promises.push(setDoc(doc(db, "companies", companyId, "settings", "greeting"), { ...greetingUpdates, updatedAt: serverTimestamp() }, { merge: true }));
      }
      if (Object.keys(deductionUpdates).length > 0) {
        promises.push(setDoc(doc(db, "companies", companyId, "settings", "deduction"), { ...deductionUpdates, updatedAt: serverTimestamp() }, { merge: true }));
      }

      await Promise.all(promises);
      return true;
    } catch (err) {
      console.error("Update Error:", err);
      throw err;
    }
  };

  return { settings, loading, error, updateSettings };
}