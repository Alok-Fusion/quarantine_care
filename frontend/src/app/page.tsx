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
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center text-text-muted">
      <Loader2 className="w-6 h-6 animate-spin text-text-muted mb-3" />
      <p className="text-xs font-mono">Loading Quarantine Care...</p>
    </div>
  );
}
