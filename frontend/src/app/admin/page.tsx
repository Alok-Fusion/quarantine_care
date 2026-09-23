'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { RoleGuard } from '../../components/RoleGuard';
import { Modal } from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
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
  CheckCircle2,
  UserCheck,
  Shield,
  Loader2,
  UserPlus,
  Copy,
  Check,
  ToggleLeft,
  ToggleRight,
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
  const mortalityPercent = stats ? (stats.mortalityRate * 100).toFixed(1) : '0.0';
  const successPercent = stats ? (stats.successRate * 100).toFixed(1) : '0.0';
  const hasMortalityAlert = stats?.mortalityAlert ?? false;

  return (
    <RoleGuard allowedRoles={['admin']}>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <h1 className="text-xl font-bold text-text tracking-tight">
                Facility Executive Dashboard
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                Quarantine capacity surveillance, epidemiological mortality thresholds, and staff access control.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admit"
                className="flex items-center gap-2 px-3 py-1.5 rounded-[4px] bg-[#223548] hover:bg-[#2d465f] text-text border border-border text-xs font-semibold transition-colors"
              >
                <Bed className="w-3.5 h-3.5 text-text-muted" />
                <span>Admit & Bed Map</span>
              </Link>

              <button
                onClick={() => {
                  fetchDashboardData();
                  if (activeTab === 'staff') fetchStaffList();
                }}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-border bg-panel hover:bg-[#1D2B3A] text-text-muted hover:text-text text-xs font-medium transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* CRITICAL MORTALITY ALERT BANNER */}
          {hasMortalityAlert && (
            <div className="p-4 rounded-[4px] bg-panel border-l-4 border-l-status-fever border border-border flex items-start gap-3">
              <div className="p-1 rounded bg-[#2A1E24] text-status-fever shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5 text-status-fever" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-text uppercase tracking-wide">
                    Critical Alert: High Mortality Rate
                  </h3>
                  <span className="font-mono tabular-nums text-xs px-1.5 py-0.5 rounded-[3px] bg-status-fever text-white font-bold">
                    {mortalityPercent}%
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Facility mortality has crossed the epidemiological safety threshold of{' '}
                  <span className="font-mono tabular-nums font-semibold text-text">15.0%</span>. Immediate clinical review is recommended.
                </p>
              </div>
            </div>
          )}

          {/* Dashboard Tabs Bar */}
          <div className="flex items-center gap-1 border-b border-border pb-2">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'metrics'
                  ? 'bg-[#233546] text-text border border-border'
                  : 'text-text-muted hover:text-text hover:bg-panel'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Overview & Metrics</span>
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'staff'
                  ? 'bg-[#233546] text-text border border-border'
                  : 'text-text-muted hover:text-text hover:bg-panel'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Staff Management</span>
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'queue'
                  ? 'bg-[#233546] text-text border border-border'
                  : 'text-text-muted hover:text-text hover:bg-panel'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Discharge Queue</span>
              <span className="font-mono tabular-nums px-1.5 py-0.2 rounded bg-[#101922] text-[11px] text-text-muted border border-border">
                {dischargeQueue.length}
              </span>
            </button>
          </div>

          {/* TAB 1: METRICS OVERVIEW */}
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              {/* Key Flat Stat Panels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Bed Capacity & Occupancy */}
                <div className="bg-panel border border-border rounded-[4px] p-4 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-text-muted mb-1">Bed Occupancy</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-text font-mono tabular-nums">
                        {occupied}
                      </span>
                      <span className="text-xs text-text-muted font-mono tabular-nums">
                        / {capacity} beds
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span>Utilization</span>
                      <span className="font-mono tabular-nums text-text font-medium">{occupancyPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#0F1720] rounded-full overflow-hidden border border-border">
                      <div
                        className="h-full bg-text-muted transition-all duration-300"
                        style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Recovery Rate */}
                <div className="bg-panel border border-border rounded-[4px] p-4 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-text-muted mb-1">Recovery Rate</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-text font-mono tabular-nums">
                        {successPercent}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border text-xs text-text-muted flex items-center justify-between">
                    <span>Target benchmark</span>
                    <span className="font-mono tabular-nums text-text">85.0%</span>
                  </div>
                </div>

                {/* 3. Mortality Rate (Alert hairline top border if > 15%) */}
                <div
                  className={`bg-panel border rounded-[4px] p-4 flex flex-col justify-between ${
                    hasMortalityAlert
                      ? 'border-border border-t-2 border-t-status-fever'
                      : 'border-border'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-text-muted mb-1">
                      <span className="text-xs">Mortality Rate</span>
                      {hasMortalityAlert && (
                        <span className="w-2 h-2 rounded-full bg-status-fever" />
                      )}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-3xl font-bold font-mono tabular-nums ${
                          hasMortalityAlert ? 'text-status-fever' : 'text-text'
                        }`}
                      >
                        {mortalityPercent}%
                      </span>
                      <span className="text-xs text-text-muted font-mono tabular-nums">
                        ({stats?.deceasedCount ?? 0} deaths)
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border text-xs text-text-muted flex items-center justify-between">
                    <span>Threshold</span>
                    <span className={`font-mono tabular-nums ${hasMortalityAlert ? 'text-status-fever font-semibold' : 'text-text'}`}>
                      &gt; 15.0%
                    </span>
                  </div>
                </div>

                {/* 4. Total Throughput */}
                <div className="bg-panel border border-border rounded-[4px] p-4 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-text-muted mb-1">Total Admitted</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-text font-mono tabular-nums">
                        {stats?.totalAdmitted ?? 0}
                      </span>
                      <span className="text-xs text-text-muted">cases</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border text-xs text-text-muted flex items-center justify-between">
                    <span>Discharged</span>
                    <span className="font-mono tabular-nums text-text">
                      {stats?.dischargedCount ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STAFF MANAGEMENT */}
          {activeTab === 'staff' && (
            <div className="bg-panel border border-border rounded-[4px] p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div>
                  <h3 className="text-sm font-bold text-text">
                    Staff Directory & Access Control
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Generate incrementing Staff ID login keys and toggle access permissions.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddStaffModal(true)}
                  className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#223548] hover:bg-[#2d465f] text-text border border-border text-xs font-semibold transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5 text-text-muted" />
                  <span>Add Staff Member</span>
                </button>
              </div>

              {isLoadingStaff ? (
                <div className="py-16 flex flex-col items-center justify-center text-text-muted">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" />
                  <p className="text-xs font-mono">Loading staff accounts...</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-[4px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0F1720] text-text-muted uppercase text-[10px] border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Staff ID</th>
                        <th className="py-2.5 px-3 font-semibold">Name</th>
                        <th className="py-2.5 px-3 font-semibold">Role</th>
                        <th className="py-2.5 px-3 font-semibold">Status</th>
                        <th className="py-2.5 px-3 font-semibold">Created Date</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-text">
                      {staffList.map((member) => (
                        <tr key={member._id} className="hover:bg-[#1B2734] transition-colors">
                          <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-text">
                            {member.staffId}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-text">
                            {member.name}
                          </td>
                          <td className="py-2.5 px-3 capitalize text-text-muted">
                            {member.role}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  member.active !== false ? 'bg-status-stable' : 'bg-[#55697A]'
                                }`}
                              />
                              <span className="text-[11px] text-text-muted">
                                {member.active !== false ? 'Active' : 'Deactivated'}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-text-muted font-mono tabular-nums text-[11px]">
                            {member.createdAt
                              ? new Date(member.createdAt).toLocaleDateString()
                              : 'Seeded'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleToggleStaffActive(member)}
                              className={`px-2.5 py-1 rounded-[3px] text-xs font-medium transition-colors border ${
                                member.active !== false
                                  ? 'bg-[#1D2B3A] hover:bg-[#2A3D52] text-text border-border'
                                  : 'bg-[#1D2B3A] hover:bg-[#2A3D52] text-text-muted border-border'
                              }`}
                            >
                              {member.active !== false ? 'Deactivate' : 'Reactivate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DISCHARGE QUEUE */}
          {activeTab === 'queue' && (
            <div className="bg-panel border border-border rounded-[4px] p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div>
                  <h3 className="text-sm font-bold text-text">
                    Clinical Discharge Queue
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Patients who have completed 3+ consecutive fever-free days awaiting physician discharge clearance.
                  </p>
                </div>

                <div className="text-xs font-mono tabular-nums text-text-muted border border-border px-2.5 py-1 rounded-[3px] bg-[#0F1720]">
                  {dischargeQueue.length} eligible
                </div>
              </div>

              {dischargeQueue.length === 0 ? (
                <div className="text-center py-12 text-text-muted border border-dashed border-border rounded-[4px]">
                  <p className="text-xs">No pending discharges in the queue.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-[4px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0F1720] text-text-muted uppercase text-[10px] border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Bed</th>
                        <th className="py-2.5 px-3 font-semibold">Patient</th>
                        <th className="py-2.5 px-3 font-semibold">Admitted Date</th>
                        <th className="py-2.5 px-3 font-semibold">Fever-Free Days</th>
                        <th className="py-2.5 px-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-text">
                      {dischargeQueue.map((patient) => (
                        <tr
                          key={patient._id}
                          className="hover:bg-[#1B2734] transition-colors border-l-[3px] border-l-status-stable"
                        >
                          <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-text">
                            {patient.bedNumber}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-text">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-status-stable shrink-0" />
                              <span>{patient.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-text-muted font-mono tabular-nums">
                            {new Date(patient.admittedDate).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums font-semibold text-text">
                            {patient.eligibility?.consecutiveFeverFreeDays ?? 3} days
                          </td>
                          <td className="py-2.5 px-3 text-text-muted text-[11px]">
                            Awaiting Doctor Clearance
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Staff Modal */}
        <Modal
          isOpen={showAddStaffModal}
          onClose={() => setShowAddStaffModal(false)}
          title="Onboard New Clinical Staff"
          description="The system auto-generates an incrementing Staff ID (e.g. N004, D002, A002) for passwordless authentication."
          maxWidth="md"
        >
          <form onSubmit={handleAddStaffSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text mb-1.5">
                Staff Full Name *
              </label>
              <input
                type="text"
                required
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="e.g. Dr. Rebecca Stone, MD"
                disabled={isSubmittingStaff}
                className="w-full bg-[#0F1720] border border-border focus:border-[#4B6275] text-text rounded-[4px] px-3 py-2 text-xs focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1.5">
                Staff Role *
              </label>
              <select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value as StaffRole)}
                disabled={isSubmittingStaff}
                className="w-full bg-[#0F1720] border border-border focus:border-[#4B6275] text-text rounded-[4px] px-3 py-2 text-xs focus:outline-none transition-colors"
              >
                <option value="nurse">Nurse (ID Prefix: N)</option>
                <option value="doctor">Doctor (ID Prefix: D)</option>
                <option value="admin">Administrator (ID Prefix: A)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="flex-1 px-3 py-2 rounded-[4px] border border-border bg-panel hover:bg-[#1D2B3A] text-text-muted text-xs font-medium transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmittingStaff || !newStaffName.trim()}
                className="flex-1 px-3 py-2 rounded-[4px] bg-[#223548] hover:bg-[#2d465f] text-text border border-border text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                {isSubmittingStaff ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5 text-text-muted" />
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
          title="Staff Account Created"
          maxWidth="sm"
        >
          {createdStaffInfo && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-text">{createdStaffInfo.name}</h4>
                <p className="text-xs text-text-muted capitalize">Role: {createdStaffInfo.role}</p>
              </div>

              <div className="bg-[#0F1720] border border-border rounded-[4px] p-3 space-y-1.5">
                <span className="text-[11px] text-text-muted uppercase">
                  Assigned Staff ID (Login Key)
                </span>
                <div className="text-2xl font-bold font-mono tabular-nums text-text tracking-wider">
                  {createdStaffInfo.staffId}
                </div>
                <p className="text-[11px] text-text-muted leading-tight">
                  There are no passwords. Provide this Staff ID to the employee to sign in.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyStaffId}
                className="w-full py-2 px-3 rounded-[4px] bg-[#223548] hover:bg-[#2d465f] text-text border border-border font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                {hasCopiedId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-status-stable" />
                    <span>Copied Staff ID!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-text-muted" />
                    <span>Copy Staff ID</span>
                  </>
                )}
              </button>
            </div>
          )}
        </Modal>
      </AppLayout>
    </RoleGuard>
  );
}
