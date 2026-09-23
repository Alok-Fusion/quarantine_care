'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Loader2,
  AlertTriangle,
  ArrowRight,
  Sun,
  Moon,
  HeartPulse,
  Activity,
  Stethoscope,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export default function LoginPage() {
  const [staffId, setStaffId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();

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
      showToast(`Signed in as ${loggedInStaff.name} (${loggedInStaff.role.toUpperCase()})`, 'info');
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
    <div className="min-h-screen bg-bg text-text flex items-center justify-center p-4 antialiased relative">
      {/* Top Corner Theme Switcher */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          className="px-3 py-1.5 rounded-lg bg-panel hover:bg-subpanel text-text-muted hover:text-text border border-border transition-all flex items-center gap-2 text-xs font-mono"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-blue-500" />}
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </div>

      <div className="max-w-md w-full space-y-5 z-10">
        {/* Branding */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-xs font-mono text-accent mb-1 font-medium">
            <HeartPulse className="w-3.5 h-3.5 text-accent" />
            <span>QuarantineCare Hospital System</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            Staff Access Terminal
          </h1>
          <p className="text-xs text-text-muted max-w-xs mx-auto leading-relaxed">
            Enter your assigned staff credential key to access ward records.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-panel rounded-xl p-6 space-y-4 border border-border shadow-md">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-alert border border-status-fever/30 text-xs text-text flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-status-fever shrink-0 mt-0.5" />
              <span className="font-mono">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-mono uppercase text-text-muted mb-1.5 font-semibold tracking-wider">
                Staff ID Key
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
                  className="w-full bg-input border border-border focus:border-accent text-text rounded-lg px-3.5 py-2.5 text-sm font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-accent transition-all placeholder:text-text-muted/40 uppercase"
                />
                <UserCheck className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !staffId.trim()}
              className="w-full bg-btn hover:bg-btn-hover disabled:opacity-50 text-white font-semibold font-mono py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-xs transition-all shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Validating Key...</span>
                </>
              ) : (
                <>
                  <span>Authenticate & Enter</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Roles */}
          <div className="pt-3.5 border-t border-border space-y-2">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block font-semibold">
              Select Demo Persona
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('N001')}
                className="p-2.5 rounded-lg bg-subpanel hover:bg-subpanel/70 border border-border hover:border-accent/40 text-left transition-all"
              >
                <div className="flex items-center justify-between text-xs font-mono font-bold text-text">
                  <span>N001</span>
                  <Activity className="w-3.5 h-3.5 text-accent" />
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">Nurse</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('D001')}
                className="p-2.5 rounded-lg bg-subpanel hover:bg-subpanel/70 border border-border hover:border-accent/40 text-left transition-all"
              >
                <div className="flex items-center justify-between text-xs font-mono font-bold text-text">
                  <span>D001</span>
                  <Stethoscope className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">Doctor</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('A001')}
                className="p-2.5 rounded-lg bg-subpanel hover:bg-subpanel/70 border border-border hover:border-accent/40 text-left transition-all"
              >
                <div className="flex items-center justify-between text-xs font-mono font-bold text-text">
                  <span>A001</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-status-stable" />
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">Admin</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] font-mono text-text-muted flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-status-stable" />
          <span>74-Bed High-Acuity Isolation Facility</span>
        </div>
      </div>
    </div>
  );
}
