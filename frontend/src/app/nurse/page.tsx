'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '../../components/Navbar';
import { RoleGuard } from '../../components/RoleGuard';
import { Modal } from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { api, ApiError } from '../../lib/api';
import { Patient, PatientDetailResponse, TemperatureLog } from '../../types';
import {
  Thermometer,
  Search,
  CheckCircle2,
  Clock,
  Flame,
  Calendar,
  User,
  Plus,
  RefreshCw,
  AlertTriangle,
  Loader2,
  ArrowRight,
  TrendingUp,
  Activity,
  Bed,
} from 'lucide-react';

export default function NurseDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'recorded'>('all');

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
      showToast('Please enter a valid temperature (e.g. 98.6 or 37.0)', 'warning');
      return;
    }

    setIsSubmittingTemp(true);

    try {
      const endpoint = `/api/patients/${selectedPatientId}/temperature${force ? '?force=true' : ''}`;
      const newLog = await api.post<TemperatureLog>(endpoint, { value: valueNum });

      showToast(
        `Recorded ${newLog.value}°F ${newLog.hasFever ? '(Fever Detected)' : '(Normal)'}`,
        newLog.hasFever ? 'warning' : 'success',
        'Temperature Logged'
      );

      setTempInput('');
      setShowConflictModal(false);
      setConflictData(null);

      // Refresh detail and list
      await Promise.all([fetchPatientDetail(selectedPatientId), fetchPatients()]);
    } catch (err: any) {
      console.error('Log temp error', err);

      // Handle 409 Conflict: Already logged today
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

  // Filtered patients list
  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.bedNumber.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'pending') return !patient.tempLoggedToday;
    if (statusFilter === 'recorded') return patient.tempLoggedToday;
    return true;
  });

  const pendingCount = patients.filter((p) => !p.tempLoggedToday).length;
  const recordedCount = patients.filter((p) => p.tempLoggedToday).length;

  return (
    <RoleGuard allowedRoles={['nurse']}>
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider mb-1">
                <Thermometer className="w-4 h-4" /> Bedside Vital Signs Station
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
                Nurse Care Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Record daily patient temperatures and monitor quarantine fever-free status.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Vitals Needed</div>
                  <div className="text-base font-extrabold text-amber-400 leading-tight">
                    {pendingCount} Beds
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Recorded Today</div>
                  <div className="text-base font-extrabold text-emerald-400 leading-tight">
                    {recordedCount} / {patients.length}
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

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by bed (e.g. Bed A-101) or patient name..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({patients.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === 'pending'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setStatusFilter('recorded')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === 'recorded'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Recorded ({recordedCount})
              </button>
            </div>
          </div>

          {/* Patient Cards Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-44 bg-slate-900/50 rounded-2xl border border-slate-800/80 animate-pulse"
                />
              ))}
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/80 p-8">
              <Bed className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-300">No Quarantine Patients Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No active patients match the current search or filter criteria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPatients.map((patient) => {
                const hasTempToday = patient.tempLoggedToday;
                const feverFreeDays = patient.consecutiveFeverFreeDays ?? 0;

                return (
                  <div
                    key={patient._id}
                    onClick={() => fetchPatientDetail(patient._id)}
                    className="group bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
                  >
                    {/* Top status indicator strip */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1 ${
                        hasTempToday ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />

                    <div>
                      {/* Bed & Status Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-800 text-slate-200 border border-slate-700">
                          <Bed className="w-3.5 h-3.5 text-emerald-400" />
                          {patient.bedNumber}
                        </span>

                        {hasTempToday ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Recorded Today
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
                            <Clock className="w-3 h-3" /> Vitals Needed
                          </span>
                        )}
                      </div>

                      {/* Patient Name */}
                      <h3 className="text-base font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                        {patient.name}
                      </h3>

                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        Admitted {new Date(patient.admittedDate).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Footer Info */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-slate-300">
                        <span className="font-semibold text-emerald-400 font-mono">
                          {feverFreeDays}
                        </span>{' '}
                        consecutive fever-free days
                      </div>

                      <div className="text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center gap-0.5 font-semibold text-xs">
                        <span>Log Temp</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Patient Detail & Bedside Logging Modal */}
        <Modal
          isOpen={!!selectedPatientId}
          onClose={() => {
            setSelectedPatientId(null);
            setPatientDetail(null);
          }}
          title={patientDetail?.patient.name || 'Patient Bedside Record'}
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
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
              <p className="text-xs">Loading patient vitals record...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Vitals Logging Form */}
              <div className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4" />
                    Record Patient Temperature
                  </h4>
                  {patientDetail.tempLoggedToday && (
                    <span className="text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Reading already logged today
                    </span>
                  )}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLogTemperature(false);
                  }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.1"
                      min="30"
                      max="115"
                      value={tempInput}
                      onChange={(e) => setTempInput(e.target.value)}
                      placeholder="e.g. 98.6 or 101.4"
                      disabled={isSubmittingTemp}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 text-slate-100 rounded-xl px-4 py-2.5 text-base font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      °F
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingTemp || !tempInput.trim()}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md shadow-emerald-950/50 transition-all"
                  >
                    {isSubmittingTemp ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>Save Vitals</span>
                  </button>
                </form>
                <p className="text-[11px] text-slate-500 mt-2">
                  Values &ge; 100.4&deg;F (or &ge; 38.0&deg;C) automatically flag a clinical fever state.
                </p>
              </div>

              {/* Fever-Free Streak & Status Card */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Discharge Criteria Streak</div>
                  <div className="text-lg font-bold text-slate-100 mt-0.5 flex items-center gap-2">
                    <span className="text-emerald-400 font-mono">
                      {patientDetail.eligibility.consecutiveFeverFreeDays} / 3
                    </span>
                    <span className="text-xs font-medium text-slate-400">Fever-free days</span>
                  </div>
                </div>

                {patientDetail.eligibility.isEligible ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Discharge Eligible
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                    In Quarantine Cycle
                  </span>
                )}
              </div>

              {/* Temperature History Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  Temperature History ({patientDetail.temperatureLogs.length} Records)
                </h4>

                {patientDetail.temperatureLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center bg-slate-950/40 rounded-xl border border-slate-800/60">
                    No vitals recorded for this patient yet.
                  </p>
                ) : (
                  <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/50">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3">Reading</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Logged By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {patientDetail.temperatureLogs.map((log) => (
                          <tr key={log._id} className="hover:bg-slate-900/50 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                              {new Date(log.loggedAt).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-100">
                              {log.value}°F
                            </td>
                            <td className="py-2.5 px-3">
                              {log.hasFever ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                                  <Flame className="w-3 h-3 text-rose-500" /> Fever
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Normal
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">
                              {log.loggedBy?.name || 'Staff Nurse'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* 409 Duplicate Log Confirmation Modal */}
        <Modal
          isOpen={showConflictModal}
          onClose={() => {
            setShowConflictModal(false);
            setConflictData(null);
          }}
          title="Daily Temperature Already Recorded"
          maxWidth="sm"
        >
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <p className="text-sm text-slate-200">
              A temperature reading of{' '}
              <span className="font-bold text-amber-400 font-mono">
                {conflictData?.existingValue}°F
              </span>{' '}
              was already logged for this patient today at{' '}
              <span className="font-bold text-slate-100">{conflictData?.logTime}</span>.
            </p>

            <p className="text-xs text-slate-400">
              Would you like to overwrite/add an additional official reading of{' '}
              <span className="font-bold text-emerald-400 font-mono">
                {conflictData?.tempValueToRetry}°F
              </span>
              ?
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConflictModal(false);
                  setConflictData(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmittingTemp}
                onClick={() => handleLogTemperature(true, conflictData?.tempValueToRetry)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors shadow-lg shadow-amber-950/50 flex items-center justify-center gap-1.5"
              >
                {isSubmittingTemp ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Overwrite (?force)</span>
                )}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </RoleGuard>
  );
}
