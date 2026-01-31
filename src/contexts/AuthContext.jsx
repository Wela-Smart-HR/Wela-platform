import React, { createContext, useContext } from 'react';
import { useAuth as useAuthHook } from '@/features/auth/useAuth';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  // ใช้ useAuth hook จาก features/auth แทนการเขียน logic เองทั้งหมด
  const auth = useAuthHook();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}