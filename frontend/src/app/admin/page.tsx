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
  Loader2,
  UserPlus,
  Copy,
  Check,
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
        newStatus ? 'info' : 'warning'
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

      showToast(`Created staff account for ${res.staff.name}`, 'info', 'Staff Added');
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
    showToast(`Copied ${createdStaffInfo.staffId} to clipboard`, 'info');
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
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2 text-text-muted text-[11px] font-mono uppercase tracking-wider mb-1">
                <span>Facility Administration</span>
                <span>•</span>
                <span>Operations</span>
              </div>
              <h1 className="text-xl font-bold text-text tracking-tight">
                Executive Command Console
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                Surveillance metrics, capacity tracking, epidemiological thresholds, and staff access control.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admit"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] bg-btn hover:bg-btn-hover text-white text-xs font-medium transition-colors"
              >
                <Bed className="w-3.5 h-3.5" />
                <span>Admit / Bed Map</span>
              </Link>

              <button
                onClick={() => {
                  fetchDashboardData();
                  if (activeTab === 'staff') fetchStaffList();
                }}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] border border-border bg-panel hover:bg-panel-hover text-text-muted hover:text-text text-xs font-medium transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* CRITICAL MORTALITY ALERT BANNER */}
          {hasMortalityAlert && (
            <div className="p-4 rounded-[3px] bg-alert border-l-4 border-l-status-fever border border-border flex items-start gap-3">
              <div className="p-1 rounded bg-panel text-status-fever shrink-0 mt-0.5 border border-border">
                <ShieldAlert className="w-5 h-5 text-status-fever" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-text uppercase tracking-wide font-mono">
                    Epidemiological Threshold Alert: High Mortality Rate
                  </h3>
                  <span className="font-mono tabular-nums text-xs px-1.5 py-0.5 rounded-[2px] bg-status-fever text-white font-bold">
                    {mortalityPercent}%
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Facility mortality has exceeded the safety benchmark of{' '}
                  <span className="font-mono tabular-nums font-semibold text-text">15.0%</span>. Immediate clinical protocol audit is recommended.
                </p>
              </div>
            </div>
          )}

          {/* Dashboard Tabs Bar */}
          <div className="flex items-center gap-1 border-b border-border pb-2">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-3 py-1.5 rounded-[3px] text-xs font-mono transition-colors flex items-center gap-1.5 ${
                activeTab === 'metrics'
                  ? 'bg-subpanel text-text font-bold border border-border'
                  : 'text-text-muted hover:text-text hover:bg-panel'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Overview & Metrics</span>
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`px-3 py-1.5 rounded-[3px] text-xs font-mono transition-colors flex items-center gap-1.5 ${
                activeTab === 'staff'
                  ? 'bg-subpanel text-text font-bold border border-border'
                  : 'text-text-muted hover:text-text hover:bg-panel'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Staff Management ({staffList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3 py-1.5 rounded-[3px] text-xs font-mono transition-colors flex items-center gap-1.5 ${
                activeTab === 'queue'
                  ? 'bg-subpanel text-text font-bold border border-border'
                  : 'text-text-muted hover:text-text hover:bg-panel'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Discharge Queue ({dischargeQueue.length})</span>
            </button>
          </div>

          {/* TAB 1: METRICS OVERVIEW */}
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              {/* Flat Stat Panels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Bed Capacity & Occupancy */}
                <div className="bg-panel border border-border rounded-[3px] p-4 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-mono uppercase text-text-muted mb-1">Bed Occupancy</div>
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
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1 font-mono">
                      <span>Utilization</span>
                      <span className="tabular-nums text-text font-medium">{occupancyPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-subpanel rounded-full overflow-hidden border border-border">
                      <div
                        className="h-full bg-text-muted transition-all duration-300"
                        style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Recovery Rate */}
                <div className="bg-panel border border-border rounded-[3px] p-4 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-mono uppercase text-text-muted mb-1">Recovery Rate</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-text font-mono tabular-nums">
                        {successPercent}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border text-xs text-text-muted flex items-center justify-between font-mono">
                    <span>Benchmark Standard</span>
                    <span className="tabular-nums text-text">85.0%</span>
                  </div>
                </div>

                {/* 3. Mortality Rate (Alert Hairline Top Border if > 15%) */}
                <div
                  className={`bg-panel border rounded-[3px] p-4 flex flex-col justify-between ${
                    hasMortalityAlert
                      ? 'border-border border-t-2 border-t-status-fever bg-alert'
                      : 'border-border'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-text-muted mb-1">
                      <span className="text-[11px] font-mono uppercase">Mortality Rate</span>
                      {hasMortalityAlert && (
                        <span className="w-2 h-2 rounded-full bg-status-fever animate-pulse" />
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

                  <div className="mt-4 pt-3 border-t border-border text-xs text-text-muted flex items-center justify-between font-mono">
                    <span>Safety Threshold</span>
                    <span className={`tabular-nums ${hasMortalityAlert ? 'text-status-fever font-bold' : 'text-text'}`}>
                      &le; 15.0%
                    </span>
                  </div>
                </div>

                {/* 4. Total Throughput */}
                <div className="bg-panel border border-border rounded-[3px] p-4 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-mono uppercase text-text-muted mb-1">Total Throughput</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-text font-mono tabular-nums">
                        {stats?.totalAdmitted ?? 0}
                      </span>
                      <span className="text-xs text-text-muted font-mono">cases</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border text-xs text-text-muted flex items-center justify-between font-mono">
                    <span>Discharged</span>
                    <span className="tabular-nums text-text">
                      {stats?.dischargedCount ?? 0} patients
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STAFF MANAGEMENT */}
          {activeTab === 'staff' && (
            <div className="bg-panel border border-border rounded-[3px] p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div>
                  <h3 className="text-sm font-bold text-text font-mono uppercase">
                    Staff Directory & Credentials
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Generate incrementing Staff ID login keys and toggle access permissions.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddStaffModal(true)}
                  className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] bg-btn hover:bg-btn-hover text-white border border-border text-xs font-semibold font-mono transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Onboard Staff Member</span>
                </button>
              </div>

              {isLoadingStaff ? (
                <div className="py-16 flex flex-col items-center justify-center text-text-muted font-mono">
                  <Loader2 className="w-5 h-5 animate-spin mb-2" />
                  <p className="text-xs">Loading staff accounts...</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-[3px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-subpanel text-text-muted uppercase text-[10px] font-mono border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold border-r border-border">Staff ID</th>
                        <th className="py-2.5 px-3 font-semibold border-r border-border">Name</th>
                        <th className="py-2.5 px-3 font-semibold border-r border-border">Role</th>
                        <th className="py-2.5 px-3 font-semibold border-r border-border">Status</th>
                        <th className="py-2.5 px-3 font-semibold border-r border-border">Created Date</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-text">
                      {staffList.map((member) => (
                        <tr key={member._id} className="hover:bg-panel-hover transition-colors">
                          <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-text border-r border-border">
                            {member.staffId}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-text border-r border-border">
                            {member.name}
                          </td>
                          <td className="py-2.5 px-3 capitalize text-text-muted font-mono text-[11px] border-r border-border">
                            {member.role}
                          </td>
                          <td className="py-2.5 px-3 border-r border-border">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  member.active !== false ? 'bg-status-stable' : 'bg-border'
                                }`}
                              />
                              <span className="text-[11px] text-text-muted font-mono">
                                {member.active !== false ? 'Active' : 'Deactivated'}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-text-muted font-mono tabular-nums text-[11px] border-r border-border">
                            {member.createdAt
                              ? new Date(member.createdAt).toLocaleDateString()
                              : 'Seeded'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleToggleStaffActive(member)}
                              className={`px-2.5 py-1 rounded-[3px] text-xs font-mono font-medium transition-colors border ${
                                member.active !== false
                                  ? 'bg-subpanel hover:bg-panel-hover text-text border-border'
                                  : 'bg-subpanel hover:bg-panel-hover text-text-muted border-border'
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
            <div className="bg-panel border border-border rounded-[3px] p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div>
                  <h3 className="text-sm font-bold text-text font-mono uppercase">
                    Clinical Discharge Queue
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Patients who have completed 3+ consecutive fever-free days awaiting physician clearance.
                  </p>
                </div>

                <div className="text-xs font-mono tabular-nums text-text-muted border border-border px-2.5 py-1 rounded-[2px] bg-subpanel">
                  {dischargeQueue.length} eligible
                </div>
              </div>

              {dischargeQueue.length === 0 ? (
                <div className="text-center py-12 text-text-muted border border-dashed border-border rounded-[3px] font-mono text-xs">
                  NO PENDING DISCHARGES IN FACILITY QUEUE
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-[3px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-subpanel text-text-muted uppercase text-[10px] font-mono border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold border-r border-border">Bed</th>
                        <th className="py-2.5 px-3 font-semibold border-r border-border">Patient</th>
                        <th className="py-2.5 px-3 font-semibold border-r border-border">Admitted Date</th>
                        <th className="py-2.5 px-3 font-semibold border-r border-border">Fever-Free Days</th>
                        <th className="py-2.5 px-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-text">
                      {dischargeQueue.map((patient) => (
                        <tr
                          key={patient._id}
                          className="hover:bg-panel-hover transition-colors border-l-[3px] border-l-status-stable"
                        >
                          <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-text border-r border-border">
                            {patient.bedNumber}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-text border-r border-border">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-status-stable shrink-0" />
                              <span>{patient.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-text-muted font-mono tabular-nums border-r border-border">
                            {new Date(patient.admittedDate).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums font-semibold text-text border-r border-border">
                            {patient.eligibility?.consecutiveFeverFreeDays ?? 3} days
                          </td>
                          <td className="py-2.5 px-3 text-text-muted text-[11px] font-mono">
                            Awaiting Physician Sign-off
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

        {/* ADD STAFF MODAL */}
        <Modal
          isOpen={showAddStaffModal}
          onClose={() => setShowAddStaffModal(false)}
          title="Onboard New Clinical Staff"
          description="The system auto-generates an incrementing Staff ID (e.g. N004, D002, A002) for passwordless authentication."
          maxWidth="md"
        >
          <form onSubmit={handleAddStaffSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-text-muted mb-1.5 font-semibold">
                Staff Full Name *
              </label>
              <input
                type="text"
                required
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="e.g. Dr. Rebecca Stone, MD"
                disabled={isSubmittingStaff}
                className="w-full bg-input border border-border focus:border-accent text-text rounded-[3px] px-3 py-2 text-xs focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-text-muted mb-1.5 font-semibold">
                Staff Role *
              </label>
              <select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value as StaffRole)}
                disabled={isSubmittingStaff}
                className="w-full bg-input border border-border focus:border-accent text-text rounded-[3px] px-3 py-2 text-xs focus:outline-none transition-colors font-mono"
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
                className="flex-1 px-3 py-2 rounded-[3px] border border-border bg-panel hover:bg-panel-hover text-text text-xs font-mono transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmittingStaff || !newStaffName.trim()}
                className="flex-1 px-3 py-2 rounded-[3px] bg-btn hover:bg-btn-hover text-white border border-border text-xs font-bold font-mono transition-colors flex items-center justify-center gap-1.5"
              >
                {isSubmittingStaff ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create & Generate ID</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>

        {/* POST-CREATION COPYABLE ID MODAL */}
        <Modal
          isOpen={!!createdStaffInfo}
          onClose={() => setCreatedStaffInfo(null)}
          title="Staff Account Provisioned"
          maxWidth="sm"
        >
          {createdStaffInfo && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-text">{createdStaffInfo.name}</h4>
                <p className="text-xs text-text-muted capitalize font-mono">Role: {createdStaffInfo.role}</p>
              </div>

              <div className="bg-subpanel border border-border rounded-[3px] p-3 space-y-1.5">
                <span className="text-[10px] font-mono text-text-muted uppercase">
                  Assigned Staff ID (Login Key)
                </span>
                <div className="text-2xl font-bold font-mono tabular-nums text-text tracking-wider">
                  {createdStaffInfo.staffId}
                </div>
                <p className="text-[11px] text-text-muted leading-tight">
                  Provide this Staff ID to the employee to authenticate.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyStaffId}
                className="w-full py-2 px-3 rounded-[3px] bg-btn hover:bg-btn-hover text-white border border-border font-bold font-mono text-xs flex items-center justify-center gap-2 transition-colors"
              >
                {hasCopiedId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-status-stable" />
                    <span>Copied Staff ID!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
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
