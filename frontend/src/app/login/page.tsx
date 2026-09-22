'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Activity, ShieldCheck, HeartPulse, Stethoscope, ArrowRight, Loader2, KeyRound } from 'lucide-react';

function LoginForm() {
  const [staffIdInput, setStaffIdInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { staff, role, login } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (staff && role) {
      const routes: Record<string, string> = {
        nurse: '/nurse',
        doctor: '/doctor',
        admin: '/admin',
      };
      router.replace(routes[role] || '/nurse');
    }

    if (searchParams.get('expired') === 'true') {
      showToast('Your session has expired. Please sign in again.', 'warning', 'Session Expired');
    }
  }, [staff, role, router, searchParams, showToast]);

  const handleSubmit = async (e: React.FormEvent, customId?: string) => {
    if (e) e.preventDefault();
    const idToUse = customId || staffIdInput;

    if (!idToUse.trim()) {
      setErrorMessage('Please enter your Staff ID to proceed');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const loggedInStaff = await login(idToUse);
      showToast(
        `Welcome back, ${loggedInStaff.name}`,
        'success',
        `${loggedInStaff.role.toUpperCase()} ACCESS GRANTED`
      );
    } catch (err: any) {
      console.error('Login error', err);
      const msg = err.data?.error || err.message || 'Invalid Staff ID. Access denied.';
      setErrorMessage(msg);
      showToast(msg, 'error', 'Authentication Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (quickId: string) => {
    setStaffIdInput(quickId);
    handleSubmit({ preventDefault: () => {} } as React.FormEvent, quickId);
  };

  return (
    <div className="w-full max-w-md">
      {/* Header Branding */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 shadow-xl shadow-emerald-950/50 mb-4 border border-emerald-400/20">
          <Activity className="w-8 h-8 text-white animate-pulse" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          Quarantine<span className="text-emerald-400">Care</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Clinical Bedside & Isolation Monitoring Portal
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl shadow-slate-950/80">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-400" />
            Staff Authentication
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Enter your assigned clinical ID key to open your role dashboard.
          </p>
        </div>

        <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
          <div>
            <label
              htmlFor="staffId"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
            >
              Staff ID
            </label>
            <div className="relative">
              <input
                id="staffId"
                type="text"
                value={staffIdInput}
                onChange={(e) => {
                  setStaffIdInput(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="e.g. N001, D001, A001"
                autoCapitalize="characters"
                autoComplete="off"
                disabled={isSubmitting}
                className="w-full bg-slate-950/80 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-100 rounded-xl px-4 py-3 text-base uppercase font-mono tracking-widest placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-500 transition-all outline-none"
              />
            </div>

            {errorMessage && (
              <div className="mt-2 text-xs font-medium text-rose-400 flex items-center gap-1.5 animate-fadeIn">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" />
                {errorMessage}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !staffIdInput.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 px-4 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Access Pills */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
            Quick Prototype Access (Seeded Roles)
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('N001')}
              disabled={isSubmitting}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 hover:bg-emerald-900/30 hover:border-emerald-500/40 text-emerald-300 transition-all text-center group"
            >
              <HeartPulse className="w-4 h-4 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold font-mono">N001</span>
              <span className="text-[10px] text-emerald-400/80">Nurse</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('D001')}
              disabled={isSubmitting}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-sky-500/20 bg-sky-950/20 hover:bg-sky-900/30 hover:border-sky-500/40 text-sky-300 transition-all text-center group"
            >
              <Stethoscope className="w-4 h-4 text-sky-400 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold font-mono">D001</span>
              <span className="text-[10px] text-sky-400/80">Doctor</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('A001')}
              disabled={isSubmitting}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-amber-500/20 bg-amber-950/20 hover:bg-amber-900/30 hover:border-amber-500/40 text-amber-300 transition-all text-center group"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold font-mono">A001</span>
              <span className="text-[10px] text-amber-400/80">Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <p className="text-center text-xs text-slate-500 mt-6">
        Quarantine Care Management Engine • Prototype Build
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <Suspense
        fallback={
          <div className="flex flex-col items-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
            <p className="text-xs">Loading login interface...</p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
