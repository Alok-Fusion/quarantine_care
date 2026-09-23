'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { RoleGuard } from '../../components/RoleGuard';
import { Modal } from '../../components/Modal';
import { TemperatureChart } from '../../components/TemperatureChart';
import { useToast } from '../../context/ToastContext';
import { api, ApiError } from '../../lib/api';
import { Patient, PatientDetailResponse, DoctorVisit } from '../../types';
import {
  Stethoscope,
  Search,
  RefreshCw,
  Loader2,
  ChevronRight,
  AlertCircle,
  FileText,
  UserCheck,
  UserX,
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
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
            <div>
              <h1 className="text-base font-bold text-text tracking-tight uppercase font-mono">
                Clinical Rounds — Physician Portal
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                Review bedside temperature logs, conduct gated rounds consultations, and manage discharge.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchPatients}
                disabled={isLoading}
                className="p-1.5 rounded-[3px] border border-border bg-panel hover:bg-panel-hover text-text-muted hover:text-text transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
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
                placeholder="Search bed or patient..."
                className="w-full pl-8 pr-3 py-1.5 bg-panel border border-border text-xs text-text rounded-[3px] focus:outline-none focus:border-text-muted placeholder:text-text-muted/60"
              />
            </div>

            <div className="flex items-center gap-1 p-0.5 bg-panel border border-border rounded-[3px]">
              <button
                onClick={() => setFilterTab('not-visited')}
                className={`px-2.5 py-1 text-xs font-mono transition-colors rounded-[2px] flex items-center gap-1.5 ${
                  filterTab === 'not-visited'
                    ? 'bg-ink text-text font-bold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-status-pending" />
                <span>Rounds Needed ({unvisitedCount})</span>
              </button>
              <button
                onClick={() => setFilterTab('all')}
                className={`px-2.5 py-1 text-xs font-mono transition-colors rounded-[2px] ${
                  filterTab === 'all'
                    ? 'bg-ink text-text font-bold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                All ({patients.length})
              </button>
              <button
                onClick={() => setFilterTab('discharge-eligible')}
                className={`px-2.5 py-1 text-xs font-mono transition-colors rounded-[2px] flex items-center gap-1.5 ${
                  filterTab === 'discharge-eligible'
                    ? 'bg-ink text-text font-bold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-status-stable" />
                <span>Discharge Ready ({eligibleCount})</span>
              </button>
            </div>
          </div>

          {/* DENSE SINGLE-COLUMN TABLE */}
          <div className="border border-border bg-panel rounded-[3px] overflow-hidden">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-text-muted font-mono">
                Loading rounds queue...
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted">
                No patients match the current rounds filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-ink text-text-muted text-[11px] font-mono uppercase">
                      <th className="py-2.5 px-4 font-semibold">Bed</th>
                      <th className="py-2.5 px-4 font-semibold">Patient Name</th>
                      <th className="py-2.5 px-4 font-semibold">Today's Vitals</th>
                      <th className="py-2.5 px-4 font-semibold">Fever Streak</th>
                      <th className="py-2.5 px-4 font-semibold">Rounds Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredPatients.map((patient) => {
                      const visitedToday = patient.visitedToday;
                      const hasTempToday = patient.tempLoggedToday;
                      const isEligible = patient.dischargeEligible;
                      const feverFreeDays = patient.consecutiveFeverFreeDays ?? 0;

                      // 3px colored left-border on row
                      let borderStatusClass = 'border-l-[3px] border-l-status-pending';
                      let dotColor = 'bg-status-pending';

                      if (isEligible) {
                        borderStatusClass = 'border-l-[3px] border-l-status-stable';
                        dotColor = 'bg-status-stable';
                      } else if (visitedToday) {
                        borderStatusClass = 'border-l-[3px] border-l-border';
                        dotColor = 'bg-text-muted';
                      }

                      return (
                        <tr
                          key={patient._id}
                          onClick={() => fetchPatientDetail(patient._id)}
                          className={`hover:bg-panel-hover transition-colors cursor-pointer ${borderStatusClass}`}
                        >
                          <td className="py-2.5 px-4 font-mono font-bold text-text tabular-nums whitespace-nowrap">
                            {patient.bedNumber}
                          </td>

                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                              <span className="font-medium text-text">{patient.name}</span>
                            </div>
                          </td>

                          <td className="py-2.5 px-4 font-mono tabular-nums whitespace-nowrap">
                            {hasTempToday ? (
                              <span className="text-text">
                                {patient.latestTemperature?.value}°F{' '}
                                <span className="text-text-muted text-[10px]">[Recorded]</span>
                              </span>
                            ) : (
                              <span className="text-status-pending font-bold text-[11px]">
                                [No Vitals Today]
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-4 font-mono tabular-nums whitespace-nowrap">
                            <span className="font-semibold text-text">{feverFreeDays}</span>
                            <span className="text-text-muted text-[11px]"> / 3 d</span>
                            {isEligible && (
                              <span className="ml-1 text-status-stable font-bold text-[10px]">
                                (Ready)
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-4 whitespace-nowrap font-mono text-[11px]">
                            {visitedToday ? (
                              <span className="text-text-muted">Visited</span>
                            ) : (
                              <span className="text-status-pending font-bold">Needs Rounds</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <span className="text-[11px] font-mono text-text-muted hover:text-text inline-flex items-center gap-0.5">
                              <span>Examine</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
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

        {/* Patient Clinical Examination Modal */}
        <Modal
          isOpen={!!selectedPatientId}
          onClose={() => {
            setSelectedPatientId(null);
            setPatientDetail(null);
          }}
          title={patientDetail?.patient.name || 'Clinical Examination'}
          description={
            patientDetail
              ? `${patientDetail.patient.bedNumber} • Admitted ${new Date(
                  patientDetail.patient.admittedDate
                ).toLocaleDateString()}`
              : ''
          }
          maxWidth="lg"
        >
          {isLoadingDetail || !patientDetail ? (
            <div className="py-8 text-center text-xs text-text-muted font-mono">
              Loading clinical chart...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status Header Bar */}
              <div className="border border-border bg-ink p-3 rounded-[3px] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-mono text-[11px] text-text-muted uppercase">
                    Discharge Protocol
                  </div>
                  <div className="font-bold text-text mt-0.5">
                    {patientDetail.eligibility.consecutiveFeverFreeDays} / 3 Fever-Free Days
                    {patientDetail.eligibility.isEligible && (
                      <span className="ml-2 text-status-stable font-mono">[Discharge Eligible]</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {patientDetail.eligibility.isEligible && (
                    <button
                      onClick={() => setShowDischargeModal(true)}
                      className="px-3 py-1.5 rounded-[3px] bg-btn hover:bg-btn-hover active:bg-btn-active border border-border text-text font-bold text-xs flex items-center gap-1 transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-status-stable" />
                      <span>Discharge</span>
                    </button>
                  )}

                  <button
                    onClick={() => setShowDeceasedModal(true)}
                    className="px-2.5 py-1.5 rounded-[3px] border border-border bg-ink hover:bg-panel text-status-fever text-xs font-mono transition-colors"
                  >
                    Mark Deceased
                  </button>
                </div>
              </div>

              {/* Consultation Notes Form */}
              <div className="border border-border bg-ink p-3.5 rounded-[3px] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-text font-mono flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-text-muted" />
                    <span>Daily Rounds Notes</span>
                  </div>
                  {patientDetail.visitedToday && (
                    <span className="text-[10px] font-mono text-text-muted">
                      Rounds logged today
                    </span>
                  )}
                </div>

                {/* Inline Backend Error (when visit is blocked by missing temperature) */}
                {visitErrorMessage && (
                  <div className="p-2.5 rounded-[2px] border border-status-fever/60 bg-panel text-status-fever text-xs flex items-start gap-1.5 font-mono">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>{visitErrorMessage}</div>
                  </div>
                )}

                {!patientDetail.tempLoggedToday && (
                  <div className="p-2 rounded-[2px] border border-status-pending/50 bg-panel text-status-pending text-xs font-mono">
                    [!] Notice: Morning vitals not yet logged. Visit will be rejected until temperature is recorded.
                  </div>
                )}

                <form onSubmit={handleRecordVisit} className="space-y-2">
                  <textarea
                    rows={3}
                    value={visitNotes}
                    onChange={(e) => {
                      setVisitNotes(e.target.value);
                      if (visitErrorMessage) setVisitErrorMessage('');
                    }}
                    placeholder="Document clinical assessment, auscultation, treatment plans..."
                    disabled={isSubmittingVisit}
                    className="w-full bg-panel border border-border focus:border-text-muted text-text rounded-[3px] p-2.5 text-xs focus:outline-none resize-none font-sans"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingVisit || !visitNotes.trim()}
                      className="bg-btn hover:bg-btn-hover active:bg-btn-active border border-border disabled:opacity-50 text-text font-medium px-4 py-1.5 rounded-[3px] text-xs transition-colors flex items-center gap-1.5"
                    >
                      {isSubmittingVisit ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Stethoscope className="w-3.5 h-3.5" />
                      )}
                      <span>Log Physician Visit</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Temperature Chart */}
              <div>
                <TemperatureChart logs={patientDetail.temperatureLogs} />
              </div>

              {/* Doctor Visits History Table */}
              <div>
                <div className="text-[11px] font-mono uppercase text-text-muted mb-2">
                  Physician Rounds History ({patientDetail.doctorVisits.length})
                </div>

                {patientDetail.doctorVisits.length === 0 ? (
                  <p className="text-xs text-text-muted py-3 text-center border border-border bg-ink rounded-[3px]">
                    No doctor consultations recorded.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {patientDetail.doctorVisits.map((visit) => (
                      <div
                        key={visit._id}
                        className="border border-border bg-ink p-2.5 rounded-[3px] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                          <span className="font-semibold text-text">
                            {visit.visitedBy?.name || 'Physician'}
                          </span>
                          <span className="tabular-nums">
                            {new Date(visit.visitedAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-text font-sans leading-relaxed">
                          "{visit.notes}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* Discharge Confirmation Modal */}
        <Modal
          isOpen={showDischargeModal}
          onClose={() => setShowDischargeModal(false)}
          title="Discharge Clearance Protocol"
          maxWidth="sm"
        >
          <div className="space-y-3 text-xs">
            <p className="text-text leading-relaxed">
              Patient <span className="font-bold">{patientDetail?.patient.name}</span> has completed{' '}
              <span className="font-mono font-bold">3 consecutive fever-free days</span> and is eligible for release.
            </p>

            <div>
              <label className="block text-[11px] font-mono text-text-muted uppercase mb-1">
                Discharge Note (Optional)
              </label>
              <textarea
                rows={2}
                value={dischargeNotes}
                onChange={(e) => setDischargeNotes(e.target.value)}
                placeholder="Final clearance notes..."
                className="w-full bg-ink border border-border focus:border-text-muted text-text rounded-[3px] p-2 text-xs focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDischargeModal(false)}
                className="flex-1 px-3 py-1.5 rounded-[3px] border border-border bg-ink hover:bg-panel text-text-muted text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmittingDischarge}
                onClick={handleDischargePatient}
                className="flex-1 px-3 py-1.5 rounded-[3px] bg-btn hover:bg-btn-hover active:bg-btn-active border border-border text-text font-bold text-xs transition-colors"
              >
                {isSubmittingDischarge ? 'Processing...' : 'Confirm Discharge'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Mark Deceased Modal */}
        <Modal
          isOpen={showDeceasedModal}
          onClose={() => setShowDeceasedModal(false)}
          title="Record Mortality"
          maxWidth="sm"
        >
          <div className="space-y-3 text-xs">
            <p className="text-status-fever font-mono leading-relaxed">
              [!] WARNING: This will mark {patientDetail?.patient.name} as deceased and close the quarantine isolation case.
            </p>

            <div>
              <label className="block text-[11px] font-mono text-text-muted uppercase mb-1">
                Clinical Cause & Mortality Notes *
              </label>
              <textarea
                rows={3}
                required
                value={deceasedNotes}
                onChange={(e) => setDeceasedNotes(e.target.value)}
                placeholder="Document time of death, primary cause, complications..."
                className="w-full bg-ink border border-border focus:border-status-fever text-text rounded-[3px] p-2 text-xs focus:outline-none resize-none font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeceasedModal(false)}
                className="flex-1 px-3 py-1.5 rounded-[3px] border border-border bg-ink hover:bg-panel text-text-muted text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmittingDeceased || !deceasedNotes.trim()}
                onClick={handleMarkDeceased}
                className="flex-1 px-3 py-1.5 rounded-[3px] border border-status-fever bg-ink hover:bg-panel text-status-fever font-bold text-xs transition-colors disabled:opacity-50"
              >
                {isSubmittingDeceased ? 'Recording...' : 'Confirm Deceased'}
              </button>
            </div>
          </div>
        </Modal>
      </AppLayout>
    </RoleGuard>
  );
}
