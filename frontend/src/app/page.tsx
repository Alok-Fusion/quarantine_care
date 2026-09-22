'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const { staff, role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!staff || !role) {
      router.replace('/login');
    } else {
      const routes: Record<string, string> = {
        nurse: '/nurse',
        doctor: '/doctor',
        admin: '/admin',
      };
      router.replace(routes[role] || '/login');
    }
  }, [staff, role, isLoading, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
      <p className="text-sm font-medium tracking-wide">Loading Quarantine Care...</p>
    </div>
  );
}
