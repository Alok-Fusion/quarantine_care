'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { NotificationsResponse, NotificationItem } from '../types';
import {
  Activity,
  LogOut,
  Bell,
  Check,
  CheckCheck,
  Bed,
  Users,
  Stethoscope,
  ClipboardList,
  UserPlus,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { staff, role, logout } = useAuth();
  const { showToast } = useToast();
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
      // Polling error
    }
  }, [staff]);

  useEffect(() => {
    if (!staff) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
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
    return <div className="min-h-screen bg-ink">{children}</div>;
  }

  // Navigation Items according to role
  const navLinks = [];
  if (role === 'nurse') {
    navLinks.push(
      { label: 'Patient Vitals', href: '/nurse', icon: <ClipboardList className="w-4 h-4" /> },
      { label: 'Admit Patient & Bed Map', href: '/admit', icon: <Bed className="w-4 h-4" /> }
    );
  } else if (role === 'doctor') {
    navLinks.push(
      { label: 'Clinical Rounds', href: '/doctor', icon: <Stethoscope className="w-4 h-4" /> }
    );
  } else if (role === 'admin') {
    navLinks.push(
      { label: 'Facility Dashboard', href: '/admin', icon: <Activity className="w-4 h-4" /> },
      { label: 'Admit Patient & Bed Map', href: '/admit', icon: <Bed className="w-4 h-4" /> }
    );
  }

  return (
    <div className="min-h-screen bg-ink text-text flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <header className="md:hidden flex items-center justify-between px-4 h-14 bg-panel border-b border-border sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 text-text-muted hover:text-text rounded-[3px] border border-border bg-ink"
            aria-label="Toggle Navigation"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <span className="font-semibold text-sm tracking-tight text-text">
            Quarantine Care
          </span>
          <span className="text-[11px] font-mono text-text-muted uppercase px-1.5 py-0.5 bg-ink border border-border">
            {role}
          </span>
        </div>

        <div className="flex items-center gap-2" ref={dropdownRef}>
          <button
            onClick={() => {
              setIsDropdownOpen(!isDropdownOpen);
              fetchNotifications();
            }}
            className="relative p-1.5 text-text-muted hover:text-text rounded-[3px] border border-border bg-ink"
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
            className="p-1.5 text-text-muted hover:text-text rounded-[3px] border border-border bg-ink text-xs"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Slideout Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-panel border-b border-border p-4 space-y-3 z-30 sticky top-14">
          <div className="text-xs text-text-muted pb-2 border-b border-border flex items-center justify-between">
            <span>{staff.name}</span>
            <span className="font-mono text-[11px]">{staff.staffId}</span>
          </div>
          <nav className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-[3px] border ${
                  pathname === link.href
                    ? 'bg-ink border-border text-text font-semibold'
                    : 'border-transparent text-text-muted hover:text-text hover:bg-ink/50'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Desktop Left Sidebar (Persistent across all dashboards) */}
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-col bg-panel border-r border-border shrink-0 min-h-screen sticky top-0 h-screen">
        {/* Top Header: Role name + Logout */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-[2px] bg-ink border border-border flex items-center justify-center text-text font-bold text-xs">
                QC
              </div>
              <span className="font-bold text-xs tracking-tight uppercase text-text">
                Quarantine Care
              </span>
            </div>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 border border-border text-text-muted bg-ink">
              {role}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 text-xs border-t border-border/60">
            <div className="truncate pr-2">
              <div className="font-medium text-text text-xs truncate">{staff.name}</div>
              <div className="text-[11px] font-mono text-text-muted">{staff.staffId}</div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 text-text-muted hover:text-text hover:bg-ink rounded-[2px] border border-border transition-colors shrink-0"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-4 px-2 space-y-1">
          <div className="px-2 pb-2 text-[10px] uppercase font-semibold text-text-muted tracking-wider">
            Navigation
          </div>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between px-3 py-2 text-xs rounded-[3px] border transition-colors ${
                  isActive
                    ? 'bg-ink border-border text-text font-semibold'
                    : 'border-transparent text-text-muted hover:text-text hover:bg-ink/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {link.icon}
                  <span>{link.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3 h-3 text-text-muted" />}
              </Link>
            );
          })}
        </div>

        {/* Bottom Sidebar: Notifications Box */}
        <div className="p-3 border-t border-border bg-panel" ref={dropdownRef}>
          <div className="relative">
            <button
              onClick={() => {
                setIsDropdownOpen(!isDropdownOpen);
                fetchNotifications();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-text-muted hover:text-text bg-ink border border-border rounded-[3px] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5" />
                <span>Notifications</span>
              </div>
              {unreadCount > 0 ? (
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-status-fever text-white">
                  {unreadCount}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-text-muted">0</span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-72 lg:w-80 bg-panel border border-border rounded-[3px] z-50 overflow-hidden">
                <div className="p-2.5 border-b border-border bg-ink flex items-center justify-between text-xs">
                  <span className="font-semibold text-text">Notifications ({unreadCount} unread)</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] text-text-muted hover:text-text flex items-center gap-1 font-mono"
                    >
                      <CheckCheck className="w-3 h-3" />
                      <span>Read all</span>
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-border/60">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-text-muted text-xs">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item._id}
                        onClick={(e) => !item.read && handleMarkAsRead(item._id, e)}
                        className={`p-2.5 text-xs transition-colors cursor-pointer ${
                          item.read
                            ? 'text-text-muted hover:bg-ink/50'
                            : 'bg-ink/80 text-text font-medium border-l-2 border-text hover:bg-ink'
                        }`}
                      >
                        <p className="leading-snug">{item.message}</p>
                        <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-text-muted">
                          <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {!item.read && (
                            <button
                              onClick={(e) => handleMarkAsRead(item._id, e)}
                              className="hover:text-text"
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
      <main className="flex-1 bg-ink min-w-0 flex flex-col">
        {children}
      </main>
    </div>
  );
}
