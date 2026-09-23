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
  Thermometer,
  Search,
  RefreshCw,
  Plus,
  Loader2,
  ChevronRight,
  Bed,
  Calendar,
  Clock,
  User,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

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
      showToast('Please enter a valid temperature (e.g. 98.6)', 'warning');
      return;
    }

    setIsSubmittingTemp(true);

    try {
      const endpoint = `/api/patients/${selectedPatientId}/temperature${force ? '?force=true' : ''}`;
      const newLog = await api.post<TemperatureLog>(endpoint, { value: valueNum });

      showToast(
        `Recorded ${newLog.value}°F ${newLog.hasFever ? '(Fever)' : '(Stable)'}`,
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
      <AppLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2 text-text-muted text-[11px] font-mono uppercase tracking-wider mb-1">
                <span>Clinical Monitoring</span>
                <span>•</span>
                <span>Quarantine Ward</span>
              </div>
              <h1 className="text-xl font-bold text-text tracking-tight">
                Nurse Vitals Station
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                Bedside temperature logging and active quarantine fever surveillance.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admit"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] bg-[#233546] hover:bg-[#2F4458] text-text text-xs border border-border font-medium transition-colors"
              >
                <Bed className="w-3.5 h-3.5 text-text-muted" />
                <span>Admit / Bed Map</span>
              </Link>

              <button
                onClick={fetchPatients}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] border border-border bg-panel hover:bg-[#1D2B3A] text-text-muted hover:text-text text-xs font-medium transition-colors"
                title="Refresh Patients"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by bed (e.g. Bed A-101) or patient name..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#0B1118] border border-border text-xs text-text rounded-[3px] focus:outline-none focus:border-[#4E677E] placeholder:text-text-muted/60 font-mono"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-panel border border-border rounded-[3px]">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 text-xs font-mono transition-colors rounded-[2px] ${
                  statusFilter === 'all'
                    ? 'bg-[#0B1118] text-text font-bold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                All ({patients.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1 text-xs font-mono transition-colors rounded-[2px] flex items-center gap-1.5 ${
                  statusFilter === 'pending'
                    ? 'bg-[#0B1118] text-text font-bold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-status-pending" />
                <span>Pending Log ({pendingCount})</span>
              </button>
              <button
                onClick={() => setStatusFilter('recorded')}
                className={`px-3 py-1 text-xs font-mono transition-colors rounded-[2px] flex items-center gap-1.5 ${
                  statusFilter === 'recorded'
                    ? 'bg-[#0B1118] text-text font-bold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-status-stable" />
                <span>Recorded ({recordedCount})</span>
              </button>
            </div>
          </div>

          {/* DENSE SINGLE-COLUMN PATIENT TABLE/LIST */}
          <div className="border border-border bg-panel rounded-[3px] overflow-hidden">
            {isLoading ? (
              <div className="py-16 text-center text-xs text-text-muted font-mono flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading active patient census...</span>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted font-mono">
                NO PATIENTS MATCHING ACTIVE FILTER
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-[#0B1118] text-text-muted text-[10px] font-mono uppercase">
                      <th className="py-2.5 px-4 font-semibold">Bed</th>
                      <th className="py-2.5 px-4 font-semibold">Patient Name</th>
                      <th className="py-2.5 px-4 font-semibold">Admitted Date</th>
                      <th className="py-2.5 px-4 font-semibold">Latest Temp</th>
                      <th className="py-2.5 px-4 font-semibold">Daily Status</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPatients.map((patient) => {
                      const latest = patient.latestTemperature || patient.latestTemp;
                      const hasFever = latest?.hasFever;
                      const isLogged = patient.tempLoggedToday;

                      // Functional Left Border Status Color Rule
                      let borderClass = 'border-l-status-pending';
                      let dotClass = 'bg-status-pending';

                      if (isLogged) {
                        if (hasFever) {
                          borderClass = 'border-l-status-fever';
                          dotClass = 'bg-status-fever';
                        } else {
                          borderClass = 'border-l-status-stable';
                          dotClass = 'bg-status-stable';
                        }
                      }

                      return (
                        <tr
                          key={patient._id}
                          onClick={() => fetchPatientDetail(patient._id)}
                          className={`hover:bg-[#1C2B39] transition-colors cursor-pointer border-l-[3px] ${borderClass}`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-text tabular-nums whitespace-nowrap">
                            {patient.bedNumber}
                          </td>

                          <td className="py-3 px-4 font-medium text-text">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                              <span>{patient.name}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-text-muted font-mono tabular-nums whitespace-nowrap">
                            {new Date(patient.admittedDate).toLocaleDateString()}
                          </td>

                          <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                            {patient.latestTemperature ? (
                              <span className={patient.latestTemperature.hasFever ? 'text-status-fever font-bold' : 'text-text'}>
                                {patient.latestTemperature.value.toFixed(1)}°F
                              </span>
                            ) : (
                              <span className="text-text-muted">None</span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                            {isLogged ? (
                              <span className="text-text-muted">Logged today</span>
                            ) : (
                              <span className="text-status-pending font-semibold">Needs Temp Log</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchPatientDetail(patient._id);
                              }}
                              className="px-2.5 py-1 rounded-[3px] border border-border bg-[#0B1118] hover:bg-[#233546] text-text-muted hover:text-text font-mono text-xs transition-colors inline-flex items-center gap-1"
                            >
                              <span>Inspect</span>
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

        {/* PATIENT DETAIL MODAL */}
        <Modal
          isOpen={!!selectedPatientId}
          onClose={() => {
            setSelectedPatientId(null);
            setPatientDetail(null);
          }}
          title={patientDetail ? `${patientDetail.patient.bedNumber} — ${patientDetail.patient.name}` : 'Patient Records'}
          description="Bedside vital sign log and temperature surveillance history."
          maxWidth="lg"
        >
          {isLoadingDetail ? (
            <div className="py-16 text-center text-xs text-text-muted font-mono flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Retrieving clinical records...</span>
            </div>
          ) : patientDetail ? (
            <div className="space-y-5">
              {/* Metadata Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#0B1118] border border-border rounded-[3px] text-xs font-mono">
                <div>
                  <span className="text-text-muted block text-[10px]">ADMITTED</span>
                  <span className="font-semibold text-text tabular-nums">
                    {new Date(patientDetail.patient.admittedDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">DAYS IN QUARANTINE</span>
                  <span className="font-semibold text-text tabular-nums">
                    {Math.max(1, Math.ceil((Date.now() - new Date(patientDetail.patient.admittedDate).getTime()) / (1000 * 60 * 60 * 24)))} days
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">FEVER-FREE STREAK</span>
                  <span className="font-semibold text-text tabular-nums">
                    {patientDetail.patient.eligibility?.consecutiveFeverFreeDays ?? 0} days
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">TODAY&apos;S STATUS</span>
                  <span className={patientDetail.patient.tempLoggedToday ? 'text-status-stable font-semibold' : 'text-status-pending font-semibold'}>
                    {patientDetail.patient.tempLoggedToday ? 'Logged' : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Log Temperature Form */}
              <div className="p-3.5 bg-[#0B1118] border border-border rounded-[3px] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold uppercase tracking-wider text-text">
                    Record Body Temperature
                  </span>
                  <span className="text-[11px] font-mono text-text-muted">Fever: &ge; 100.4°F (38.0°C)</span>
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
                      className="w-full bg-[#16212C] border border-border focus:border-[#4E677E] text-text rounded-[3px] px-3 py-2 text-sm font-mono tabular-nums focus:outline-none placeholder:text-text-muted/50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleLogTemperature(false);
                        }
                      }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-text-muted">
                      °F
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLogTemperature(false)}
                    disabled={isSubmittingTemp || !tempInput.trim()}
                    className="px-4 py-2 rounded-[3px] bg-[#233546] hover:bg-[#2F4458] disabled:opacity-50 text-text border border-border text-xs font-semibold font-mono transition-colors flex items-center gap-1.5"
                  >
                    {isSubmittingTemp ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Save Vitals</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Temperature Trend Chart */}
              <TemperatureChart logs={patientDetail.temperatureLogs || []} />

              {/* Temperature History Table */}
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
                  Detailed Readings Log
                </div>

                <div className="max-h-48 overflow-y-auto border border-border rounded-[3px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0B1118] text-text-muted uppercase text-[10px] font-mono border-b border-border sticky top-0">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Timestamp</th>
                        <th className="py-2 px-3 font-semibold">Value</th>
                        <th className="py-2 px-3 font-semibold">Classification</th>
                        <th className="py-2 px-3 font-semibold text-right">Logged By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-text font-mono text-[11px]">
                      {!patientDetail.temperatureLogs || patientDetail.temperatureLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-text-muted">
                            No logs recorded.
                          </td>
                        </tr>
                      ) : (
                        patientDetail.temperatureLogs.map((log) => (
                          <tr key={log._id} className="hover:bg-[#1C2B39]">
                            <td className="py-2 px-3 text-text-muted tabular-nums">
                              {new Date(log.loggedAt).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 font-bold tabular-nums">
                              <span className={log.hasFever ? 'text-status-fever' : 'text-status-stable'}>
                                {log.value.toFixed(1)}°F
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {log.hasFever ? (
                                <span className="text-status-fever font-bold">Fever</span>
                              ) : (
                                <span className="text-status-stable">Normal</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right text-text-muted">
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

        {/* 409 DUPLICATE CONFLICT MODAL */}
        <Modal
          isOpen={showConflictModal}
          onClose={() => setShowConflictModal(false)}
          title="Duplicate Vital Reading Detected"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-[3px] bg-[#2A1E24] border border-status-fever/40 text-xs text-text space-y-1">
              <p className="font-semibold text-status-fever">
                A reading of {conflictData?.existingValue}°F was already logged at {conflictData?.logTime}.
              </p>
              <p className="text-text-muted">
                Do you want to overwrite today&apos;s record with {conflictData?.tempValueToRetry}°F?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConflictModal(false)}
                className="flex-1 py-2 px-3 rounded-[3px] border border-border bg-[#16212C] hover:bg-[#1C2B39] text-text-muted text-xs font-mono transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleLogTemperature(true, conflictData?.tempValueToRetry)}
                disabled={isSubmittingTemp}
                className="flex-1 py-2 px-3 rounded-[3px] bg-status-fever hover:brightness-110 text-white text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5"
              >
                {isSubmittingTemp ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Overwrite Reading</span>
                )}
              </button>
            </div>
          </div>
        </Modal>
      </AppLayout>
    </RoleGuard>
  );
}
