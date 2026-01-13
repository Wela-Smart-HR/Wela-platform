import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
  collection, query, where, onSnapshot, 
  doc, updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext'; // เราจะเรียก useAuth ในนี้เพื่อใช้ createEmployee

export function useEmployees(companyId) {
  const { createEmployee } = useAuth(); // ดึงฟังก์ชันสร้าง User จาก AuthContext
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Logic การดึงข้อมูล (Subscribe Real-time)
  useEffect(() => {
    if (!companyId) {
        setEmployees([]);
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    try {
      const q = query(
        collection(db, "users"), 
        where("companyId", "==", companyId), 
        where("role", "==", "employee")
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const empList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEmployees(empList);
        setIsLoading(false);
      }, (err) => {
        console.error("Error fetching employees:", err);
        setError(err.message);
        setIsLoading(false);
      });
      
      return unsubscribe;
    } catch (err) {
      console.error("Firestore Query Error:", err);
      setError(err.message);
      setIsLoading(false);
    }
  }, [companyId]);

  // 2. Logic การแก้ไขพนักงาน (Update)
  const updateEmployee = async (id, data) => {
    if (!id) throw new Error("Missing Employee ID");
    try {
      const userRef = doc(db, "users", id);
      // เพิ่ม timestamp เวลาแก้ไข
      await updateDoc(userRef, { 
          ...data, 
          updatedAt: serverTimestamp() 
      });
      return true;
    } catch (err) {
      console.error("Update Error:", err);
      throw err;
    }
  };

  // 3. Logic การสร้างพนักงานใหม่ (Create)
  const addEmployee = async (formData, password) => {
    if (!createEmployee) throw new Error("Create function not found in AuthContext");
    try {
      await createEmployee(formData, password);
      return true;
    } catch (err) {
      console.error("Create Error:", err);
      throw err;
    }
  };

  return { 
    employees, 
    isLoading, 
    error, 
    updateEmployee, 
    addEmployee 
  };
}