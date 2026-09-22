'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StaffRole } from '../types';
import { Loader2 } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: StaffRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { staff, role, isLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!staff || !role) {
      router.push('/login');
      return;
    }

    if (!allowedRoles.includes(role)) {
      showToast('Not authorized for this view.', 'warning', 'Access Restricted');

      const roleHome: Record<StaffRole, string> = {
        nurse: '/nurse',
        doctor: '/doctor',
        admin: '/admin',
      };

      router.replace(roleHome[role] || '/login');
    }
  }, [staff, role, isLoading, allowedRoles, router, showToast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
        <p className="text-sm font-medium tracking-wide">Authenticating staff session...</p>
      </div>
    );
  }

  if (!staff || !role || !allowedRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
}
