'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Activity, ArrowRight, Loader2, KeyRound } from 'lucide-react';

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
      showToast('Session expired. Please sign in again.', 'warning');
    }
  }, [staff, role, router, searchParams, showToast]);

  const handleSubmit = async (e: React.FormEvent, customId?: string) => {
    if (e) e.preventDefault();
    const idToUse = customId || staffIdInput;

    if (!idToUse.trim()) {
      setErrorMessage('Staff ID is required');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const loggedInStaff = await login(idToUse);
      showToast(
        `Signed in as ${loggedInStaff.name}`,
        'info'
      );
    } catch (err: any) {
      console.error('Login error', err);
      const msg = err.data?.error || err.message || 'Invalid Staff ID';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (quickId: string) => {
    setStaffIdInput(quickId);
    handleSubmit({ preventDefault: () => {} } as React.FormEvent, quickId);
  };

  return (
    <div className="w-full max-w-sm">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-[2px] bg-panel border border-border flex items-center justify-center font-bold text-xs text-text">
            QC
          </div>
          <span className="text-xs font-mono tracking-wider text-text-muted uppercase">
            Quarantine Care
          </span>
        </div>
        <h1 className="text-lg font-bold text-text tracking-tight">
          Staff Authentication
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          Enter your assigned Staff ID key to access clinical modules.
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-panel border border-border p-5 rounded-[4px] space-y-4">
        <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
          <div>
            <label
              htmlFor="staffId"
              className="block text-xs font-medium text-text-muted mb-1.5"
            >
              Staff ID
            </label>
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
              className="w-full bg-ink border border-border focus:border-text-muted text-text rounded-[3px] px-3 py-2 text-sm font-mono tracking-wider placeholder:font-sans placeholder:tracking-normal placeholder:text-text-muted/60 transition-colors outline-none"
            />

            {errorMessage && (
              <div className="mt-1.5 text-xs text-status-fever font-mono flex items-center gap-1">
                <span>[!]</span>
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !staffIdInput.trim()}
            className="w-full bg-btn hover:bg-btn-hover active:bg-btn-active border border-border disabled:opacity-50 text-text font-medium rounded-[3px] py-2 px-3 flex items-center justify-center gap-2 transition-colors text-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying ID...</span>
              </>
            ) : (
              <>
                <span>Authenticate</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Prototype Quick Access */}
        <div className="pt-4 border-t border-border space-y-2">
          <div className="text-[10px] font-mono text-text-muted uppercase">
            Quick ID Access (Seeded Roles)
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('N001')}
              disabled={isSubmitting}
              className="px-2 py-1.5 rounded-[2px] border border-border bg-ink hover:bg-panel-hover text-left transition-colors"
            >
              <div className="font-mono text-xs font-bold text-text">N001</div>
              <div className="text-[10px] text-text-muted">Nurse</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('D001')}
              disabled={isSubmitting}
              className="px-2 py-1.5 rounded-[2px] border border-border bg-ink hover:bg-panel-hover text-left transition-colors"
            >
              <div className="font-mono text-xs font-bold text-text">D001</div>
              <div className="text-[10px] text-text-muted">Doctor</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('A001')}
              disabled={isSubmitting}
              className="px-2 py-1.5 rounded-[2px] border border-border bg-ink hover:bg-panel-hover text-left transition-colors"
            >
              <div className="font-mono text-xs font-bold text-text">A001</div>
              <div className="text-[10px] text-text-muted">Admin</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="text-text-muted text-xs font-mono">
            Loading authentication module...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
