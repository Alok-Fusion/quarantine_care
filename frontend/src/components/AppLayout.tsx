'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { NotificationsResponse, NotificationItem } from '../types';
import {
  Activity,
  LogOut,
  Bell,
  CheckCheck,
  Bed,
  Stethoscope,
  ClipboardList,
  Menu,
  X,
  ChevronRight,
  Sun,
  Moon,
  Shield,
  HeartPulse,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { staff, role, logout } = useAuth();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!staff) return;
    try {
      const data = await api.get<NotificationsResponse>('/api/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      // Polling catch
    }
  }, [staff]);

  useEffect(() => {
    if (!staff) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [staff, fetchNotifications]);

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
      console.error('Failed to mark read', err);
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

  if (!staff) {
    return <div className="min-h-screen bg-bg text-text">{children}</div>;
  }

  // Navigation Items according to role
  const navLinks = [];
  if (role === 'nurse') {
    navLinks.push(
      { label: 'Patient Vitals', href: '/nurse', icon: <ClipboardList className="w-4 h-4" /> },
      { label: 'Bed Map & Admission', href: '/admit', icon: <Bed className="w-4 h-4" /> }
    );
  } else if (role === 'doctor') {
    navLinks.push(
      { label: 'Clinical Rounds', href: '/doctor', icon: <Stethoscope className="w-4 h-4" /> }
    );
  } else if (role === 'admin') {
    navLinks.push(
      { label: 'Facility Dashboard', href: '/admin', icon: <Activity className="w-4 h-4" /> },
      { label: 'Bed Map & Admission', href: '/admit', icon: <Bed className="w-4 h-4" /> }
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row antialiased selection:bg-accent/20">
      {/* Mobile Topbar */}
      <header className="md:hidden flex items-center justify-between px-4 h-14 bg-panel border-b border-border sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 text-text-muted hover:text-text rounded-md border border-border bg-subpanel transition-colors"
            aria-label="Toggle Navigation"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <HeartPulse className="w-4 h-4 text-accent" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-text">
              Quarantine<span className="text-accent">Care</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5" ref={dropdownRef}>
          <button
            onClick={toggleTheme}
            className="p-1.5 text-text-muted hover:text-text rounded-md border border-border bg-subpanel transition-all"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
          </button>

          <button
            onClick={() => {
              setIsDropdownOpen(!isDropdownOpen);
              fetchNotifications();
            }}
            className="relative p-1.5 text-text-muted hover:text-text rounded-md border border-border bg-subpanel transition-all"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-status-fever text-white text-[10px] font-mono font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={logout}
            className="p-1.5 text-text-muted hover:text-status-fever rounded-md border border-border bg-subpanel transition-all"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Slideout Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-panel border-b border-border p-4 space-y-3 z-30 sticky top-14">
          <div className="text-xs text-text-muted pb-3 border-b border-border flex items-center justify-between font-mono">
            <span className="font-semibold text-text">{staff.name}</span>
            <span className="px-2 py-0.5 rounded bg-subpanel border border-border text-text-muted font-bold text-[11px] uppercase">
              {staff.staffId} • {role}
            </span>
          </div>
          <nav className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md border transition-all ${
                  pathname === link.href
                    ? 'bg-accent/10 border-accent/30 text-accent font-semibold'
                    : 'border-transparent text-text-muted hover:text-text hover:bg-subpanel'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-col bg-panel border-r border-border shrink-0 min-h-screen sticky top-0 h-screen z-20">
        {/* Brand Header */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <HeartPulse className="w-4 h-4 text-accent" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-text block">
                  Quarantine<span className="text-accent">Care</span>
                </span>
                <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider block">Clinical Portal</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-status-stable/10 border border-status-stable/20 text-[10px] font-mono font-medium text-status-stable">
              <span className="w-1.5 h-1.5 rounded-full bg-status-stable" />
              <span>Ward Online</span>
            </div>
          </div>

          {/* User Account / Role Badge */}
          <div className="p-2.5 rounded-lg bg-subpanel border border-border flex items-center justify-between">
            <div className="truncate pr-2">
              <div className="font-semibold text-text text-xs truncate">{staff.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-mono font-medium uppercase px-1.5 py-0.5 rounded bg-panel border border-border text-text-muted">
                  {role}
                </span>
                <span className="text-[11px] font-mono text-text-muted tabular-nums">{staff.staffId}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={toggleTheme}
                className="p-1.5 text-text-muted hover:text-text hover:bg-panel rounded border border-transparent hover:border-border transition-all"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-blue-500" />}
              </button>

              <button
                onClick={logout}
                className="p-1.5 text-text-muted hover:text-status-fever hover:bg-alert rounded border border-transparent hover:border-border transition-all"
                title="Sign Out"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-3 px-2 space-y-1">
          <div className="px-2.5 py-1 text-[10px] uppercase font-mono font-semibold text-text-muted tracking-wider">
            Clinical Modules
          </div>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all group ${
                  isActive
                    ? 'bg-accent/10 text-accent font-semibold border border-accent/20'
                    : 'text-text-muted hover:text-text hover:bg-subpanel border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={isActive ? 'text-accent' : 'text-text-muted group-hover:text-text'}>
                    {link.icon}
                  </div>
                  <span>{link.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-accent opacity-80" />}
              </Link>
            );
          })}
        </div>

        {/* Bottom Sidebar: Notifications */}
        <div className="p-3 border-t border-border bg-panel" ref={dropdownRef}>
          <div className="relative">
            <button
              onClick={() => {
                setIsDropdownOpen(!isDropdownOpen);
                fetchNotifications();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-text-muted hover:text-text bg-subpanel hover:bg-subpanel/80 border border-border rounded-lg transition-all"
            >
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-text-muted" />
                <span className="font-medium">Ward Alerts</span>
              </div>
              {unreadCount > 0 ? (
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-status-fever text-white">
                  {unreadCount}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-text-muted">0</span>
              )}
            </button>

            {/* Notification Dropdown Drawer */}
            {isDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-72 bg-panel border border-border rounded-xl z-50 overflow-hidden shadow-xl">
                <div className="p-2.5 border-b border-border bg-subpanel flex items-center justify-between text-xs">
                  <span className="font-semibold text-text font-mono flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-accent" />
                    <span>ALERTS ({unreadCount})</span>
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] text-accent hover:underline flex items-center gap-1 font-mono"
                    >
                      <CheckCheck className="w-3 h-3" />
                      <span>Clear all</span>
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-border">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-text-muted text-xs font-mono">
                      No active ward alerts
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item._id}
                        onClick={(e) => !item.read && handleMarkAsRead(item._id, e)}
                        className={`p-2.5 text-xs transition-all cursor-pointer ${
                          item.read
                            ? 'text-text-muted hover:bg-subpanel opacity-60'
                            : 'bg-accent/5 text-text font-medium border-l-2 border-l-accent hover:bg-accent/10'
                        }`}
                      >
                        <p className="leading-snug text-xs">{item.message}</p>
                        <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-text-muted">
                          <span>
                            {new Date(item.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {!item.read && (
                            <button
                              onClick={(e) => handleMarkAsRead(item._id, e)}
                              className="text-accent hover:underline"
                            >
                              mark read
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
