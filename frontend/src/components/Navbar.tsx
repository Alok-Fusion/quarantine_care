'use client';

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, LogOut, Shield, Stethoscope, HeartPulse, User } from 'lucide-react';
import Link from 'next/link';

export function Navbar() {
  const { staff, role, logout } = useAuth();

  if (!staff) return null;

  const roleStyles = {
    nurse: {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />,
      label: 'NURSE DESK',
    },
    doctor: {
      badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      icon: <Stethoscope className="w-3.5 h-3.5 text-sky-400" />,
      label: 'PHYSICIAN PORTAL',
    },
    admin: {
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: <Shield className="w-3.5 h-3.5 text-amber-400" />,
      label: 'ADMIN COMMAND',
    },
  };

  const currentRole = role ? roleStyles[role] : null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 tracking-tight text-base sm:text-lg">
                Quarantine<span className="text-emerald-400">Care</span>
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Clinical Isolation & Vital Tracking</p>
          </div>
        </div>

        {/* Right: User Info, Role Badge & Logout */}
        <div className="flex items-center gap-2 sm:gap-4">
          {currentRole && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${currentRole.badge}`}
            >
              {currentRole.icon}
              <span className="tracking-wide">{currentRole.label}</span>
            </div>
          )}

          <div className="hidden md:flex flex-col items-end text-right">
            <span className="text-sm font-medium text-slate-200">{staff.name}</span>
            <span className="text-[11px] font-mono text-slate-400">ID: {staff.staffId}</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 hover:bg-rose-950/50 hover:text-rose-300 hover:border-rose-500/40 border border-slate-800 transition-all"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
