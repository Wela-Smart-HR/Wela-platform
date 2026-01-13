import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp } from "firebase/app"; 
import { getAuth } from "firebase/auth"; // ดึง getAuth มาใช้กับ Secondary App
import { auth, db, firebaseConfig } from '../services/firebase'; // ✅ ต้อง Import config มาด้วย

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- 1. SIGN UP OWNER (แก้ชื่อเป็น signupOwner ตามที่หน้า UI เรียกใช้) ---
  async function signupOwner(email, password, name, companyName) {
    // สร้าง User หลัก
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // สร้างรหัสบริษัท (Company ID)
    const companyId = "COMP-" + Date.now();

    // บันทึกข้อมูลบริษัท
    await setDoc(doc(db, "companies", companyId), {
      name: companyName,
      createdAt: serverTimestamp(),
      ownerId: user.uid
    });

    // บันทึกข้อมูล Owner
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      name: name,
      role: 'owner', // 👑
      companyId: companyId,
      createdAt: serverTimestamp()
    });

    return user;
  }

  // --- 2. CREATE EMPLOYEE (เก็บไว้เหมือนเดิม ห้ามหาย!) ---
  async function createEmployee(formData, password) {
    // เช็คก่อนว่าคนสั่งใช่ Owner/Admin จริงไหม
    if (!currentUser || currentUser.role !== 'owner') {
      throw new Error("Access Denied: คุณไม่มีสิทธิ์สร้างพนักงาน");
    }

    let secondaryApp = null;
    try {
      // 🟢 1. สร้างแอปเงา (Secondary App) ขึ้นมา
      secondaryApp = initializeApp(firebaseConfig, "Secondary");
      const secondaryAuth = getAuth(secondaryApp);

      // 🟢 2. สั่งแอปเงาให้สร้าง User ใหม่
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, password);
      const newUser = userCredential.user;

      // 🟢 3. บันทึกข้อมูลพนักงานลง Firestore (ใช้ db หลักได้เลย)
      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        email: formData.email,
        name: formData.name,
        role: 'employee',
        position: formData.position || 'พนักงานทั่วไป',
        salary: Number(formData.salary) || 0,
        type: formData.type || 'Full Time',
        status: 'active',
        // ✅ ผูกกับบริษัทเดียวกับ Admin เท่านั้น
        companyId: currentUser.companyId, 
        createdAt: serverTimestamp()
      });

      // 🟢 4. เตะ User ใหม่ออกจากระบบแอปเงาทันที (Logout Secondary)
      await signOut(secondaryAuth);

      return newUser;

    } catch (error) {
      console.error("Create Employee Error:", error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error("อีเมลนี้มีอยู่ในระบบแล้ว (อาจเป็นพนักงานเก่า หรือทำงานที่อื่น)");
      }
      throw error;
    } finally {
      // 🟢 5. ทำลายแอปเงาทิ้ง (Cleanup)
      if (secondaryApp) {
        // ใน Firebase v9+ ตัว SDK จะจัดการ cleanup บางส่วนให้ แต่ถ้าจะให้ชัวร์ deleteApp() ก็ได้
        // secondaryApp.delete(); (ถ้า import มา)
      }
    }
  }

  // --- 3. LOGIN / LOGOUT ---
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  // --- 4. OBSERVER ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // ดึงข้อมูล Role และ CompanyId มาแปะเพิ่ม
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setCurrentUser({ ...user, ...docSnap.data() }); 
          } else {
            setCurrentUser(user);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signupOwner, // ✅ Export ชื่อนี้ให้ตรงกับที่หน้า Signup เรียกใช้
    login,
    logout,
    createEmployee, // ✅ ยังอยู่ครบ
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}