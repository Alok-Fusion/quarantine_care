'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Staff, StaffRole } from '../types';
import { api, ApiError } from '../lib/api';

interface AuthContextType {
  staff: Staff | null;
  role: StaffRole | null;
  isLoading: boolean;
  login: (staffId: string) => Promise<Staff>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('quarantine_care_staff');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.staffId && parsed.role) {
          setStaff(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading staff from localStorage', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (staffId: string): Promise<Staff> => {
    const cleanId = staffId.trim().toUpperCase();
    const data = await api.post<Staff>('/api/login', { staffId: cleanId });

    const staffData: Staff = {
      staffId: data.staffId,
      name: data.name,
      role: data.role,
    };

    localStorage.setItem('quarantine_care_staff', JSON.stringify(staffData));
    setStaff(staffData);

    // Redirect to the matching role dashboard
    const roleRoutes: Record<StaffRole, string> = {
      nurse: '/nurse',
      doctor: '/doctor',
      admin: '/admin',
    };

    router.push(roleRoutes[staffData.role] || '/nurse');
    return staffData;
  };

  const logout = () => {
    localStorage.removeItem('quarantine_care_staff');
    setStaff(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        staff,
        role: staff ? staff.role : null,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
