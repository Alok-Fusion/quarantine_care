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
} from 'lucide-react';

export default function DoctorDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'not-visited' | 'all' | 'discharge-eligible'>('not-visited');

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
      const data = await api.get<Patient[]>('/api/patients');
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

      showToast('Clinical visit consultation recorded', 'info');
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
        `Patient ${patientDetail?.patient.name} discharged successfully`,
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
      showToast('Clinical deceased note is required', 'warning');
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

  const filteredPatients = patients
    .filter((patient) => {
      const matchesSearch =
        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.bedNumber.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterTab === 'not-visited') return !patient.visitedToday;
      if (filterTab === 'discharge-eligible') return patient.dischargeEligible;
      return true;
    })
    .sort((a, b) => {
      if (a.visitedToday === b.visitedToday) return 0;
      return a.visitedToday ? 1 : -1;
    });

  const unvisitedCount = patients.filter((p) => !p.visitedToday).length;
  const eligibleCount = patients.filter((p) => p.dischargeEligible).length;

  return (
    <RoleGuard allowedRoles={['doctor']}>
      <AppLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2 text-text-muted text-[11px] font-mono uppercase tracking-wider mb-1">
                <span>Clinical Rounds</span>
                <span>•</span>
                <span>Physician Station</span>
              </div>
              <h1 className="text-xl font-bold text-text tracking-tight">
                Physician Rounds Console
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                Review bedside temperature curves, record daily consultations, and clear discharge-eligible patients.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchPatients}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] border border-border bg-panel hover:bg-panel-hover text-text-muted hover:text-text text-xs font-medium transition-colors"
                title="Refresh Census"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
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
                placeholder="Filter by bed or patient name..."
                className="w-full pl-8 pr-3 py-1.5 bg-input border border-border text-xs text-text rounded-[3px] focus:outline-none focus:border-accent placeholder:text-text-muted/60 font-mono transition-colors"
              />
            </div>

            <div className="flex items-center gap-1 p-0.5 bg-panel border border-border rounded-[3px]">
              <button
                onClick={() => setFilterTab('not-visited')}
                className={`px-3 py-1 text-xs font-mono transition-colors rounded-[2px] flex items-center gap-1.5 ${
                  filterTab === 'not-visited'
                    ? 'bg-subpanel text-text font-bold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-status-pending" />
                <span>Rounds Needed ({unvisitedCount})</span>
              </button>
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1 text-xs font-mono transition-colors rounded-[2px] ${
                  filterTab === 'all'
                    ? 'bg-subpanel text-text font-bold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                All Census ({patients.length})
              </button>
              <button
                onClick={() => setFilterTab('discharge-eligible')}
                className={`px-3 py-1 text-xs font-mono transition-colors rounded-[2px] flex items-center gap-1.5 ${
                  filterTab === 'discharge-eligible'
                    ? 'bg-subpanel text-text font-bold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-status-stable" />
                <span>Discharge Ready ({eligibleCount})</span>
              </button>
            </div>
          </div>

          {/* DENSE SINGLE-COLUMN PATIENT TABLE/LIST */}
          <div className="border border-border bg-panel rounded-[3px] overflow-hidden">
            {isLoading ? (
              <div className="py-16 text-center text-xs text-text-muted font-mono flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading clinical census...</span>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted font-mono">
                NO PATIENT RECORDS MATCHING FILTER
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-subpanel text-text-muted text-[10px] font-mono uppercase">
                      <th className="py-2.5 px-4 font-semibold border-r border-border">Bed</th>
                      <th className="py-2.5 px-4 font-semibold border-r border-border">Patient Name</th>
                      <th className="py-2.5 px-4 font-semibold border-r border-border">Latest Temp</th>
                      <th className="py-2.5 px-4 font-semibold border-r border-border">Fever-Free Streak</th>
                      <th className="py-2.5 px-4 font-semibold border-r border-border">Rounds Status</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Consultation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPatients.map((patient) => {
                      const isVisited = patient.visitedToday;
                      const isEligible = patient.dischargeEligible;
                      const latest = patient.latestTemperature || patient.latestTemp;
                      const hasFever = latest?.hasFever;

                      let borderClass = 'border-l-status-pending';
                      let dotClass = 'bg-status-pending';

                      if (isEligible) {
                        borderClass = 'border-l-status-stable';
                        dotClass = 'bg-status-stable';
                      } else if (hasFever) {
                        borderClass = 'border-l-status-fever';
                        dotClass = 'bg-status-fever';
                      } else if (isVisited) {
                        borderClass = 'border-l-border';
                        dotClass = 'bg-text-muted';
                      }

                      return (
                        <tr
                          key={patient._id}
                          onClick={() => fetchPatientDetail(patient._id)}
                          className={`hover:bg-panel-hover transition-colors cursor-pointer border-l-[3px] ${borderClass}`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-text tabular-nums whitespace-nowrap border-r border-border">
                            {patient.bedNumber}
                          </td>

                          <td className="py-3 px-4 font-medium text-text border-r border-border">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                              <span>{patient.name}</span>
                              {isEligible && (
                                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-[2px] bg-badge text-status-stable border border-status-stable/40 font-bold uppercase">
                                  Eligible
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap border-r border-border">
                            {latest ? (
                              <span className={latest.hasFever ? 'text-status-fever font-bold' : 'text-text'}>
                                {latest.value.toFixed(1)}°F
                              </span>
                            ) : (
                              <span className="text-text-muted">Not recorded</span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap border-r border-border">
                            <span className="font-bold text-text">
                              {patient.eligibility?.consecutiveFeverFreeDays ?? 0}
                            </span>{' '}
                            <span className="text-text-muted">/ 3 days</span>
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap border-r border-border">
                            {isVisited ? (
                              <span className="text-text-muted">Visited today</span>
                            ) : (
                              <span className="text-status-pending font-semibold">Rounds Pending</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchPatientDetail(patient._id);
                              }}
                              className="px-2.5 py-1 rounded-[3px] border border-border bg-subpanel hover:bg-panel-hover text-text font-mono text-xs transition-colors inline-flex items-center gap-1"
                            >
                              <span>Review</span>
                              <ChevronRight className="w-3 h-3" />
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

        {/* PATIENT DETAIL & CLINICAL CONSULTATION MODAL */}
        <Modal
          isOpen={!!selectedPatientId}
          onClose={() => {
            setSelectedPatientId(null);
            setPatientDetail(null);
            setVisitErrorMessage('');
          }}
          title={patientDetail ? `${patientDetail.patient.bedNumber} — ${patientDetail.patient.name}` : 'Physician Evaluation'}
          description="Clinical vital sign curves, physician visit logs, and discharge authority."
          maxWidth="lg"
        >
          {isLoadingDetail ? (
            <div className="py-16 text-center text-xs text-text-muted font-mono flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading patient dossier...</span>
            </div>
          ) : patientDetail ? (
            <div className="space-y-5">
              {/* Discharge Eligibility Indicator Bar */}
              <div
                className={`p-3 rounded-[3px] border text-xs flex items-center justify-between ${
                  patientDetail.patient.dischargeEligible
                    ? 'border-status-stable/40 bg-badge text-text'
                    : 'border-border bg-subpanel text-text-muted'
                }`}
              >
                <div>
                  <div className="font-semibold text-text flex items-center gap-2 font-mono">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        patientDetail.patient.dischargeEligible ? 'bg-status-stable' : 'bg-status-pending'
                      }`}
                    />
                    <span>
                      {patientDetail.patient.dischargeEligible
                        ? 'DISCHARGE PROTOCOL: ELIGIBLE'
                        : 'DISCHARGE PROTOCOL: IN PROGRESS'}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {patientDetail.patient.eligibility?.consecutiveFeverFreeDays ?? 0} consecutive fever-free days (required: 3+ days).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDischargeModal(true)}
                    disabled={!patientDetail.patient.dischargeEligible}
                    className={`px-3 py-1.5 rounded-[3px] font-mono text-xs font-bold border transition-colors ${
                      patientDetail.patient.dischargeEligible
                        ? 'bg-btn hover:bg-btn-hover text-white border-border'
                        : 'bg-panel text-text-muted border-border cursor-not-allowed opacity-50'
                    }`}
                  >
                    Clear Discharge
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDeceasedModal(true)}
                    className="px-2.5 py-1.5 rounded-[3px] border border-border bg-panel hover:bg-alert hover:border-status-fever/40 text-text-muted hover:text-status-fever font-mono text-xs transition-colors"
                  >
                    Deceased
                  </button>
                </div>
              </div>

              {/* Temperature Trend Curve */}
              <TemperatureChart logs={patientDetail.temperatureLogs || []} />

              {/* Record Visit Form (Gated: requires nurse temp log today) */}
              <form onSubmit={handleRecordVisit} className="p-3.5 bg-subpanel border border-border rounded-[3px] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold uppercase tracking-wider text-text">
                    Physician Rounds Consultation Note
                  </span>
                  <span className="text-[11px] font-mono text-text-muted">
                    {patientDetail.patient.tempLoggedToday ? (
                      <span className="text-status-stable font-semibold">Temp Log Verified</span>
                    ) : (
                      <span className="text-status-pending font-semibold">Nurse temp log required</span>
                    )}
                  </span>
                </div>

                {visitErrorMessage && (
                  <div className="p-2.5 rounded-[3px] bg-alert border-l-2 border-l-status-fever border border-border text-xs text-text flex items-start gap-2">
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
                    placeholder="Document clinical assessment, respiratory examination, symptoms, medication changes..."
                    disabled={isSubmittingVisit}
                    className="w-full bg-input border border-border focus:border-accent text-text rounded-[3px] p-2.5 text-xs focus:outline-none resize-none placeholder:text-text-muted/50 transition-colors"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingVisit || !visitNotes.trim()}
                    className="px-4 py-2 rounded-[3px] bg-btn hover:bg-btn-hover disabled:opacity-50 text-white text-xs font-semibold font-mono transition-colors flex items-center gap-1.5"
                  >
                    {isSubmittingVisit ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>Sign Rounds Note</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Consultation History */}
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
                  Previous Physician Consultations ({patientDetail.doctorVisits?.length || 0})
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-border border border-border rounded-[3px] bg-panel">
                  {!patientDetail.doctorVisits || patientDetail.doctorVisits.length === 0 ? (
                    <div className="py-4 text-center text-xs text-text-muted font-mono">
                      No previous physician visits recorded.
                    </div>
                  ) : (
                    patientDetail.doctorVisits.map((visit) => (
                      <div key={visit._id} className="p-3 bg-panel space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-semibold text-text">
                            {visit.visitedBy?.name || visit.visitedBy?.staffId || 'Attending Physician'}
                          </span>
                          <span className="text-text-muted text-[11px] tabular-nums">
                            {new Date(visit.visitedAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed whitespace-pre-wrap">
                          {visit.notes}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </Modal>

        {/* DISCHARGE CONFIRMATION MODAL */}
        <Modal
          isOpen={showDischargeModal}
          onClose={() => setShowDischargeModal(false)}
          title="Physician Discharge Clearance"
          description="Patient has met all criteria (3+ consecutive afebrile days). Clearance will vacate assigned bed."
          maxWidth="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-text-muted mb-1.5 font-semibold">
                Discharge Summary Note (Optional)
              </label>
              <textarea
                rows={3}
                value={dischargeNotes}
                onChange={(e) => setDischargeNotes(e.target.value)}
                placeholder="Final clearance notes, follow-up instructions, discharge destination..."
                className="w-full bg-input border border-border focus:border-accent text-text rounded-[3px] p-2.5 text-xs focus:outline-none resize-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDischargeModal(false)}
                className="flex-1 py-2 px-3 rounded-[3px] border border-border bg-panel hover:bg-panel-hover text-text text-xs font-mono transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDischargePatient}
                disabled={isSubmittingDischarge}
                className="flex-1 py-2 px-3 rounded-[3px] bg-btn hover:bg-btn-hover text-white text-xs font-bold font-mono transition-colors flex items-center justify-center gap-1.5"
              >
                {isSubmittingDischarge ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Authorize Release</span>
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
          description="This action marks patient record as deceased and updates facility epidemiological mortality tracking."
          maxWidth="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-text-muted mb-1.5 font-semibold">
                Clinical Summary & Cause of Death *
              </label>
              <textarea
                rows={3}
                required
                value={deceasedNotes}
                onChange={(e) => setDeceasedNotes(e.target.value)}
                placeholder="Clinical details, time of declaration, epidemiological reporting details..."
                className="w-full bg-input border border-border focus:border-accent text-text rounded-[3px] p-2.5 text-xs focus:outline-none resize-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeceasedModal(false)}
                className="flex-1 py-2 px-3 rounded-[3px] border border-border bg-panel hover:bg-panel-hover text-text text-xs font-mono transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleMarkDeceased}
                disabled={isSubmittingDeceased || !deceasedNotes.trim()}
                className="flex-1 py-2 px-3 rounded-[3px] bg-status-fever hover:brightness-110 text-white text-xs font-bold font-mono transition-colors flex items-center justify-center gap-1.5"
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
