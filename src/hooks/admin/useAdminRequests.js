import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, query, where, orderBy, onSnapshot, 
  doc, updateDoc, setDoc, addDoc, getDocs, serverTimestamp, getDoc 
} from 'firebase/firestore';

export function useAdminRequests(companyId, currentUserUid) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Requests
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    const q = query(collection(db, "requests"), where("companyId", "==", companyId), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(docs);
      setLoading(false);
    }, (error) => {
      console.error("Fetch Error:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, [companyId]);

  // 2. Approve Logic (ฉลาดขึ้น รองรับครึ่งวัน)
  const approveRequest = async (req) => {
    try {
        // 2.1 เปลี่ยนสถานะคำขอ
        await updateDoc(doc(db, "requests", req.id), { 
            status: 'approved', updatedAt: serverTimestamp(), approvedBy: currentUserUid 
        });

        // 2.2 กรณีลา (Leave)
        if (req.type === 'leave') {
            const start = new Date(req.data.startDate);
            const end = new Date(req.data.endDate);
            const leaveDuration = req.data.duration || 'full'; // 'full', 'half_morning', 'half_afternoon'

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const docId = `${req.userId}_${dateStr}`;
                
                // ดึงข้อมูลกะงานเดิมของวันนั้นมาดูเวลาพักเที่ยง (ถ้ามี) หรือกะปกติ
                // *เพื่อความง่าย เราจะสมมติเวลาตัดครึ่งวันที่ 12:00 และ 13:00
                
                let scheduleUpdate = {};

                if (leaveDuration === 'half_morning') {
                    // ลาเช้า -> ต้องมาทำบ่าย (สมมติเริ่มงานบ่าย 13:00 - 18:00)
                    scheduleUpdate = {
                        type: 'work', // ยังต้องมาทำงาน
                        startTime: '13:00', // เริ่มงานบ่าย
                        endTime: '18:00',   // เลิกงานปกติ
                        note: `ลาครึ่งเช้า (${req.reason || 'พักผ่อน'})`
                    };
                } else if (leaveDuration === 'half_afternoon') {
                    // ลาบ่าย -> มาทำเช้า (09:00 - 12:00)
                    scheduleUpdate = {
                        type: 'work', // ยังต้องมาทำงาน
                        startTime: '09:00', // เริ่มงานปกติ
                        endTime: '12:00',   // เลิกเที่ยง
                        note: `ลาครึ่งบ่าย (${req.reason || 'พักผ่อน'})`
                    };
                } else {
                    // ลาเต็มวัน (Full Day)
                    scheduleUpdate = {
                        type: 'leave',
                        startTime: '',
                        endTime: '',
                        note: req.reason || 'ลางาน'
                    };
                }

                await setDoc(doc(db, "schedules", docId), {
                    companyId: req.companyId,
                    userId: req.userId,
                    userName: req.userName,
                    date: dateStr,
                    updatedAt: serverTimestamp(),
                    ...scheduleUpdate // แปะข้อมูลทับลงไป
                }, { merge: true });
            }
        }

        // 2.3 กรณีแก้เวลา (Retro) - เหมือนเดิม
        else if (req.type === 'retro') {
            const [y, m, d] = req.data.date.split('-'); 
            const [hIn, mIn] = req.data.timeIn.split(':');
            const [hOut, mOut] = req.data.timeOut.split(':');
            await addDoc(collection(db, "attendance"), {
                userId: req.userId, userName: req.userName, companyId: req.companyId,
                date: req.data.date, type: 'retro-approved', status: 'verified',
                createdAt: new Date(y, m-1, d, hIn, mIn), clockOut: new Date(y, m-1, d, hOut, mOut),
                approvedRequestId: req.id, serverTimestamp: serverTimestamp()
            });
        }

        // 2.4 กรณี Unscheduled - เหมือนเดิม
        else if (req.type === 'unscheduled_alert') {
            const qAtt = query(collection(db, "attendance"), where("userId", "==", req.userId), where("date", "==", req.data.date));
            const attSnap = await getDocs(qAtt);
            if (!attSnap.empty) await updateDoc(doc(db, "attendance", attSnap.docs[0].id), { status: 'verified' });
        }

        return true;
    } catch (error) {
        console.error("Approve Error:", error);
        throw error;
    }
  };

  // 3. Reject Logic - เหมือนเดิม
  const rejectRequest = async (req) => {
    try {
        await updateDoc(doc(db, "requests", req.id), { status: 'rejected', updatedAt: serverTimestamp(), approvedBy: currentUserUid });
        if (req.type === 'unscheduled_alert') {
            const qAtt = query(collection(db, "attendance"), where("userId", "==", req.userId), where("date", "==", req.data.date));
            const attSnap = await getDocs(qAtt);
            if (!attSnap.empty) await updateDoc(doc(db, "attendance", attSnap.docs[0].id), { status: 'void' });
        }
        return true;
    } catch (error) { console.error("Reject Error:", error); throw error; }
  };

  return { requests, loading, approveRequest, rejectRequest };
}