'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { RoleGuard } from '../../components/RoleGuard';
import { Modal } from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import {
  FacilityStats,
  Patient,
  Staff,
  StaffRole,
  PatientDetailResponse,
  TemperatureLog,
  DoctorVisit,
} from '../../types';
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
  CheckCircle2,
  TrendingUp,
  FolderArchive,
  Search,
  Calendar,
  Thermometer,
  Eye,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'metrics' | 'staff' | 'queue' | 'registry'>('metrics');

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

  // Patient Registry & Archive state
  const [registryPatients, setRegistryPatients] = useState<Patient[]>([]);
  const [isLoadingRegistry, setIsLoadingRegistry] = useState(false);
  const [registryFilter, setRegistryFilter] = useState<'all' | 'active' | 'discharged' | 'deceased'>('all');
  const [registrySearch, setRegistrySearch] = useState('');
  const [patientDetail, setPatientDetail] = useState<PatientDetailResponse | null>(null);
  const [isLoadingPatientDetails, setIsLoadingPatientDetails] = useState(false);

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

  const fetchRegistryPatients = useCallback(async () => {
    setIsLoadingRegistry(true);
    try {
      const data = await api.get<Patient[]>('/api/patients?status=all');
      setRegistryPatients(data);
    } catch (err: any) {
      console.error('Fetch patient archive error', err);
      showToast(err.message || 'Error loading patient archive registry', 'error');
    } finally {
      setIsLoadingRegistry(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaffList();
    } else if (activeTab === 'registry') {
      fetchRegistryPatients();
    }
  }, [activeTab, fetchStaffList, fetchRegistryPatients]);

  const handleInspectPatient = async (patient: Patient) => {
    setIsLoadingPatientDetails(true);
    try {
      const res = await api.get<PatientDetailResponse>(`/api/patients/${patient._id}`);
      setPatientDetail(res);
    } catch (err: any) {
      console.error('Inspect patient error', err);
      showToast(err.message || 'Error loading patient record', 'error');
    } finally {
      setIsLoadingPatientDetails(false);
    }
  };

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

  // Filter registry
  const filteredRegistry = registryPatients.filter((p) => {
    if (registryFilter !== 'all' && p.status !== registryFilter) return false;
    if (registrySearch.trim()) {
      const q = registrySearch.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchBed = p.bedNumber?.toLowerCase().includes(q);
      const matchDoc = typeof p.dischargedBy === 'object' && p.dischargedBy?.name?.toLowerCase().includes(q);
      return matchName || matchBed || matchDoc;
    }
    return true;
  });

  const registryCounts = {
    all: registryPatients.length,
    active: registryPatients.filter((p) => p.status === 'active').length,
    discharged: registryPatients.filter((p) => p.status === 'discharged').length,
    deceased: registryPatients.filter((p) => p.status === 'deceased').length,
  };

  return (
    <RoleGuard allowedRoles={['admin']}>
      <AppLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2 text-accent text-xs font-mono uppercase tracking-wider mb-1 font-semibold">
                <Activity className="w-3.5 h-3.5" />
                <span>Facility Administration</span>
              </div>
              <h1 className="text-2xl font-bold text-text tracking-tight">
                Facility Overview & Records
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                Surveillance metrics, complete patient registry, and staff security permissions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admit"
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-btn hover:bg-btn-hover text-white text-xs font-semibold font-mono transition-all shadow-sm"
              >
                <Bed className="w-3.5 h-3.5" />
                <span>Bed Allocation</span>
              </Link>

              <button
                onClick={() => {
                  fetchDashboardData();
                  if (activeTab === 'staff') fetchStaffList();
                  if (activeTab === 'registry') fetchRegistryPatients();
                }}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-panel hover:bg-subpanel text-text-muted hover:text-text text-xs font-medium font-mono transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* MORTALITY ALERT BANNER */}
          {hasMortalityAlert && (
            <div className="p-4 rounded-xl bg-alert border border-status-fever/30 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-status-fever shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-text uppercase tracking-wide font-mono">
                    Epidemiological Warning: Elevated Mortality Rate
                  </h3>
                  <span className="font-mono tabular-nums text-xs px-2 py-0.2 rounded bg-status-fever text-white font-bold">
                    {mortalityPercent}%
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                  Facility mortality rate exceeds the standard threshold of{' '}
                  <strong className="font-mono text-text">15.0%</strong>. Clinical quarantine review advised.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Tabs Bar */}
          <div className="flex items-center gap-1 border-b border-border pb-2.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'metrics'
                  ? 'bg-subpanel text-accent font-semibold border border-border'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Surveillance Metrics</span>
            </button>

            <button
              onClick={() => setActiveTab('registry')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'registry'
                  ? 'bg-subpanel text-accent font-semibold border border-border'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Patient Registry ({registryPatients.length || stats?.totalAdmitted || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'staff'
                  ? 'bg-subpanel text-accent font-semibold border border-border'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Staff Accounts ({staffList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'queue'
                  ? 'bg-subpanel text-accent font-semibold border border-border'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Discharge Queue ({dischargeQueue.length})</span>
            </button>
          </div>

          {/* TAB 1: METRICS OVERVIEW */}
          {activeTab === 'metrics' && (
            <div className="space-y-5">
              {/* 4 Clean Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Bed Utilization */}
                <div className="bg-panel border border-border rounded-xl p-4 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="text-[11px] font-mono uppercase text-text-muted font-semibold tracking-wider mb-2 flex items-center justify-between">
                      <span>Bed Utilization</span>
                      <Bed className="w-4 h-4 text-accent" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-text font-mono tabular-nums">
                        {occupied}
                      </span>
                      <span className="text-xs text-text-muted font-mono tabular-nums">
                        / {capacity} beds
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-border">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1 font-mono">
                      <span>Occupancy</span>
                      <span className="tabular-nums text-text font-semibold">{occupancyPercent}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-subpanel overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-500 rounded-full"
                        style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Total Cumulative Patient Intake */}
                <div className="bg-panel border border-border rounded-xl p-4 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="text-[11px] font-mono uppercase text-text-muted font-semibold tracking-wider mb-2 flex items-center justify-between">
                      <span>Total Admissions</span>
                      <Users className="w-4 h-4 text-accent" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-text font-mono tabular-nums">
                        {stats?.totalAdmitted ?? 0}
                      </span>
                      <span className="text-xs text-text-muted font-mono">total patients</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-border">
                    <div className="flex items-center justify-between text-xs text-text-muted font-mono">
                      <span>Currently Admitted</span>
                      <span className="tabular-nums text-accent font-semibold">{stats?.occupied ?? 0}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Successful Discharges */}
                <div className="bg-panel border border-border rounded-xl p-4 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="text-[11px] font-mono uppercase text-text-muted font-semibold tracking-wider mb-2 flex items-center justify-between">
                      <span>Recovered</span>
                      <Award className="w-4 h-4 text-status-stable" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-status-stable font-mono tabular-nums">
                        {stats?.dischargedCount ?? 0}
                      </span>
                      <span className="text-xs text-status-stable font-mono font-semibold tabular-nums">
                        ({successPercent}%)
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-border">
                    <div className="flex items-center justify-between text-xs text-text-muted font-mono">
                      <span>Ready for Discharge</span>
                      <span className="tabular-nums text-status-pending font-semibold">{dischargeQueue.length}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Mortality Rate */}
                <div className="bg-panel border border-border rounded-xl p-4 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="text-[11px] font-mono uppercase text-text-muted font-semibold tracking-wider mb-2 flex items-center justify-between">
                      <span>Mortality Rate</span>
                      <HeartCrack className="w-4 h-4 text-status-fever" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-status-fever font-mono tabular-nums">
                        {stats?.deceasedCount ?? 0}
                      </span>
                      <span className="text-xs text-status-fever font-mono font-semibold tabular-nums">
                        ({mortalityPercent}%)
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-border">
                    <div className="flex items-center justify-between text-xs text-text-muted font-mono">
                      <span>Safety Threshold</span>
                      <span className="tabular-nums text-text-muted">15.0% Limit</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Protocol Integrity Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-panel border border-border rounded-xl p-5 space-y-3">
                  <div>
                    <h2 className="text-xs font-bold text-text uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-accent" />
                      <span>Quarantine Protocol Criteria</span>
                    </h2>
                    <p className="text-xs text-text-muted mt-0.5">
                      Clinical discharge validation requirements and epidemiological thresholds.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-lg bg-subpanel border border-border space-y-1">
                      <span className="text-[10px] font-mono uppercase font-semibold text-accent">Rule 1</span>
                      <h4 className="text-xs font-semibold text-text">Minimum Quarantine Period</h4>
                      <p className="text-xs text-text-muted leading-relaxed">
                        Patients must complete a minimum of <strong className="text-text font-mono">14 days</strong> from date of admission.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-subpanel border border-border space-y-1">
                      <span className="text-[10px] font-mono uppercase font-semibold text-status-stable">Rule 2</span>
                      <h4 className="text-xs font-semibold text-text">3-Day Afebrile Window</h4>
                      <p className="text-xs text-text-muted leading-relaxed">
                        Temperature must remain <strong className="text-text font-mono">&le; 99.5&deg;F</strong> for at least <strong className="text-text font-mono">3 consecutive days</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-panel border border-border rounded-xl p-5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-accent text-xs font-mono font-semibold uppercase">
                      <FolderArchive className="w-3.5 h-3.5" />
                      <span>Permanent Registry</span>
                    </div>
                    <h3 className="text-sm font-semibold text-text">Patient Registry & Archives</h3>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Every patient ever admitted remains permanently registered with their timeline, vitals logs, and outcome certifications.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border space-y-2">
                    <button
                      onClick={() => setActiveTab('registry')}
                      className="w-full py-2 px-3 rounded-lg bg-subpanel hover:bg-subpanel/80 text-accent border border-border font-mono font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <FolderArchive className="w-3.5 h-3.5" />
                      <span>Open Patient Registry ({stats?.totalAdmitted ?? 0})</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PATIENT REGISTRY & ARCHIVE */}
          {activeTab === 'registry' && (
            <div className="space-y-4">
              <div className="bg-panel border border-border rounded-xl p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto">
                  <button
                    onClick={() => setRegistryFilter('all')}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all shrink-0 ${
                      registryFilter === 'all'
                        ? 'bg-subpanel text-text border border-border shadow-sm'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    All Records ({registryCounts.all})
                  </button>

                  <button
                    onClick={() => setRegistryFilter('active')}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                      registryFilter === 'active'
                        ? 'bg-subpanel text-accent border border-border shadow-sm'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>In Hospital ({registryCounts.active})</span>
                  </button>

                  <button
                    onClick={() => setRegistryFilter('discharged')}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                      registryFilter === 'discharged'
                        ? 'bg-subpanel text-status-stable border border-border shadow-sm'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-status-stable" />
                    <span>Discharged ({registryCounts.discharged})</span>
                  </button>

                  <button
                    onClick={() => setRegistryFilter('deceased')}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                      registryFilter === 'deceased'
                        ? 'bg-subpanel text-status-fever border border-border shadow-sm'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-status-fever" />
                    <span>Deceased ({registryCounts.deceased})</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={registrySearch}
                    onChange={(e) => setRegistrySearch(e.target.value)}
                    placeholder="Search patient, bed, doctor..."
                    className="w-full bg-input border border-border focus:border-accent text-text rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none transition-all placeholder:text-text-muted/50 font-mono"
                  />
                </div>
              </div>

              {/* Patient Registry Table */}
              {isLoadingRegistry ? (
                <div className="bg-panel border border-border rounded-xl p-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  <span className="text-xs font-mono text-text-muted">
                    Loading facility archive...
                  </span>
                </div>
              ) : filteredRegistry.length === 0 ? (
                <div className="bg-panel border border-border rounded-xl p-10 text-center space-y-1">
                  <FolderArchive className="w-8 h-8 text-text-muted/50 mx-auto" />
                  <h3 className="text-xs font-semibold text-text">No Patient Records Found</h3>
                  <p className="text-xs text-text-muted">Try adjusting your search query or status filter.</p>
                </div>
              ) : (
                <div className="bg-panel border border-border rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border bg-subpanel text-text-muted font-mono uppercase text-[11px] font-semibold">
                          <th className="py-3 px-4">Bed & Patient</th>
                          <th className="py-3 px-4">Admission Date</th>
                          <th className="py-3 px-4">Current Status</th>
                          <th className="py-3 px-4">Outcome Date</th>
                          <th className="py-3 px-4">Attending Staff</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredRegistry.map((p) => {
                          const admitDate = p.admittedDate ? new Date(p.admittedDate).toLocaleDateString() : 'N/A';
                          const dischargeDate = p.dischargeDate ? new Date(p.dischargeDate).toLocaleDateString() : '—';
                          const doctorName =
                            typeof p.dischargedBy === 'object' && p.dischargedBy?.name
                              ? p.dischargedBy.name
                              : typeof p.dischargedBy === 'string'
                              ? p.dischargedBy
                              : '—';

                          return (
                            <tr key={p._id} className="hover:bg-subpanel/60 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-accent bg-subpanel border border-border px-2 py-0.5 rounded text-xs tabular-nums">
                                    {p.bedNumber}
                                  </span>
                                  <span className="font-semibold text-text">
                                    {p.name}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3 px-4 font-mono text-text-muted">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-text-muted/60" />
                                  <span>{admitDate}</span>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                {p.status === 'active' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-accent bg-accent/10 border border-accent/20">
                                    In Hospital
                                  </span>
                                )}
                                {p.status === 'discharged' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-status-stable bg-status-stable/10 border border-status-stable/20">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Discharged
                                  </span>
                                )}
                                {p.status === 'deceased' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-status-fever bg-status-fever/10 border border-status-fever/20">
                                    Deceased
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-4 font-mono text-text-muted">
                                {dischargeDate}
                              </td>

                              <td className="py-3 px-4 font-mono text-xs text-text-muted">
                                {doctorName}
                              </td>

                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleInspectPatient(p)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-subpanel hover:bg-panel text-text text-xs font-mono transition-all"
                                >
                                  <Eye className="w-3.5 h-3.5 text-accent" />
                                  <span>Inspect</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STAFF MANAGEMENT */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h2 className="text-xs font-bold text-text uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-accent" />
                    <span>Clinical Staff Directory</span>
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Manage roles and credentials for Doctors, Nurses, and Administrators.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddStaffModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-btn hover:bg-btn-hover text-white text-xs font-semibold font-mono transition-all shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Onboard Staff</span>
                </button>
              </div>

              {isLoadingStaff ? (
                <div className="bg-panel border border-border rounded-xl p-10 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  <span className="text-xs font-mono text-text-muted">
                    Loading staff credentials...
                  </span>
                </div>
              ) : (
                <div className="bg-panel border border-border rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-subpanel text-text-muted font-mono uppercase text-[11px] font-semibold">
                        <th className="py-3 px-4">Staff ID</th>
                        <th className="py-3 px-4">Full Name</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {staffList.map((member) => (
                        <tr key={member._id} className="hover:bg-subpanel/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-accent tabular-nums">
                            {member.staffId}
                          </td>
                          <td className="py-3 px-4 font-semibold text-text">
                            {member.name}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                                member.role === 'doctor'
                                  ? 'bg-status-stable/10 text-status-stable border border-status-stable/20'
                                  : member.role === 'admin'
                                  ? 'bg-accent/10 text-accent border border-accent/20'
                                  : 'bg-subpanel text-text-muted border border-border'
                              }`}
                            >
                              {member.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-mono font-medium ${
                                member.active ? 'text-status-stable' : 'text-status-fever'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  member.active ? 'bg-status-stable' : 'bg-status-fever'
                                }`}
                              />
                              {member.active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleToggleStaffActive(member)}
                              className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all border ${
                                member.active
                                  ? 'border-border text-text-muted hover:text-status-fever hover:bg-alert'
                                  : 'border-status-stable/30 text-status-stable hover:bg-status-stable/10'
                              }`}
                            >
                              {member.active ? 'Deactivate' : 'Activate'}
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

          {/* TAB 4: DISCHARGE QUEUE */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xs font-bold text-text uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-status-stable" />
                  <span>Discharge Readiness Queue</span>
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Patients currently active in the facility who have completed 14 days and &ge;3 days afebrile.
                </p>
              </div>

              {dischargeQueue.length === 0 ? (
                <div className="bg-panel border border-border rounded-xl p-10 text-center space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-status-stable/60 mx-auto" />
                  <h3 className="text-xs font-semibold text-text">No Patients Awaiting Discharge</h3>
                  <p className="text-xs text-text-muted">All active patients are continuing their quarantine treatment.</p>
                </div>
              ) : (
                <div className="bg-panel border border-border rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-subpanel text-text-muted font-mono uppercase text-[11px] font-semibold">
                        <th className="py-3 px-4">Bed & Patient</th>
                        <th className="py-3 px-4">Quarantine Duration</th>
                        <th className="py-3 px-4">Afebrile Window</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {dischargeQueue.map((patient) => (
                        <tr key={patient._id} className="hover:bg-subpanel/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-accent bg-subpanel border border-border px-2 py-0.5 rounded text-xs tabular-nums">
                                {patient.bedNumber}
                              </span>
                              <span className="font-semibold text-text">{patient.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-status-stable font-medium">
                            &ge; 14 Days Complete
                          </td>
                          <td className="py-3 px-4 font-mono text-status-stable font-medium">
                            3+ Days Afebrile (&le;99.5&deg;F)
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link
                              href="/doctor"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-status-stable hover:bg-status-stable/90 text-white font-mono font-medium text-xs transition-all"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>Discharge in Doctor Portal</span>
                            </Link>
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
          title="Onboard Staff Member"
          description="Generates an incrementing Staff ID (e.g. N004, D002, A002) for authentication."
          maxWidth="md"
        >
          <form onSubmit={handleAddStaffSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-mono uppercase text-text-muted mb-1 font-semibold">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="e.g. Dr. Rebecca Stone, MD"
                disabled={isSubmittingStaff}
                className="w-full bg-input border border-border focus:border-accent text-text rounded-lg px-3 py-2 text-xs focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-text-muted mb-1 font-semibold">
                Staff Role Classification *
              </label>
              <select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value as StaffRole)}
                disabled={isSubmittingStaff}
                className="w-full bg-input border border-border focus:border-accent text-text rounded-lg px-3 py-2 text-xs focus:outline-none font-mono transition-all"
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
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-panel hover:bg-subpanel text-text text-xs font-mono font-medium transition-all"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmittingStaff || !newStaffName.trim()}
                className="flex-1 px-3 py-2 rounded-lg bg-btn hover:bg-btn-hover text-white text-xs font-semibold font-mono transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isSubmittingStaff ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create Account</span>
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
            <div className="space-y-3.5">
              <div>
                <h4 className="text-sm font-semibold text-text">{createdStaffInfo.name}</h4>
                <p className="text-xs text-text-muted capitalize font-mono mt-0.5">Role: {createdStaffInfo.role}</p>
              </div>

              <div className="bg-subpanel border border-border rounded-lg p-3 space-y-1 text-center">
                <span className="text-[10px] font-mono text-text-muted uppercase font-semibold">
                  Assigned Staff ID
                </span>
                <div className="text-2xl font-bold font-mono tabular-nums text-accent tracking-wider">
                  {createdStaffInfo.staffId}
                </div>
                <p className="text-[11px] text-text-muted">
                  Provide this Staff ID to the employee for logging in.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyStaffId}
                className="w-full py-2 px-3 rounded-lg bg-btn hover:bg-btn-hover text-white font-semibold font-mono text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                {hasCopiedId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-status-stable" />
                    <span>Copied to Clipboard</span>
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

        {/* PATIENT HISTORICAL DOSSIER INSPECTION MODAL */}
        <Modal
          isOpen={!!patientDetail}
          onClose={() => setPatientDetail(null)}
          title={`Patient Archive: Bed ${patientDetail?.patient.bedNumber || ''} — ${patientDetail?.patient.name || ''}`}
          maxWidth="lg"
        >
          {patientDetail && (
            <div className="space-y-4">
              {/* Status Outcome Banner */}
              <div
                className={`p-3.5 rounded-lg border flex items-center justify-between ${
                  patientDetail.patient.status === 'active'
                    ? 'bg-accent/10 border-accent/20 text-accent'
                    : patientDetail.patient.status === 'discharged'
                    ? 'bg-status-stable/10 border-status-stable/20 text-status-stable'
                    : 'bg-status-fever/10 border-status-fever/20 text-status-fever'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {patientDetail.patient.status === 'active' && <Activity className="w-4 h-4" />}
                  {patientDetail.patient.status === 'discharged' && <CheckCircle2 className="w-4 h-4" />}
                  {patientDetail.patient.status === 'deceased' && <HeartCrack className="w-4 h-4" />}
                  <div>
                    <h4 className="text-xs font-semibold uppercase font-mono">
                      {patientDetail.patient.status === 'active'
                        ? 'Active Inpatient'
                        : patientDetail.patient.status === 'discharged'
                        ? 'Discharged & Recovered'
                        : 'Deceased Record'}
                    </h4>
                    <p className="text-xs opacity-80 mt-0.5">
                      {patientDetail.patient.status === 'active'
                        ? 'Under active quarantine monitoring'
                        : `Certified on ${patientDetail.patient.dischargeDate ? new Date(patientDetail.patient.dischargeDate).toLocaleDateString() : 'Historical Archive'}`}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded bg-panel border border-border">
                  Bed {patientDetail.patient.bedNumber}
                </span>
              </div>

              {/* Patient Key Details Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-lg bg-subpanel border border-border">
                  <span className="text-[10px] font-mono uppercase text-text-muted">Admit Date</span>
                  <p className="text-xs font-mono font-semibold text-text mt-0.5">
                    {patientDetail.patient.admittedDate ? new Date(patientDetail.patient.admittedDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-subpanel border border-border">
                  <span className="text-[10px] font-mono uppercase text-text-muted">Outcome Date</span>
                  <p className="text-xs font-mono font-semibold text-text mt-0.5">
                    {patientDetail.patient.dischargeDate ? new Date(patientDetail.patient.dischargeDate).toLocaleDateString() : 'In Progress'}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-subpanel border border-border">
                  <span className="text-[10px] font-mono uppercase text-text-muted">Attending Staff</span>
                  <p className="text-xs font-mono font-semibold text-text mt-0.5 truncate">
                    {typeof patientDetail.patient.dischargedBy === 'object' && patientDetail.patient.dischargedBy?.name
                      ? patientDetail.patient.dischargedBy.name
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Recorded Temperature & Vitals Timeline */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-text uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-accent" />
                    <span>Vitals Log Curve ({patientDetail.temperatureLogs?.length || 0})</span>
                  </h4>
                </div>

                {isLoadingPatientDetails ? (
                  <div className="p-6 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-accent mx-auto" />
                  </div>
                ) : (!patientDetail.temperatureLogs || patientDetail.temperatureLogs.length === 0) ? (
                  <div className="p-3 rounded-lg bg-subpanel border border-border text-center text-xs text-text-muted font-mono">
                    No vital logs recorded.
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border bg-panel">
                    {patientDetail.temperatureLogs.map((v) => {
                      const isFever = v.hasFever || v.value > 99.5;
                      const timeStr = v.loggedAt ? new Date(v.loggedAt).toLocaleString() : '';
                      return (
                        <div key={v._id} className="p-2 flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${isFever ? 'bg-status-fever' : 'bg-status-stable'}`} />
                            <span className="text-text-muted">{timeStr}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`font-semibold tabular-nums ${isFever ? 'text-status-fever' : 'text-status-stable'}`}>
                              {v.value.toFixed(1)}&deg;F
                            </span>
                            {v.loggedBy?.name && (
                              <span className="text-[11px] text-text-muted truncate max-w-[120px]">
                                {v.loggedBy.name}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Doctor Consultation History if present */}
              {patientDetail.doctorVisits && patientDetail.doctorVisits.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-text uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-status-stable" />
                    <span>Clinical Consultations ({patientDetail.doctorVisits.length})</span>
                  </h4>
                  <div className="max-h-36 overflow-y-auto space-y-1.5">
                    {patientDetail.doctorVisits.map((c) => (
                      <div key={c._id} className="p-2.5 rounded-lg bg-subpanel border border-border text-xs space-y-0.5">
                        <div className="flex items-center justify-between text-text-muted font-mono text-[11px]">
                          <span>By: {c.visitedBy?.name || 'Attending MD'}</span>
                          <span>{c.visitedAt ? new Date(c.visitedAt).toLocaleDateString() : ''}</span>
                        </div>
                        <p className="text-text leading-relaxed font-sans">{c.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </AppLayout>
    </RoleGuard>
  );
}
