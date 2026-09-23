'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { RoleGuard } from '../../components/RoleGuard';
import { Modal } from '../../components/Modal';
import { TemperatureChart } from '../../components/TemperatureChart';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { Patient, PatientDetailResponse, TemperatureLog } from '../../types';
import {
  Search,
  RefreshCw,
  Plus,
  Loader2,
  ChevronRight,
  Bed,
  Flame,
  CheckCircle2,
  Clock,
  HeartPulse,
  Thermometer,
  ShieldAlert,
  Archive,
  Eye,
} from 'lucide-react';
import Link from 'next/link';

export default function NurseDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'pending' | 'fever' | 'discharged' | 'deceased' | 'all'>('active');

  // Selected patient & detail modal
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientDetail, setPatientDetail] = useState<PatientDetailResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Temperature form state
  const [tempInput, setTempInput] = useState('');
  const [isSubmittingTemp, setIsSubmittingTemp] = useState(false);

  // Duplicate 409 Conflict Modal
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<{
    logTime?: string;
    existingValue?: number;
    hasFever?: boolean;
    tempValueToRetry?: number;
  } | null>(null);

  const { showToast } = useToast();

  const fetchPatients = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Patient[]>('/api/patients?status=all');
      setPatients(data);
    } catch (err: any) {
      console.error('Failed to fetch patients', err);
      showToast(err.message || 'Error fetching patients', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const fetchPatientDetail = async (patientId: string) => {
    setSelectedPatientId(patientId);
    setIsLoadingDetail(true);
    setTempInput('');
    try {
      const data = await api.get<PatientDetailResponse>(`/api/patients/${patientId}`);
      setPatientDetail(data);
    } catch (err: any) {
      console.error('Failed to fetch patient detail', err);
      showToast('Could not load patient records', 'error');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleLogTemperature = async (force: boolean = false, overrideValue?: number) => {
    if (!selectedPatientId) return;
    const valueNum = overrideValue ?? parseFloat(tempInput);

    if (isNaN(valueNum) || valueNum < 30 || valueNum > 115) {
      showToast('Please enter a valid temperature (e.g. 98.6)', 'warning');
      return;
    }

    setIsSubmittingTemp(true);

    try {
      const endpoint = `/api/patients/${selectedPatientId}/temperature${force ? '?force=true' : ''}`;
      const newLog = await api.post<TemperatureLog>(endpoint, { value: valueNum });

      showToast(
        `Recorded ${newLog.value}°F ${newLog.hasFever ? '(Fever Detected)' : '(Afebrile / Stable)'}`,
        newLog.hasFever ? 'error' : 'info'
      );

      setTempInput('');
      setShowConflictModal(false);
      setConflictData(null);

      await Promise.all([fetchPatientDetail(selectedPatientId), fetchPatients()]);
    } catch (err: any) {
      console.error('Log temp error', err);

      if (err.status === 409) {
        const timeStr = err.data?.existingLogTime
          ? new Date(err.data.existingLogTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'earlier today';

        setConflictData({
          logTime: timeStr,
          existingValue: err.data?.existingValue,
          hasFever: err.data?.hasFever,
          tempValueToRetry: valueNum,
        });
        setShowConflictModal(true);
      } else {
        showToast(err.data?.error || err.message || 'Error logging temperature', 'error');
      }
    } finally {
      setIsSubmittingTemp(false);
    }
  };

  const activePatients = patients.filter((p) => p.status === 'active');
  const dischargedPatients = patients.filter((p) => p.status === 'discharged');
  const deceasedPatients = patients.filter((p) => p.status === 'deceased');

  const pendingCount = activePatients.filter((p) => !p.tempLoggedToday).length;
  const recordedCount = activePatients.filter((p) => p.tempLoggedToday).length;
  const feverCount = activePatients.filter((p) => (p.latestTemperature || p.latestTemp)?.hasFever).length;

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.bedNumber.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const latest = patient.latestTemperature || patient.latestTemp;
    if (statusFilter === 'active') return patient.status === 'active';
    if (statusFilter === 'pending') return patient.status === 'active' && !patient.tempLoggedToday;
    if (statusFilter === 'fever') return patient.status === 'active' && latest?.hasFever;
    if (statusFilter === 'discharged') return patient.status === 'discharged';
    if (statusFilter === 'deceased') return patient.status === 'deceased';
    return true; // 'all'
  });

  return (
    <RoleGuard allowedRoles={['nurse']}>
      <AppLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2 text-accent text-xs font-mono uppercase tracking-wider mb-1 font-semibold">
                <HeartPulse className="w-3.5 h-3.5" />
                <span>Bedside Nursing Station</span>
              </div>
              <h1 className="text-2xl font-bold text-text tracking-tight">
                Patient Vitals & Ward Census
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                Bedside temperature logging, fever surveillance, and patient records.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admit"
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-btn hover:bg-btn-hover text-white text-xs font-semibold font-mono transition-all shadow-sm"
              >
                <Bed className="w-3.5 h-3.5" />
                <span>Admit Patient</span>
              </Link>

              <button
                onClick={fetchPatients}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-panel hover:bg-subpanel text-text-muted hover:text-text text-xs font-medium font-mono transition-all"
                title="Refresh Census"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Active In-Ward */}
            <div className="bg-panel p-4 rounded-xl border border-border flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-mono uppercase text-text-muted font-semibold flex items-center justify-between">
                <span>In Hospital</span>
                <Bed className="w-3.5 h-3.5 text-accent" />
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-text font-mono tabular-nums">
                  {activePatients.length}
                </span>
                <span className="text-[11px] font-mono text-text-muted">
                  {recordedCount}/{activePatients.length} logged
                </span>
              </div>
            </div>

            {/* 2. Pending Vitals */}
            <div className="bg-panel p-4 rounded-xl border border-border flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-mono uppercase text-text-muted font-semibold flex items-center justify-between">
                <span>Pending Today</span>
                <Clock className="w-3.5 h-3.5 text-status-pending" />
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-status-pending font-mono tabular-nums">
                  {pendingCount}
                </span>
                <span className="text-[11px] font-mono text-status-pending">
                  Due today
                </span>
              </div>
            </div>

            {/* 3. Discharged */}
            <div className="bg-panel p-4 rounded-xl border border-border flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-mono uppercase text-text-muted font-semibold flex items-center justify-between">
                <span>Discharged</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-status-stable" />
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-status-stable font-mono tabular-nums">
                  {dischargedPatients.length}
                </span>
                <span className="text-[11px] font-mono text-status-stable">
                  Recovered
                </span>
              </div>
            </div>

            {/* 4. Total Census */}
            <div className="bg-panel p-4 rounded-xl border border-border flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-mono uppercase text-text-muted font-semibold flex items-center justify-between">
                <span>Total Archive</span>
                <Archive className="w-3.5 h-3.5 text-text-muted" />
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-text font-mono tabular-nums">
                  {patients.length}
                </span>
                <span className="text-[11px] font-mono text-text-muted">
                  {deceasedPatients.length} deceased
                </span>
              </div>
            </div>
          </div>

          {/* Search Bar & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bed or patient name..."
                className="w-full pl-9 pr-3 py-2 bg-input border border-border text-xs text-text rounded-lg focus:outline-none focus:border-accent placeholder:text-text-muted/50 font-mono transition-all"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-panel rounded-lg border border-border">
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all ${
                  statusFilter === 'active'
                    ? 'bg-subpanel text-accent font-semibold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                In Hospital ({activePatients.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all flex items-center gap-1.5 ${
                  statusFilter === 'pending'
                    ? 'bg-subpanel text-status-pending font-semibold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-status-pending" />
                <span>Pending ({pendingCount})</span>
              </button>
              <button
                onClick={() => setStatusFilter('fever')}
                className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all flex items-center gap-1.5 ${
                  statusFilter === 'fever'
                    ? 'bg-subpanel text-status-fever font-semibold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-status-fever" />
                <span>Febrile ({feverCount})</span>
              </button>
              <button
                onClick={() => setStatusFilter('discharged')}
                className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all flex items-center gap-1.5 ${
                  statusFilter === 'discharged'
                    ? 'bg-subpanel text-status-stable font-semibold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-status-stable" />
                <span>Discharged ({dischargedPatients.length})</span>
              </button>
              <button
                onClick={() => setStatusFilter('deceased')}
                className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all flex items-center gap-1.5 ${
                  statusFilter === 'deceased'
                    ? 'bg-subpanel text-status-fever font-semibold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-status-fever" />
                <span>Deceased ({deceasedPatients.length})</span>
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all ${
                  statusFilter === 'all'
                    ? 'bg-subpanel text-text font-semibold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                All Records ({patients.length})
              </button>
            </div>
          </div>

          {/* Patient Census Table */}
          <div className="bg-panel border border-border rounded-xl overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="py-16 text-center text-xs text-text-muted font-mono flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
                <span>Loading patient census...</span>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted font-mono">
                No patient records match the selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-subpanel text-text-muted text-[11px] font-mono uppercase">
                      <th className="py-3 px-4 font-semibold">Bed</th>
                      <th className="py-3 px-4 font-semibold">Patient Name</th>
                      <th className="py-3 px-4 font-semibold">Admission Date</th>
                      <th className="py-3 px-4 font-semibold">Latest Reading</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPatients.map((patient) => {
                      const latest = patient.latestTemperature || patient.latestTemp;
                      const hasFever = latest?.hasFever;
                      const isLogged = patient.tempLoggedToday;
                      const isDischarged = patient.status === 'discharged';
                      const isDeceased = patient.status === 'deceased';

                      return (
                        <tr
                          key={patient._id}
                          onClick={() => fetchPatientDetail(patient._id)}
                          className="hover:bg-subpanel/60 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-accent tabular-nums whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-subpanel border border-border text-xs">
                              {patient.bedNumber}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-medium text-text">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{patient.name}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-text-muted font-mono tabular-nums whitespace-nowrap">
                            {new Date(patient.admittedDate).toLocaleDateString()}
                          </td>

                          <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                            {latest ? (
                              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${
                                latest.hasFever
                                  ? 'bg-status-fever/10 text-status-fever border border-status-fever/20'
                                  : 'bg-status-stable/10 text-status-stable border border-status-stable/20'
                              }`}>
                                {latest.value.toFixed(1)}°F
                              </span>
                            ) : (
                              <span className="text-text-muted font-mono text-[11px]">Pending</span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                            {isDischarged ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-status-stable bg-status-stable/10 border border-status-stable/20 text-[11px] font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Discharged</span>
                              </span>
                            ) : isDeceased ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-status-fever bg-status-fever/10 border border-status-fever/20 text-[11px] font-medium">
                                <span>Deceased</span>
                              </span>
                            ) : isLogged ? (
                              <span className="inline-flex items-center gap-1.5 text-status-stable text-[11px] font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Logged today</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-status-pending text-[11px] font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Needs log</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchPatientDetail(patient._id);
                              }}
                              className="px-2.5 py-1.5 rounded-md border border-border bg-subpanel hover:bg-panel text-text font-mono text-xs transition-all inline-flex items-center gap-1"
                            >
                              <Thermometer className="w-3.5 h-3.5 text-accent" />
                              <span>{patient.status === 'active' ? 'Log Vitals' : 'Inspect'}</span>
                              <ChevronRight className="w-3 h-3 text-text-muted" />
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
        </div>

        {/* PATIENT VITAL DOSSIER MODAL */}
        <Modal
          isOpen={!!selectedPatientId}
          onClose={() => {
            setSelectedPatientId(null);
            setPatientDetail(null);
          }}
          title={patientDetail ? `${patientDetail.patient.bedNumber} — ${patientDetail.patient.name}` : 'Patient Vitals Dossier'}
          description="Bedside vital history, temperature trend curve, and clinical outcome."
          maxWidth="lg"
        >
          {isLoadingDetail ? (
            <div className="py-12 text-center text-xs text-text-muted font-mono flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
              <span>Retrieving medical records...</span>
            </div>
          ) : patientDetail ? (
            <div className="space-y-4">
              {/* Outcome Banner for Discharged or Deceased Records */}
              {patientDetail.patient.status === 'discharged' && (
                <div className="p-3.5 rounded-lg bg-status-stable/10 border border-status-stable/20 text-text space-y-0.5">
                  <div className="flex items-center gap-2 font-semibold font-mono text-xs text-status-stable">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Patient Discharged & Recovered</span>
                  </div>
                  <p className="text-xs text-text-muted">
                    Discharged on{' '}
                    <strong className="text-text font-mono">
                      {patientDetail.patient.dischargeDate
                        ? new Date(patientDetail.patient.dischargeDate).toLocaleDateString()
                        : 'Completed'}
                    </strong>
                    {patientDetail.patient.dischargedBy && (
                      <> by <span className="text-accent font-semibold">{patientDetail.patient.dischargedBy.name}</span></>
                    )}. Bed released.
                  </p>
                </div>
              )}

              {patientDetail.patient.status === 'deceased' && (
                <div className="p-3.5 rounded-lg bg-status-fever/10 border border-status-fever/20 text-text space-y-0.5">
                  <div className="flex items-center gap-2 font-semibold font-mono text-xs text-status-fever">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Patient Deceased Record</span>
                  </div>
                  <p className="text-xs text-text-muted">
                    Recorded deceased on{' '}
                    <strong className="text-text font-mono">
                      {patientDetail.patient.dischargeDate
                        ? new Date(patientDetail.patient.dischargeDate).toLocaleDateString()
                        : 'Recorded'}
                    </strong>
                    . Archived for epidemiological surveillance.
                  </p>
                </div>
              )}

              {/* Patient Key Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-subpanel border border-border rounded-lg text-xs font-mono">
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-semibold">Admitted</span>
                  <span className="font-bold text-text tabular-nums">
                    {new Date(patientDetail.patient.admittedDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-semibold">Quarantine Day</span>
                  <span className="font-bold text-accent tabular-nums">
                    Day {Math.max(1, Math.ceil((Date.now() - new Date(patientDetail.patient.admittedDate).getTime()) / (1000 * 60 * 60 * 24)))}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-semibold">Afebrile Streak</span>
                  <span className="font-bold text-status-stable tabular-nums">
                    {patientDetail.patient.eligibility?.consecutiveFeverFreeDays ?? (patientDetail.patient as any).consecutiveFeverFreeDays ?? 0} / 3 days
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-semibold">Current Status</span>
                  <span className={`font-bold capitalize ${
                    patientDetail.patient.status === 'active'
                      ? 'text-accent'
                      : patientDetail.patient.status === 'discharged'
                      ? 'text-status-stable'
                      : 'text-status-fever'
                  }`}>
                    {patientDetail.patient.status === 'active' ? 'In Hospital' : patientDetail.patient.status}
                  </span>
                </div>
              </div>

              {/* Log Temperature Entry Form (Active patients only) */}
              {patientDetail.patient.status === 'active' && (
                <div className="p-3.5 bg-subpanel border border-border rounded-lg space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold uppercase tracking-wider text-text flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-accent" />
                      <span>Record Temperature</span>
                    </span>
                    <span className="text-[11px] font-mono text-text-muted">Fever: &gt; 99.5°F</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.1"
                        min="90"
                        max="110"
                        value={tempInput}
                        onChange={(e) => setTempInput(e.target.value)}
                        placeholder="e.g. 98.6"
                        disabled={isSubmittingTemp}
                        className="w-full bg-input border border-border focus:border-accent text-text rounded-lg px-3 py-2 text-sm font-mono tabular-nums focus:outline-none placeholder:text-text-muted/40 transition-all"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleLogTemperature(false);
                          }
                        }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-text-muted font-bold">
                        °F
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLogTemperature(false)}
                      disabled={isSubmittingTemp || !tempInput.trim()}
                      className="px-4 py-2 rounded-lg bg-btn hover:bg-btn-hover disabled:opacity-50 text-white text-xs font-semibold font-mono transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      {isSubmittingTemp ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Save Reading</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Temperature Trend Area Curve */}
              <TemperatureChart logs={patientDetail.temperatureLogs || []} />

              {/* Temperature History Table */}
              <div className="space-y-1.5">
                <div className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
                  Recorded Readings Log ({patientDetail.temperatureLogs?.length || 0})
                </div>

                <div className="max-h-40 overflow-y-auto border border-border rounded-lg bg-panel">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-subpanel text-text-muted uppercase text-[10px] font-mono border-b border-border sticky top-0">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Timestamp</th>
                        <th className="py-2 px-3 font-semibold">Reading</th>
                        <th className="py-2 px-3 font-semibold">Classification</th>
                        <th className="py-2 px-3 font-semibold text-right">Nurse</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-text font-mono text-xs">
                      {!patientDetail.temperatureLogs || patientDetail.temperatureLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-text-muted">
                            No readings recorded.
                          </td>
                        </tr>
                      ) : (
                        patientDetail.temperatureLogs.map((log) => (
                          <tr key={log._id} className="hover:bg-subpanel/50">
                            <td className="py-1.5 px-3 text-text-muted tabular-nums">
                              {new Date(log.loggedAt).toLocaleString()}
                            </td>
                            <td className="py-1.5 px-3 font-semibold tabular-nums">
                              <span className={log.hasFever ? 'text-status-fever' : 'text-status-stable'}>
                                {log.value.toFixed(1)}°F
                              </span>
                            </td>
                            <td className="py-1.5 px-3">
                              {log.hasFever ? (
                                <span className="text-status-fever font-medium flex items-center gap-1">
                                  <Flame className="w-3 h-3" />
                                  <span>Fever</span>
                                </span>
                              ) : (
                                <span className="text-status-stable font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Afebrile</span>
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-3 text-right text-text-muted">
                              {log.loggedBy?.name || log.loggedBy?.staffId || 'Nurse'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </Modal>

        {/* 409 DUPLICATE CONFLICT CONFIRMATION MODAL */}
        <Modal
          isOpen={showConflictModal}
          onClose={() => setShowConflictModal(false)}
          title="Duplicate Reading Warning"
          maxWidth="sm"
        >
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-alert border border-status-fever/30 text-xs text-text space-y-1">
              <p className="font-semibold text-status-fever flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                <span>Reading of {conflictData?.existingValue}°F already logged at {conflictData?.logTime}.</span>
              </p>
              <p className="text-text-muted">
                Overwrite today&apos;s record with <strong className="text-text">{conflictData?.tempValueToRetry}°F</strong>?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConflictModal(false)}
                className="flex-1 py-2 px-3 rounded-lg border border-border bg-panel hover:bg-subpanel text-text text-xs font-mono font-medium transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleLogTemperature(true, conflictData?.tempValueToRetry)}
                disabled={isSubmittingTemp}
                className="flex-1 py-2 px-3 rounded-lg bg-status-fever hover:brightness-110 text-white text-xs font-semibold font-mono transition-all flex items-center justify-center gap-1.5"
              >
                {isSubmittingTemp ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Overwrite</span>
                )}
              </button>
            </div>
          </div>
        </Modal>
      </AppLayout>
    </RoleGuard>
  );
}
