'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api, ApiError } from '../../lib/api';
import { LoginResponse } from '../../types';
import {
  Shield,
  KeyRound,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Stethoscope,
  Activity,
  ClipboardList,
} from 'lucide-react';

export default function LoginPage() {
  const [staffId, setStaffId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId.trim()) {
      setErrorMsg('Please enter your Staff ID');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      const loggedInStaff = await login(staffId.trim());
      showToast(`Welcome, ${loggedInStaff.name} (${loggedInStaff.role.toUpperCase()})`, 'info');
    } catch (err: any) {
      console.error('Login error', err);
      const msg = err.data?.error || err.message || 'Invalid Staff ID. Account not found.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (id: string) => {
    setStaffId(id);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-ink text-text flex items-center justify-center p-4 antialiased">
      <div className="max-w-md w-full space-y-5">
        {/* Terminal Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[2px] bg-panel border border-border text-[11px] font-mono text-text-muted mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-status-stable" />
            <span>QUARANTINE SURVEILLANCE SYSTEM</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text font-mono">
            Clinical Access Terminal
          </h1>
          <p className="text-xs text-text-muted">
            Enter assigned Staff ID to authenticate clinical session.
          </p>
        </div>

        {/* Login Panel */}
        <div className="bg-panel border border-border rounded-[3px] p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-[3px] bg-[#2A1E24] border-l-3 border-l-status-fever border border-border text-xs text-text flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-status-fever shrink-0 mt-0.5" />
              <span className="font-mono">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-text-muted mb-1.5 font-semibold">
                Staff ID (Login Key)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  value={staffId}
                  onChange={(e) => {
                    setStaffId(e.target.value.toUpperCase());
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="e.g. N001, D001, A001"
                  disabled={isLoading}
                  className="w-full bg-[#0B1118] border border-border focus:border-[#4E677E] text-text rounded-[3px] px-3.5 py-2.5 text-sm font-mono tracking-wider focus:outline-none transition-colors placeholder:text-text-muted/40 uppercase"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !staffId.trim()}
              className="w-full bg-[#233546] hover:bg-[#2F4458] disabled:opacity-50 text-text font-bold font-mono py-2.5 px-4 rounded-[3px] border border-border flex items-center justify-center gap-2 text-xs transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Authenticate Session</span>
                  <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
                </>
              )}
            </button>
          </form>

          {/* Demo Staff ID Selector */}
          <div className="pt-3 border-t border-border space-y-2">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block">
              Quick Prototype Credentials
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('N001')}
                className="p-2 rounded-[3px] bg-[#0B1118] border border-border hover:border-[#4E677E] text-left transition-colors"
              >
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-text">
                  <span>N001</span>
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">Nurse</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('D001')}
                className="p-2 rounded-[3px] bg-[#0B1118] border border-border hover:border-[#4E677E] text-left transition-colors"
              >
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-text">
                  <span>D001</span>
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">Doctor</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('A001')}
                className="p-2 rounded-[3px] bg-[#0B1118] border border-border hover:border-[#4E677E] text-left transition-colors"
              >
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-text">
                  <span>A001</span>
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">Admin</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-[11px] font-mono text-text-muted">
          Quarantine Care Management Suite • Bedside Clinical Prototype
        </div>
      </div>
    </div>
  );
}
