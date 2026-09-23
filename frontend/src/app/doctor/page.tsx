'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { RoleGuard } from '../../components/RoleGuard';
import { Modal } from '../../components/Modal';
import { TemperatureChart } from '../../components/TemperatureChart';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { Patient, PatientDetailResponse, DoctorVisit } from '../../types';
import {
  Stethoscope,
  Search,
  RefreshCw,
  Loader2,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Award,
  HeartPulse,
  ShieldAlert,
  Archive,
} from 'lucide-react';

export default function DoctorDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'active' | 'not-visited' | 'discharge-eligible' | 'discharged' | 'deceased' | 'all'>('not-visited');

  // Selected patient detail
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientDetail, setPatientDetail] = useState<PatientDetailResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Visit logging form
  const [visitNotes, setVisitNotes] = useState('');
  const [isSubmittingVisit, setIsSubmittingVisit] = useState(false);
  const [visitErrorMessage, setVisitErrorMessage] = useState('');

  // Discharge modal state
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargeNotes, setDischargeNotes] = useState('');
  const [isSubmittingDischarge, setIsSubmittingDischarge] = useState(false);

  // Mark Deceased modal state
  const [showDeceasedModal, setShowDeceasedModal] = useState(false);
  const [deceasedNotes, setDeceasedNotes] = useState('');
  const [isSubmittingDeceased, setIsSubmittingDeceased] = useState(false);

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
    setVisitNotes('');
    setVisitErrorMessage('');
    try {
      const data = await api.get<PatientDetailResponse>(`/api/patients/${patientId}`);
      setPatientDetail(data);
    } catch (err: any) {
      console.error('Failed to fetch patient detail', err);
      showToast('Could not load patient medical records', 'error');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleRecordVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !visitNotes.trim()) return;

    setVisitErrorMessage('');
    setIsSubmittingVisit(true);

    try {
      await api.post<DoctorVisit>(
        `/api/patients/${selectedPatientId}/visit`,
        { notes: visitNotes.trim() }
      );

      showToast('Clinical rounds consultation note recorded', 'info');
      setVisitNotes('');

      await Promise.all([fetchPatientDetail(selectedPatientId), fetchPatients()]);
    } catch (err: any) {
      console.error('Visit error', err);
      const msg = err.data?.error || err.message || 'Failed to record visit.';
      setVisitErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmittingVisit(false);
    }
  };

  const handleDischargePatient = async () => {
    if (!selectedPatientId) return;
    setIsSubmittingDischarge(true);

    try {
      await api.post(`/api/patients/${selectedPatientId}/discharge`, {
        notes: dischargeNotes.trim(),
      });

      showToast(
        `Patient ${patientDetail?.patient.name} cleared and discharged successfully`,
        'info'
      );

      setShowDischargeModal(false);
      setDischargeNotes('');
      setSelectedPatientId(null);
      setPatientDetail(null);
      await fetchPatients();
    } catch (err: any) {
      console.error('Discharge error', err);
      showToast(err.data?.error || err.message || 'Error processing discharge', 'error');
    } finally {
      setIsSubmittingDischarge(false);
    }
  };

  const handleMarkDeceased = async () => {
    if (!selectedPatientId) return;
    if (!deceasedNotes.trim()) {
      showToast('Clinical deceased summary note is required', 'warning');
      return;
    }

    setIsSubmittingDeceased(true);

    try {
      await api.post(`/api/patients/${selectedPatientId}/mark-deceased`, {
        notes: deceasedNotes.trim(),
      });

      showToast(
        `Patient record marked as deceased`,
        'warning'
      );

      setShowDeceasedModal(false);
      setDeceasedNotes('');
      setSelectedPatientId(null);
      setPatientDetail(null);
      await fetchPatients();
    } catch (err: any) {
      console.error('Deceased error', err);
      showToast(err.data?.error || err.message || 'Error updating record', 'error');
    } finally {
      setIsSubmittingDeceased(false);
    }
  };

  const activePatients = patients.filter((p) => p.status === 'active');
  const dischargedPatients = patients.filter((p) => p.status === 'discharged');
  const deceasedPatients = patients.filter((p) => p.status === 'deceased');

  const unvisitedCount = activePatients.filter((p) => !p.visitedToday).length;
  const eligibleCount = activePatients.filter((p) => p.dischargeEligible).length;

  const filteredPatients = patients
    .filter((patient) => {
      const matchesSearch =
        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.bedNumber.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterTab === 'active') return patient.status === 'active';
      if (filterTab === 'not-visited') return patient.status === 'active' && !patient.visitedToday;
      if (filterTab === 'discharge-eligible') return patient.status === 'active' && patient.dischargeEligible;
      if (filterTab === 'discharged') return patient.status === 'discharged';
      if (filterTab === 'deceased') return patient.status === 'deceased';
      return true; // 'all'
    })
    .sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      if (a.visitedToday === b.visitedToday) return 0;
      return a.visitedToday ? 1 : -1;
    });

  return (
    <RoleGuard allowedRoles={['doctor']}>
      <AppLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2 text-accent text-xs font-mono uppercase tracking-wider mb-1 font-semibold">
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Physician Station</span>
              </div>
              <h1 className="text-2xl font-bold text-text tracking-tight">
                Physician Rounds & Consultations
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                Review temperature curves, record daily consultations, and authorize patient discharges.
              </p>
            </div>

            <div className="flex items-center gap-2">
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

          {/* KPI Rounds Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-panel p-4 rounded-xl border border-border flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-mono uppercase text-text-muted font-semibold flex items-center justify-between">
                <span>Rounds Needed</span>
                <Clock className="w-3.5 h-3.5 text-status-pending" />
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-status-pending font-mono tabular-nums">
                  {unvisitedCount}
                </span>
                <span className="text-[11px] font-mono text-status-pending">
                  Due today
                </span>
              </div>
            </div>

            <div className="bg-panel p-4 rounded-xl border border-border flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-mono uppercase text-text-muted font-semibold flex items-center justify-between">
                <span>Discharge Ready</span>
                <Award className="w-3.5 h-3.5 text-status-stable" />
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-status-stable font-mono tabular-nums">
                  {eligibleCount}
                </span>
                <span className="text-[11px] font-mono text-status-stable">
                  &ge; 3d afebrile
                </span>
              </div>
            </div>

            <div className="bg-panel p-4 rounded-xl border border-border flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-mono uppercase text-text-muted font-semibold flex items-center justify-between">
                <span>Discharged</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-status-stable" />
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-status-stable font-mono tabular-nums">
                  {dischargedPatients.length}
                </span>
                <span className="text-[11px] font-mono text-text-muted">
                  Recovered
                </span>
              </div>
            </div>

            <div className="bg-panel p-4 rounded-xl border border-border flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-mono uppercase text-text-muted font-semibold flex items-center justify-between">
                <span>Total Patients</span>
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

          {/* Search & Tabs */}
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

            <div className="flex flex-wrap items-center gap-1 p-1 bg-panel rounded-lg border border-border">
              <button
                onClick={() => setFilterTab('not-visited')}
                className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all flex items-center gap-1.5 ${
                  filterTab === 'not-visited'
                    ? 'bg-subpanel text-status-pending font-semibold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-status-pending" />
                <span>Rounds Needed ({unvisitedCount})</span>
              </button>
              <button
                onClick={() => setFilterTab('active')}
                className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all ${
                  filterTab === 'active'
                    ? 'bg-subpanel text-accent font-semibold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                In Hospital ({activePatients.length})
              </button>
              <button
                onClick={() => setFilterTab('discharge-eligible')}
                className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all flex items-center gap-1.5 ${
                  filterTab === 'discharge-eligible'
                    ? 'bg-subpanel text-status-stable font-semibold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-status-stable" />
                <span>Discharge Ready ({eligibleCount})</span>
              </button>
              <button
                onClick={() => setFilterTab('discharged')}
                className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all flex items-center gap-1.5 ${
                  filterTab === 'discharged'
                    ? 'bg-subpanel text-status-stable font-semibold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-status-stable" />
                <span>Discharged ({dischargedPatients.length})</span>
              </button>
              <button
                onClick={() => setFilterTab('deceased')}
                className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all flex items-center gap-1.5 ${
                  filterTab === 'deceased'
                    ? 'bg-subpanel text-status-fever font-semibold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-status-fever" />
                <span>Deceased ({deceasedPatients.length})</span>
              </button>
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all ${
                  filterTab === 'all'
                    ? 'bg-subpanel text-text font-semibold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                All Records ({patients.length})
              </button>
            </div>
          </div>

          {/* Patient Table */}
          <div className="bg-panel border border-border rounded-xl overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="py-16 text-center text-xs text-text-muted font-mono flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
                <span>Loading physician census...</span>
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
                      <th className="py-3 px-4 font-semibold">Latest Temp</th>
                      <th className="py-3 px-4 font-semibold">Afebrile Streak</th>
                      <th className="py-3 px-4 font-semibold">Rounds Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPatients.map((patient) => {
                      const isVisited = patient.visitedToday;
                      const isEligible = patient.status === 'active' && patient.dischargeEligible;
                      const isDischarged = patient.status === 'discharged';
                      const isDeceased = patient.status === 'deceased';
                      const latest = patient.latestTemperature || patient.latestTemp;

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
                              {isEligible && (
                                <span className="font-mono text-[10px] px-2 py-0.2 rounded-full bg-status-stable/10 text-status-stable border border-status-stable/20 font-bold uppercase">
                                  Eligible
                                </span>
                              )}
                              {isDischarged && (
                                <span className="font-mono text-[10px] px-2 py-0.2 rounded-full bg-status-stable/10 text-status-stable border border-status-stable/20 font-bold uppercase">
                                  Discharged
                                </span>
                              )}
                              {isDeceased && (
                                <span className="font-mono text-[10px] px-2 py-0.2 rounded-full bg-status-fever/10 text-status-fever border border-status-fever/20 font-bold uppercase">
                                  Deceased
                                </span>
                              )}
                            </div>
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
                              <span className="text-text-muted">Not recorded</span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                            <span className={`font-semibold px-2 py-0.5 rounded text-xs ${
                              (patient.eligibility?.consecutiveFeverFreeDays ?? (patient as any).consecutiveFeverFreeDays ?? 0) >= 3
                                ? 'bg-status-stable/10 text-status-stable border border-status-stable/20'
                                : 'bg-subpanel text-text border border-border'
                            }`}>
                              {patient.eligibility?.consecutiveFeverFreeDays ?? (patient as any).consecutiveFeverFreeDays ?? 0} / 3 days
                            </span>
                          </td>

                          <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                            {isDischarged ? (
                              <span className="text-status-stable font-medium text-[11px]">
                                Cleared ({patient.dischargeDate ? new Date(patient.dischargeDate).toLocaleDateString() : 'Discharged'})
                              </span>
                            ) : isDeceased ? (
                              <span className="text-status-fever font-medium text-[11px]">
                                Deceased ({patient.dischargeDate ? new Date(patient.dischargeDate).toLocaleDateString() : 'Deceased'})
                              </span>
                            ) : isVisited ? (
                              <span className="inline-flex items-center gap-1.5 text-status-stable text-[11px] font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Visited today</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-status-pending text-[11px] font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Rounds pending</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {isEligible && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchPatientDetail(patient._id).then(() => setShowDischargeModal(true));
                                  }}
                                  className="px-2.5 py-1.5 rounded-md bg-status-stable hover:bg-status-stable/90 text-white font-mono text-xs font-semibold transition-all inline-flex items-center gap-1"
                                  title="Authorize Discharge"
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  <span>Discharge</span>
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fetchPatientDetail(patient._id);
                                }}
                                className="px-2.5 py-1.5 rounded-md border border-border bg-subpanel hover:bg-panel text-text font-mono text-xs transition-all inline-flex items-center gap-1"
                              >
                                <Stethoscope className="w-3.5 h-3.5 text-accent" />
                                <span>{patient.status === 'active' ? 'Examine' : 'Inspect'}</span>
                                <ChevronRight className="w-3 h-3 text-text-muted" />
                              </button>
                            </div>
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

        {/* PATIENT DETAIL & CLINICAL CONSULTATION MODAL */}
        <Modal
          isOpen={!!selectedPatientId}
          onClose={() => {
            setSelectedPatientId(null);
            setPatientDetail(null);
            setVisitErrorMessage('');
          }}
          title={patientDetail ? `${patientDetail.patient.bedNumber} — ${patientDetail.patient.name}` : 'Physician Evaluation'}
          description="Vital sign curves, clinical visit notes, and discharge authority."
          maxWidth="lg"
        >
          {isLoadingDetail ? (
            <div className="py-12 text-center text-xs text-text-muted font-mono flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
              <span>Loading patient records...</span>
            </div>
          ) : patientDetail ? (
            (() => {
              const isEligible = Boolean(
                patientDetail.patient.status === 'active' &&
                (patientDetail.patient.dischargeEligible ||
                  patientDetail.eligibility?.isEligible ||
                  (patientDetail.patient.eligibility && patientDetail.patient.eligibility.isEligible))
              );
              const consecutiveDays =
                patientDetail.patient.eligibility?.consecutiveFeverFreeDays ??
                patientDetail.eligibility?.consecutiveFeverFreeDays ??
                (patientDetail.patient as any).consecutiveFeverFreeDays ??
                0;
              const hasTempToday = Boolean(
                patientDetail.patient.tempLoggedToday || patientDetail.tempLoggedToday
              );

              return (
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
                        . Bed released.
                      </p>
                    </div>
                  )}

                  {/* Discharge Eligibility Status Ribbon (Active Patients) */}
                  {patientDetail.patient.status === 'active' && (
                    <div
                      className={`p-3.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isEligible
                          ? 'border-status-stable/30 bg-status-stable/10 text-text'
                          : 'border-border bg-subpanel text-text-muted'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-text flex items-center gap-2 font-mono text-xs">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isEligible ? 'bg-status-stable' : 'bg-status-pending'
                            }`}
                          />
                          <span>
                            {isEligible
                              ? 'Discharge Protocol: Eligible For Release'
                              : 'Discharge Protocol: Surveillance In Progress'}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted mt-0.5 font-mono">
                          {consecutiveDays} consecutive fever-free days recorded (required: 3+ days &le;99.5°F).
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowDischargeModal(true)}
                          disabled={!isEligible}
                          className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            isEligible
                              ? 'bg-status-stable hover:bg-status-stable/90 text-white cursor-pointer'
                              : 'bg-panel text-text-muted border border-border cursor-not-allowed opacity-50'
                          }`}
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Discharge</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowDeceasedModal(true)}
                          className="px-2.5 py-1.5 rounded-lg border border-border bg-panel hover:bg-alert hover:border-status-fever/40 text-text-muted hover:text-status-fever font-mono text-xs transition-all"
                        >
                          Deceased
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Temperature Trend Area Curve */}
                  <TemperatureChart logs={patientDetail.temperatureLogs || []} />

                  {/* Record Visit Form (Active patients only) */}
                  {patientDetail.patient.status === 'active' && (
                    <form onSubmit={handleRecordVisit} className="p-3.5 bg-subpanel border border-border rounded-lg space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold uppercase tracking-wider text-text flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-accent" />
                          <span>Physician Consultation Notes</span>
                        </span>
                        <span className="text-[11px] font-mono">
                          {hasTempToday ? (
                            <span className="text-status-stable font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Temp Logged</span>
                            </span>
                          ) : (
                            <span className="text-status-pending font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Temp Pending</span>
                            </span>
                          )}
                        </span>
                      </div>

                      {visitErrorMessage && (
                        <div className="p-2.5 rounded-lg bg-alert border border-status-fever/30 text-xs text-text flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-status-fever shrink-0 mt-0.5" />
                          <span className="font-mono">{visitErrorMessage}</span>
                        </div>
                      )}

                      <div>
                        <textarea
                          rows={3}
                          required
                          value={visitNotes}
                          onChange={(e) => {
                            setVisitNotes(e.target.value);
                            if (visitErrorMessage) setVisitErrorMessage('');
                          }}
                          placeholder="Document clinical assessment, respiratory examination, symptoms, medication plan..."
                          disabled={isSubmittingVisit}
                          className="w-full bg-input border border-border focus:border-accent text-text rounded-lg p-2.5 text-xs focus:outline-none resize-none placeholder:text-text-muted/40 transition-all"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isSubmittingVisit || !visitNotes.trim()}
                          className="px-4 py-2 rounded-lg bg-btn hover:bg-btn-hover disabled:opacity-50 text-white text-xs font-semibold font-mono transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          {isSubmittingVisit ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Stethoscope className="w-3.5 h-3.5" />
                              <span>Sign Consultation Note</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Consultation History */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
                      Consultation History ({patientDetail.doctorVisits?.length || 0})
                    </div>

                    <div className="max-h-40 overflow-y-auto divide-y divide-border border border-border rounded-lg bg-panel">
                      {!patientDetail.doctorVisits || patientDetail.doctorVisits.length === 0 ? (
                        <div className="py-4 text-center text-xs text-text-muted font-mono">
                          No previous physician visits recorded.
                        </div>
                      ) : (
                        patientDetail.doctorVisits.map((visit) => (
                          <div key={visit._id} className="p-3 space-y-0.5 hover:bg-subpanel/50 transition-colors">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="font-semibold text-accent">
                                {visit.visitedBy?.name || visit.visitedBy?.staffId || 'Attending Physician'}
                              </span>
                              <span className="text-text-muted text-[11px] tabular-nums">
                                {new Date(visit.visitedAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-text-muted leading-relaxed whitespace-pre-wrap font-sans">
                              {visit.notes}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : null}
        </Modal>

        {/* DISCHARGE CONFIRMATION MODAL */}
        <Modal
          isOpen={showDischargeModal}
          onClose={() => setShowDischargeModal(false)}
          title="Physician Discharge Clearance"
          description="Patient has completed the required afebrile window. Authorizing discharge will release the assigned bed."
          maxWidth="md"
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono uppercase text-text-muted mb-1.5 font-semibold">
                Discharge Summary Note (Optional)
              </label>
              <textarea
                rows={3}
                value={dischargeNotes}
                onChange={(e) => setDischargeNotes(e.target.value)}
                placeholder="Final clearance assessment, follow-up instructions..."
                className="w-full bg-input border border-border focus:border-accent text-text rounded-lg p-2.5 text-xs focus:outline-none resize-none transition-all"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDischargeModal(false)}
                className="flex-1 py-2 px-3 rounded-lg border border-border bg-panel hover:bg-subpanel text-text text-xs font-mono font-medium transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDischargePatient}
                disabled={isSubmittingDischarge}
                className="flex-1 py-2 px-3 rounded-lg bg-status-stable hover:bg-status-stable/90 text-white text-xs font-semibold font-mono transition-all flex items-center justify-center gap-1.5"
              >
                {isSubmittingDischarge ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Authorize Discharge</span>
                )}
              </button>
            </div>
          </div>
        </Modal>

        {/* MARK DECEASED MODAL */}
        <Modal
          isOpen={showDeceasedModal}
          onClose={() => setShowDeceasedModal(false)}
          title="Clinical Deceased Record"
          description="This action marks the patient record as deceased and updates epidemiological surveillance."
          maxWidth="md"
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono uppercase text-text-muted mb-1.5 font-semibold">
                Clinical Summary & Cause of Death *
              </label>
              <textarea
                rows={3}
                required
                value={deceasedNotes}
                onChange={(e) => setDeceasedNotes(e.target.value)}
                placeholder="Clinical details, time of declaration, epidemiological reporting..."
                className="w-full bg-input border border-border focus:border-accent text-text rounded-lg p-2.5 text-xs focus:outline-none resize-none transition-all"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeceasedModal(false)}
                className="flex-1 py-2 px-3 rounded-lg border border-border bg-panel hover:bg-subpanel text-text text-xs font-mono font-medium transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleMarkDeceased}
                disabled={isSubmittingDeceased || !deceasedNotes.trim()}
                className="flex-1 py-2 px-3 rounded-lg bg-status-fever hover:brightness-110 text-white text-xs font-semibold font-mono transition-all flex items-center justify-center gap-1.5"
              >
                {isSubmittingDeceased ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Confirm Deceased</span>
                )}
              </button>
            </div>
          </div>
        </Modal>
      </AppLayout>
    </RoleGuard>
  );
}
