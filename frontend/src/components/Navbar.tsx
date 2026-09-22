'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { NotificationsResponse, NotificationItem } from '../types';
import {
  Activity,
  LogOut,
  Shield,
  Stethoscope,
  HeartPulse,
  Bell,
  Check,
  CheckCheck,
  Clock,
  UserPlus,
  Bed,
  Sparkles,
  ShieldAlert,
  Flame,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const { staff, role, logout } = useAuth();
  const { showToast } = useToast();
  const pathname = usePathname();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!staff) return;
    try {
      const data = await api.get<NotificationsResponse>('/api/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      // Polling error silently handled
    }
  }, [staff]);

  // Polling every 20 seconds
  useEffect(() => {
    if (!staff) return;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);

    return () => clearInterval(interval);
  }, [staff, fetchNotifications]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      showToast('All notifications marked as read', 'info');
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  if (!staff) return null;

  const roleStyles = {
    nurse: {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />,
      label: 'NURSE DESK',
      home: '/nurse',
    },
    doctor: {
      badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      icon: <Stethoscope className="w-3.5 h-3.5 text-sky-400" />,
      label: 'PHYSICIAN',
      home: '/doctor',
    },
    admin: {
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: <Shield className="w-3.5 h-3.5 text-amber-400" />,
      label: 'ADMIN',
      home: '/admin',
    },
  };

  const currentRole = role ? roleStyles[role] : null;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new-patient':
        return <UserPlus className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
      case 'discharge-eligible':
        return <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />;
      case 'mortality-alert':
        return <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />;
      default:
        return <Activity className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Navigation */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href={currentRole?.home || '/'}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/50 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-100 tracking-tight text-base sm:text-lg">
                  Quarantine<span className="text-emerald-400">Care</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  LIVE
                </span>
              </div>
            </div>
          </Link>

          {/* Nav Links for Nurse / Admin */}
          {(role === 'nurse' || role === 'admin') && (
            <nav className="hidden md:flex items-center gap-2">
              <Link
                href={role === 'nurse' ? '/nurse' : '/admin'}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  pathname === '/nurse' || pathname === '/admin'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/admit"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  pathname === '/admit'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-400 hover:bg-emerald-950/40 border border-emerald-500/20'
                }`}
              >
                <Bed className="w-3.5 h-3.5" />
                <span>Admit Patient & 74-Bed Map</span>
              </Link>
            </nav>
          )}

          {role === 'doctor' && (
            <nav className="hidden md:flex items-center gap-2">
              <Link
                href="/doctor"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  pathname === '/doctor'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                Rounds Portal
              </Link>
            </nav>
          )}
        </div>

        {/* Right: Notifications, Role Badge & User Info */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notification Bell Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(!isDropdownOpen);
                fetchNotifications();
              }}
              className="relative p-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-300 transition-all hover:border-slate-700"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-slate-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-md animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden z-50 animate-fadeIn">
                <div className="p-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                      Staff Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {unreadCount} new
                      </span>
                    )}
                  </div>

                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors font-medium"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item._id}
                        onClick={(e) => !item.read && handleMarkAsRead(item._id, e)}
                        className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                          item.read
                            ? 'bg-slate-900/40 text-slate-400 hover:bg-slate-900/70'
                            : 'bg-slate-950/80 text-slate-200 hover:bg-slate-950 border-l-2 border-emerald-500'
                        }`}
                      >
                        {getNotificationIcon(item.type)}
                        <div className="flex-1 text-xs">
                          <p className={`leading-relaxed ${item.read ? 'opacity-80' : 'font-semibold text-slate-100'}`}>
                            {item.message}
                          </p>
                          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-mono">
                            <span>
                              {new Date(item.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {!item.read && (
                              <button
                                onClick={(e) => handleMarkAsRead(item._id, e)}
                                className="text-emerald-400 hover:underline flex items-center gap-0.5"
                              >
                                <Check className="w-3 h-3" />
                                <span>Mark read</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {currentRole && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${currentRole.badge}`}
            >
              {currentRole.icon}
              <span className="tracking-wide hidden xs:inline">{currentRole.label}</span>
            </div>
          )}

          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-xs font-medium text-slate-200">{staff.name}</span>
            <span className="text-[10px] font-mono text-slate-400">{staff.staffId}</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-900 hover:bg-rose-950/50 hover:text-rose-300 hover:border-rose-500/40 border border-slate-800 transition-all"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
