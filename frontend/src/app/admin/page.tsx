'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '../../components/Navbar';
import { RoleGuard } from '../../components/RoleGuard';
import { Modal } from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { api, ApiError } from '../../lib/api';
import { FacilityStats, Patient, Staff, StaffRole } from '../../types';
import {
  ShieldAlert,
  Users,
  Bed,
  HeartCrack,
  Activity,
  Award,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  TrendingUp,
  UserCheck,
  Shield,
  Loader2,
  UserPlus,
  Copy,
  Check,
  ToggleLeft,
  ToggleRight,
  Stethoscope,
  HeartPulse,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'metrics' | 'staff' | 'queue'>('metrics');

  // Metrics state
  const [stats, setStats] = useState<FacilityStats | null>(null);
  const [dischargeQueue, setDischargeQueue] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Staff management state
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>('nurse');
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);

  // New Staff Created Modal (Copyable Staff ID)
  const [createdStaffInfo, setCreatedStaffInfo] = useState<{
    staffId: string;
    name: string;
    role: StaffRole;
  } | null>(null);
  const [hasCopiedId, setHasCopiedId] = useState(false);

  const { showToast } = useToast();

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, queueData] = await Promise.all([
        api.get<FacilityStats>('/api/stats'),
        api.get<Patient[]>('/api/patients/discharge-queue'),
      ]);
      setStats(statsData);
      setDischargeQueue(queueData);
    } catch (err: any) {
      console.error('Admin fetch error', err);
      showToast(err.message || 'Error fetching facility statistics', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const fetchStaffList = useCallback(async () => {
    setIsLoadingStaff(true);
    try {
      const data = await api.get<Staff[]>('/api/staff');
      setStaffList(data);
    } catch (err: any) {
      console.error('Fetch staff error', err);
      showToast(err.message || 'Error loading staff directory', 'error');
    } finally {
      setIsLoadingStaff(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaffList();
    }
  }, [activeTab, fetchStaffList]);

  const handleToggleStaffActive = async (staffMember: Staff) => {
    if (!staffMember._id) return;
    const newStatus = !staffMember.active;

    try {
      await api.patch(`/api/staff/${staffMember._id}`, { active: newStatus });
      setStaffList((prev) =>
        prev.map((s) => (s._id === staffMember._id ? { ...s, active: newStatus } : s))
      );
      showToast(
        `Staff ${staffMember.staffId} (${staffMember.name}) ${newStatus ? 'activated' : 'deactivated'}`,
        newStatus ? 'success' : 'warning'
      );
    } catch (err: any) {
      console.error('Toggle staff error', err);
      showToast(err.data?.error || err.message || 'Failed to update staff status', 'error');
    }
  };

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) {
      showToast('Staff full name is required', 'warning');
      return;
    }

    setIsSubmittingStaff(true);
    try {
      const res = await api.post<{
        message: string;
        staffId: string;
        staff: Staff;
      }>('/api/staff', {
        name: newStaffName.trim(),
        role: newStaffRole,
      });

      setShowAddStaffModal(false);
      setNewStaffName('');
      setNewStaffRole('nurse');

      // Open copyable confirmation modal
      setCreatedStaffInfo({
        staffId: res.staffId,
        name: res.staff.name,
        role: res.staff.role,
      });
      setHasCopiedId(false);

      showToast(`Created staff account for ${res.staff.name}`, 'success', 'Staff Added');
      await fetchStaffList();
    } catch (err: any) {
      console.error('Create staff error', err);
      showToast(err.data?.error || err.message || 'Failed to create staff member', 'error');
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  const handleCopyStaffId = () => {
    if (!createdStaffInfo) return;
    navigator.clipboard.writeText(createdStaffInfo.staffId);
    setHasCopiedId(true);
    showToast(`Copied ${createdStaffInfo.staffId} to clipboard`, 'success');
    setTimeout(() => setHasCopiedId(false), 2500);
  };

  const capacity = stats?.capacity ?? 74;
  const occupied = stats?.occupied ?? 0;
  const occupancyPercent = Math.round((occupied / capacity) * 100);
  const mortalityPercent = stats ? (stats.mortalityRate * 100).toFixed(1) : '0';
  const successPercent = stats ? (stats.successRate * 100).toFixed(1) : '0';
  const hasMortalityAlert = stats?.mortalityAlert ?? false;

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider mb-1">
                <Shield className="w-4 h-4" /> Command & Operations Centre
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
                Facility Executive Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Monitor quarantine capacity, epidemic mortality thresholds, and manage staff accounts.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/admit"
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/50"
              >
                <Bed className="w-4 h-4" />
                <span>Admit Patient & Bed Map</span>
              </Link>

              <button
                onClick={() => {
                  fetchDashboardData();
                  if (activeTab === 'staff') fetchStaffList();
                }}
                disabled={isLoading}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all hover:border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* CRITICAL MORTALITY ALERT BANNER */}
          {hasMortalityAlert && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-950/90 to-red-950/80 border-2 border-rose-500/60 shadow-2xl shadow-rose-950/60 flex items-start gap-4 animate-pulse">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
                <ShieldAlert className="w-6 h-6 text-rose-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-rose-100 flex items-center gap-2">
                  <span>CRITICAL EPIDEMIC ALERT: High Mortality Rate</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500 text-white font-extrabold">
                    {mortalityPercent}%
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-rose-200/90 mt-1">
                  Facility mortality has crossed the safety threshold of{' '}
                  <span className="font-bold">15.0%</span>. Immediate epidemiological review is advised.
                </p>
              </div>
            </div>
          )}

          {/* Dashboard Tabs Bar */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'metrics'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Overview & Metrics</span>
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'staff'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Staff Management</span>
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'queue'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Discharge Queue ({dischargeQueue.length})</span>
            </button>
          </div>

          {/* TAB 1: METRICS OVERVIEW */}
          {activeTab === 'metrics' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Key Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Bed Capacity & Occupancy */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Bed Occupancy</span>
                      <Bed className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-100 font-mono">
                        {occupied}
                      </span>
                      <span className="text-sm font-semibold text-slate-400 font-mono">
                        / {capacity} beds
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1.5">
                      <span>Capacity Utilization</span>
                      <span className="font-mono text-emerald-400">{occupancyPercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Recovery Rate */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Recovery Rate</span>
                      <Award className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-emerald-400 font-mono">
                        {successPercent}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Target Benchmark:</span>
                    <span className="font-semibold text-slate-200">85.0% Standard</span>
                  </div>
                </div>

                {/* 3. Mortality Rate */}
                <div
                  className={`bg-slate-900/90 border rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between ${
                    hasMortalityAlert ? 'border-rose-500/50 bg-rose-950/20' : 'border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Mortality Rate</span>
                      <HeartCrack className="w-4 h-4 text-rose-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-3xl font-extrabold font-mono ${
                          hasMortalityAlert ? 'text-rose-400' : 'text-slate-100'
                        }`}
                      >
                        {mortalityPercent}%
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        ({stats?.deceasedCount ?? 0} deaths)
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Alert Threshold:</span>
                    <span className="font-semibold text-rose-400">&gt; 15.0% Limit</span>
                  </div>
                </div>

                {/* 4. Total Throughput */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Total Admitted</span>
                      <Users className="w-4 h-4 text-sky-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-100 font-mono">
                        {stats?.totalAdmitted ?? 0}
                      </span>
                      <span className="text-xs font-medium text-slate-400">Cases</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Discharged Recoveries:</span>
                    <span className="font-semibold text-emerald-400 font-mono">
                      {stats?.dischargedCount ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STAFF MANAGEMENT */}
          {activeTab === 'staff' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-fadeIn space-y-4 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    Staff Directory & Access Control
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Create new staff accounts (auto-generates unique Staff ID key) and manage active status.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddStaffModal(true)}
                  className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-950/50 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add New Staff Member</span>
                </button>
              </div>

              {isLoadingStaff ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
                  <p className="text-xs">Loading staff accounts...</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Staff ID (Login Key)</th>
                        <th className="py-3 px-4">Full Name</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Account Status</th>
                        <th className="py-3 px-4">Created Date</th>
                        <th className="py-3 px-4 text-right">Access Toggle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {staffList.map((member) => {
                        const roleBadges = {
                          nurse: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                          doctor: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
                          admin: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                        };

                        return (
                          <tr key={member._id} className="hover:bg-slate-900/60 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-100 text-sm">
                              {member.staffId}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-200">
                              {member.name}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                  roleBadges[member.role]
                                }`}
                              >
                                {member.role}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {member.active !== false ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                  <AlertTriangle className="w-3 h-3" /> Deactivated
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                              {member.createdAt
                                ? new Date(member.createdAt).toLocaleDateString()
                                : 'Seeded'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleToggleStaffActive(member)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                  member.active !== false
                                    ? 'bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 border border-slate-700'
                                    : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/40'
                                }`}
                              >
                                {member.active !== false ? (
                                  <>
                                    <ToggleRight className="w-4 h-4 text-emerald-400" />
                                    <span>Deactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="w-4 h-4 text-rose-400" />
                                    <span>Reactivate</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DISCHARGE QUEUE */}
          {activeTab === 'queue' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
              <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Clinical Discharge Queue
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Active patients who have achieved 3+ consecutive fever-free days awaiting physician clearance.
                  </p>
                </div>

                <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {dischargeQueue.length} Ready for Release
                </span>
              </div>

              {dischargeQueue.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">No Pending Discharges</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    All eligible patients have been processed or are currently in active quarantine cycles.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Bed</th>
                        <th className="py-3 px-4">Patient Name</th>
                        <th className="py-3 px-4">Admitted Date</th>
                        <th className="py-3 px-4">Fever-Free Days</th>
                        <th className="py-3 px-4">Action Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 text-slate-300">
                      {dischargeQueue.map((patient) => (
                        <tr key={patient._id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                            {patient.bedNumber}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-200">
                            {patient.name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {new Date(patient.admittedDate).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-emerald-400 font-mono text-sm">
                              {patient.eligibility?.consecutiveFeverFreeDays ?? 3} days
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Awaiting Doctor Sign-off
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Add Staff Modal */}
        <Modal
          isOpen={showAddStaffModal}
          onClose={() => setShowAddStaffModal(false)}
          title="Onboard New Clinical Staff"
          description="The system will auto-generate an incrementing Staff ID (e.g. N004, D002, A002) that serves as the login key."
          maxWidth="md"
        >
          <form onSubmit={handleAddStaffSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Staff Full Name *
              </label>
              <input
                type="text"
                required
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="e.g. Dr. Rebecca Stone, MD"
                disabled={isSubmittingStaff}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 text-slate-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Staff Role *
              </label>
              <select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value as StaffRole)}
                disabled={isSubmittingStaff}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 text-slate-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none"
              >
                <option value="nurse">Nurse (ID Prefix: N)</option>
                <option value="doctor">Doctor (ID Prefix: D)</option>
                <option value="admin">Administrator (ID Prefix: A)</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmittingStaff || !newStaffName.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors shadow-lg shadow-amber-950/50 flex items-center justify-center gap-1.5"
              >
                {isSubmittingStaff ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create & Generate ID</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>

        {/* Post-Creation Copyable Staff ID Modal */}
        <Modal
          isOpen={!!createdStaffInfo}
          onClose={() => setCreatedStaffInfo(null)}
          title="Staff Account Created Successfully"
          maxWidth="sm"
        >
          {createdStaffInfo && (
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-amber-950/50">
                <KeyRound className="w-7 h-7" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-100">{createdStaffInfo.name}</h4>
                <p className="text-xs text-slate-400 capitalize">Role: {createdStaffInfo.role}</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Assigned Staff ID (Login Key)
                </span>
                <div className="text-3xl font-extrabold font-mono text-amber-400 tracking-widest">
                  {createdStaffInfo.staffId}
                </div>
                <p className="text-[11px] text-slate-500">
                  There are no passwords. Provide this Staff ID to the new employee to sign in.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyStaffId}
                className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 transition-all"
              >
                {hasCopiedId ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied Staff ID!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Staff ID Key</span>
                  </>
                )}
              </button>
            </div>
          )}
        </Modal>
      </div>
    </RoleGuard>
  );
}
