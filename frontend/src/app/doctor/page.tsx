'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '../../components/Navbar';
import { RoleGuard } from '../../components/RoleGuard';
import { Modal } from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { api, ApiError } from '../../lib/api';
import { Patient, PatientDetailResponse, DoctorVisit } from '../../types';
import {
  Stethoscope,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  UserCheck,
  UserX,
  Calendar,
  Thermometer,
  Bed,
  RefreshCw,
  Loader2,
  ArrowRight,
  Flame,
  AlertCircle,
  Sparkles,
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
      const newVisit = await api.post<DoctorVisit>(
        `/api/patients/${selectedPatientId}/visit`,
        { notes: visitNotes.trim() }
      );

      showToast('Doctor consultation and examination logged.', 'success', 'Visit Recorded');
      setVisitNotes('');

      // Refresh detail and patient list
      await Promise.all([fetchPatientDetail(selectedPatientId), fetchPatients()]);
    } catch (err: any) {
      console.error('Visit error', err);
      const msg = err.data?.error || err.message || 'Failed to record visit.';
      setVisitErrorMessage(msg);
      showToast(msg, 'error', 'Visit Blocked');
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
        `${patientDetail?.patient.name} has been successfully cleared and discharged.`,
        'success',
        'Patient Discharged'
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
      showToast('Clinical deceased note is required.', 'warning');
      return;
    }

    setIsSubmittingDeceased(true);

    try {
      await api.post(`/api/patients/${selectedPatientId}/mark-deceased`, {
        notes: deceasedNotes.trim(),
      });

      showToast(
        `Patient record updated to deceased. Facility statistics adjusted.`,
        'info',
        'Mortality Logged'
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

  // Filter and sort patients: Not Visited Today highlighted and prioritized
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
      // Prioritize unvisited patients first
      if (a.visitedToday === b.visitedToday) return 0;
      return a.visitedToday ? 1 : -1;
    });

  const unvisitedCount = patients.filter((p) => !p.visitedToday).length;
  const eligibleCount = patients.filter((p) => p.dischargeEligible).length;

  return (
    <RoleGuard allowedRoles={['doctor']}>
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs uppercase tracking-wider mb-1">
                <Stethoscope className="w-4 h-4" /> Attending Physician Station
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
                Doctor Rounds Portal
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Conduct clinical assessments, review vitals history, and manage quarantine discharges.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Rounds Pending</div>
                  <div className="text-base font-extrabold text-amber-400 leading-tight">
                    {unvisitedCount} Patients
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Eligible for Release</div>
                  <div className="text-base font-extrabold text-emerald-400 leading-tight">
                    {eligibleCount} Patients
                  </div>
                </div>
              </div>

              <button
                onClick={fetchPatients}
                disabled={isLoading}
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-all hover:border-slate-700"
                title="Refresh Patient List"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Search & Tabs */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient by name or bed..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                onClick={() => setFilterTab('not-visited')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  filterTab === 'not-visited'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Not Visited Today ({unvisitedCount})</span>
              </button>
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterTab === 'all'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Patients ({patients.length})
              </button>
              <button
                onClick={() => setFilterTab('discharge-eligible')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  filterTab === 'discharge-eligible'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Discharge Queue ({eligibleCount})</span>
              </button>
            </div>
          </div>

          {/* Patients Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-48 bg-slate-900/50 rounded-2xl border border-slate-800/80 animate-pulse"
                />
              ))}
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/80 p-8">
              <Stethoscope className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-300">No Patients in this View</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                All rounds in this filter category have been completed or no matching records found.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPatients.map((patient) => {
                const visitedToday = patient.visitedToday;
                const tempLoggedToday = patient.tempLoggedToday;
                const isEligible = patient.dischargeEligible;
                const feverFreeDays = patient.consecutiveFeverFreeDays ?? 0;

                return (
                  <div
                    key={patient._id}
                    onClick={() => fetchPatientDetail(patient._id)}
                    className={`group bg-slate-900 hover:bg-slate-850 border rounded-2xl p-5 shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                      isEligible
                        ? 'border-emerald-500/50 hover:border-emerald-400'
                        : !visitedToday
                        ? 'border-sky-500/40 hover:border-sky-400'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Top status indicator strip */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1 ${
                        isEligible
                          ? 'bg-emerald-500'
                          : !visitedToday
                          ? 'bg-sky-500'
                          : 'bg-slate-700'
                      }`}
                    />

                    <div>
                      {/* Bed & Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-800 text-slate-200 border border-slate-700">
                          <Bed className="w-3.5 h-3.5 text-sky-400" />
                          {patient.bedNumber}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isEligible && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Discharge Ready
                            </span>
                          )}

                          {visitedToday ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Visited
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Needs Visit
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Name */}
                      <h3 className="text-base font-bold text-slate-100 group-hover:text-sky-300 transition-colors">
                        {patient.name}
                      </h3>

                      {/* Vitals Info Indicator */}
                      <div className="mt-2.5 flex items-center gap-2 text-xs">
                        <div
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                            tempLoggedToday
                              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                              : 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
                          }`}
                        >
                          <Thermometer className="w-3 h-3" />
                          {tempLoggedToday
                            ? `Vitals Recorded (${patient.latestTemperature?.value ?? '--'}°F)`
                            : 'Vitals Pending'}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="text-slate-400">
                        <span className="font-bold text-slate-200 font-mono">{feverFreeDays}</span>{' '}
                        fever-free days
                      </div>

                      <div className="text-sky-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-semibold text-xs">
                        <span>Examine</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Patient Clinical Examination Modal */}
        <Modal
          isOpen={!!selectedPatientId}
          onClose={() => {
            setSelectedPatientId(null);
            setPatientDetail(null);
          }}
          title={patientDetail?.patient.name || 'Patient Clinical Examination'}
          description={
            patientDetail
              ? `${patientDetail.patient.bedNumber} • Admitted ${new Date(
                  patientDetail.patient.admittedDate
                ).toLocaleDateString()}`
              : ''
          }
          maxWidth="xl"
        >
          {isLoadingDetail || !patientDetail ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-sky-500 mb-2" />
              <p className="text-xs">Loading patient chart...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Patient Vitals & Discharge Readiness Alert Bar */}
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  patientDetail.eligibility.isEligible
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-100'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Discharge Protocol Assessment
                  </div>
                  <div className="text-sm font-semibold mt-0.5">
                    {patientDetail.eligibility.consecutiveFeverFreeDays} consecutive fever-free days
                    (3 required)
                  </div>
                  <p className="text-xs opacity-80 mt-0.5">{patientDetail.eligibility.reason}</p>
                </div>

                <div className="flex items-center gap-2">
                  {patientDetail.eligibility.isEligible && (
                    <button
                      onClick={() => setShowDischargeModal(true)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Discharge Patient</span>
                    </button>
                  )}

                  <button
                    onClick={() => setShowDeceasedModal(true)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 hover:border-rose-500/40 hover:text-rose-300 border border-slate-700 text-slate-400 text-xs font-semibold transition-all flex items-center gap-1.5"
                    title="Mark Patient Deceased"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Deceased</span>
                  </button>
                </div>
              </div>

              {/* Consultation / Visit Notes Form */}
              <div className="bg-slate-950/80 border border-sky-500/30 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    Record Daily Clinical Consultation
                  </h4>

                  {patientDetail.visitedToday && (
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Rounds logged today
                    </span>
                  )}
                </div>

                {/* Inline Backend Error Box (when visit is blocked due to missing temperature) */}
                {visitErrorMessage && (
                  <div className="mb-3 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Protocol Blocked: </span>
                      {visitErrorMessage}
                    </div>
                  </div>
                )}

                {!patientDetail.tempLoggedToday && (
                  <div className="mb-3 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Notice: Nursing staff has not yet recorded today's temperature. Visit will be
                      gated until vitals are submitted.
                    </span>
                  </div>
                )}

                <form onSubmit={handleRecordVisit} className="space-y-3">
                  <textarea
                    rows={3}
                    value={visitNotes}
                    onChange={(e) => {
                      setVisitNotes(e.target.value);
                      if (visitErrorMessage) setVisitErrorMessage('');
                    }}
                    placeholder="Enter examination notes, treatment adjustments, pulmonary findings..."
                    disabled={isSubmittingVisit}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 text-slate-100 rounded-xl p-3 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingVisit || !visitNotes.trim()}
                      className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 text-xs shadow-md shadow-sky-950/50 transition-all"
                    >
                      {isSubmittingVisit ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Stethoscope className="w-4 h-4" />
                      )}
                      <span>Log Physician Visit</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Doctor Visits History */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-sky-400" />
                  Physician Visit History ({patientDetail.doctorVisits.length} Records)
                </h4>

                {patientDetail.doctorVisits.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center bg-slate-950/40 rounded-xl border border-slate-800/60">
                    No doctor consultations recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {patientDetail.doctorVisits.map((visit) => (
                      <div
                        key={visit._id}
                        className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs"
                      >
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="font-semibold text-slate-200">
                            {visit.visitedBy?.name || 'Attending Physician'}
                          </span>
                          <span className="font-mono text-[11px]">
                            {new Date(visit.visitedAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-slate-300 italic">"{visit.notes}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Temperature History Reference */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-emerald-400" />
                  Recent Temperature Readings
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {patientDetail.temperatureLogs.slice(0, 4).map((log) => (
                    <div
                      key={log._id}
                      className="bg-slate-950/50 border border-slate-800 rounded-xl p-2.5 text-center"
                    >
                      <div className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.loggedAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-sm font-bold font-mono text-slate-100 mt-0.5">
                        {log.value}°F
                      </div>
                      <div className="mt-1">
                        {log.hasFever ? (
                          <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">
                            Fever
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            Normal
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Discharge Confirmation Modal */}
        <Modal
          isOpen={showDischargeModal}
          onClose={() => setShowDischargeModal(false)}
          title="Confirm Patient Discharge Clearance"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <UserCheck className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h4 className="text-sm font-bold text-slate-100">
                Discharge {patientDetail?.patient.name}?
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Patient has satisfied the 3-day fever-free quarantine protocol and is cleared for
                release.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Discharge Note (Optional)
              </label>
              <textarea
                rows={2}
                value={dischargeNotes}
                onChange={(e) => setDischargeNotes(e.target.value)}
                placeholder="Discharge summary or instructions..."
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDischargeModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmittingDischarge}
                onClick={handleDischargePatient}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-1.5"
              >
                {isSubmittingDischarge ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Sign Discharge</span>
                )}
              </button>
            </div>
          </div>
        </Modal>

        {/* High Friction Mark Deceased Modal */}
        <Modal
          isOpen={showDeceasedModal}
          onClose={() => setShowDeceasedModal(false)}
          title="Record Patient Mortality"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h4 className="text-sm font-bold text-rose-400">
                Mark {patientDetail?.patient.name} as Deceased?
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                This will mark the patient status as deceased, update facility mortality metrics, and
                close the isolation case.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-rose-300 uppercase tracking-wider mb-1.5">
                Clinical Cause / Deceased Notes *
              </label>
              <textarea
                rows={3}
                required
                value={deceasedNotes}
                onChange={(e) => setDeceasedNotes(e.target.value)}
                placeholder="Document clinical complications, time of death, cause..."
                className="w-full bg-slate-950 border border-rose-900/60 focus:border-rose-500 text-slate-100 rounded-xl p-2.5 text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeceasedModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmittingDeceased || !deceasedNotes.trim()}
                onClick={handleMarkDeceased}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-lg shadow-rose-950/50 flex items-center justify-center gap-1.5"
              >
                {isSubmittingDeceased ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Confirm Deceased</span>
                )}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </RoleGuard>
  );
}
