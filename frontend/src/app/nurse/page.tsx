'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { RoleGuard } from '../../components/RoleGuard';
import { Modal } from '../../components/Modal';
import { TemperatureChart } from '../../components/TemperatureChart';
import { useToast } from '../../context/ToastContext';
import { api, ApiError } from '../../lib/api';
import { Patient, PatientDetailResponse, TemperatureLog } from '../../types';
import {
  Thermometer,
  Search,
  RefreshCw,
  Plus,
  Loader2,
  ChevronRight,
  Bed,
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
        newLog.hasFever ? 'warning' : 'info'
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
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
            <div>
              <h1 className="text-base font-bold text-text tracking-tight uppercase font-mono">
                Patient Directory — Nurse Station
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                Bedside vital sign logging and fever tracking for active quarantine beds.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admit"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] bg-btn hover:bg-btn-hover text-text text-xs border border-border font-medium transition-colors"
              >
                <Bed className="w-3.5 h-3.5 text-text-muted" />
                <span>Admit / Bed Map</span>
              </Link>

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

          {/* Quick Metrics & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
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

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-panel border border-border rounded-[3px]">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-xs font-mono transition-colors rounded-[2px] ${
                  statusFilter === 'all'
                    ? 'bg-ink text-text font-bold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                All ({patients.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 text-xs font-mono transition-colors rounded-[2px] flex items-center gap-1.5 ${
                  statusFilter === 'pending'
                    ? 'bg-ink text-text font-bold border border-border'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-status-pending" />
                <span>Pending ({pendingCount})</span>
              </button>
              <button
                onClick={() => setStatusFilter('recorded')}
                className={`px-2.5 py-1 text-xs font-mono transition-colors rounded-[2px] flex items-center gap-1.5 ${
                  statusFilter === 'recorded'
                    ? 'bg-ink text-text font-bold border border-border'
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
              <div className="py-12 text-center text-xs text-text-muted font-mono">
                Loading patient records...
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted">
                No active patients found matching filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-ink text-text-muted text-[11px] font-mono uppercase">
                      <th className="py-2.5 px-4 font-semibold">Bed</th>
                      <th className="py-2.5 px-4 font-semibold">Patient Name</th>
                      <th className="py-2.5 px-4 font-semibold">Admitted</th>
                      <th className="py-2.5 px-4 font-semibold">Latest Temp</th>
                      <th className="py-2.5 px-4 font-semibold">Fever-Free Days</th>
                      <th className="py-2.5 px-4 font-semibold">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredPatients.map((patient) => {
                      const hasTempToday = patient.tempLoggedToday;
                      const hasFever = patient.latestTemperature?.hasFever;
                      const feverFreeDays = patient.consecutiveFeverFreeDays ?? 0;

                      // 3px colored left-border on the row
                      // fever = status-fever, stable = status-stable, pending = status-pending
                      let borderStatusClass = 'border-l-[3px] border-l-status-pending';
                      let dotColor = 'bg-status-pending';
                      let statusText = 'Pending Log';

                      if (hasTempToday) {
                        if (hasFever) {
                          borderStatusClass = 'border-l-[3px] border-l-status-fever';
                          dotColor = 'bg-status-fever';
                          statusText = 'Fever Logged';
                        } else {
                          borderStatusClass = 'border-l-[3px] border-l-status-stable';
                          dotColor = 'bg-status-stable';
                          statusText = 'Stable';
                        }
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

                          <td className="py-2.5 px-4 font-mono text-text-muted tabular-nums whitespace-nowrap">
                            {new Date(patient.admittedDate).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>

                          <td className="py-2.5 px-4 font-mono tabular-nums whitespace-nowrap">
                            {patient.latestTemperature ? (
                              <span
                                className={
                                  patient.latestTemperature.hasFever
                                    ? 'text-status-fever font-bold'
                                    : 'text-text'
                                }
                              >
                                {patient.latestTemperature.value}°F
                              </span>
                            ) : (
                              <span className="text-text-muted">--</span>
                            )}
                          </td>

                          <td className="py-2.5 px-4 font-mono tabular-nums whitespace-nowrap">
                            <span className="font-semibold text-text">
                              {feverFreeDays}
                            </span>
                            <span className="text-text-muted text-[11px]"> / 3 d</span>
                          </td>

                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className="text-[11px] font-mono text-text-muted flex items-center gap-1.5">
                              <span>{statusText}</span>
                              {patient.dischargeEligible && (
                                <span className="text-[10px] text-status-stable font-bold">
                                  [Eligible]
                                </span>
                              )}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <span className="text-[11px] font-mono text-text-muted hover:text-text inline-flex items-center gap-0.5">
                              <span>Log</span>
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

        {/* Patient Bedside Detail Modal */}
        <Modal
          isOpen={!!selectedPatientId}
          onClose={() => {
            setSelectedPatientId(null);
            setPatientDetail(null);
          }}
          title={patientDetail?.patient.name || 'Patient Chart'}
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
              Loading patient data...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Form to log today's temperature */}
              <div className="border border-border bg-ink p-3.5 rounded-[3px] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-text font-mono flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-text-muted" />
                    <span>Record Temperature</span>
                  </div>
                  {patientDetail.tempLoggedToday && (
                    <span className="text-[10px] font-mono text-status-pending">
                      Already logged today
                    </span>
                  )}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLogTemperature(false);
                  }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.1"
                      min="30"
                      max="115"
                      value={tempInput}
                      onChange={(e) => setTempInput(e.target.value)}
                      placeholder="e.g. 98.6"
                      disabled={isSubmittingTemp}
                      className="w-full bg-panel border border-border focus:border-text-muted text-text rounded-[3px] px-3 py-1.5 text-sm font-mono focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-text-muted">
                      °F
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingTemp || !tempInput.trim()}
                    className="bg-btn hover:bg-btn-hover active:bg-btn-active border border-border disabled:opacity-50 text-text font-medium px-4 py-1.5 rounded-[3px] text-xs transition-colors flex items-center gap-1"
                  >
                    {isSubmittingTemp ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Save Vitals</span>
                  </button>
                </form>
              </div>

              {/* Temperature History Line/Step Chart */}
              <div>
                <TemperatureChart logs={patientDetail.temperatureLogs} />
              </div>

              {/* Temperature History Table with Mono Values */}
              <div>
                <div className="text-[11px] font-mono uppercase text-text-muted mb-2">
                  Readings History ({patientDetail.temperatureLogs.length})
                </div>

                {patientDetail.temperatureLogs.length === 0 ? (
                  <p className="text-xs text-text-muted py-3 text-center border border-border bg-ink rounded-[3px]">
                    No temperature records logged.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-border bg-ink rounded-[3px]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-panel text-text-muted font-mono uppercase text-[10px] sticky top-0 border-b border-border">
                        <tr>
                          <th className="py-2 px-3">Timestamp</th>
                          <th className="py-2 px-3">Reading</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3">Logged By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 text-text">
                        {patientDetail.temperatureLogs.map((log) => (
                          <tr key={log._id} className="hover:bg-panel/50 font-mono text-xs">
                            <td className="py-2 px-3 text-text-muted tabular-nums">
                              {new Date(log.loggedAt).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-2 px-3 font-bold tabular-nums">
                              {log.value}°F
                            </td>
                            <td className="py-2 px-3">
                              {log.hasFever ? (
                                <span className="text-status-fever font-bold">
                                  ● Fever
                                </span>
                              ) : (
                                <span className="text-status-stable font-semibold">
                                  ● Normal
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-text-muted font-sans text-xs">
                              {log.loggedBy?.name || 'Nurse'}
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

        {/* 409 Duplicate Temperature Modal */}
        <Modal
          isOpen={showConflictModal}
          onClose={() => {
            setShowConflictModal(false);
            setConflictData(null);
          }}
          title="Duplicate Reading Confirmation"
          maxWidth="sm"
        >
          <div className="space-y-3 text-xs">
            <p className="text-text leading-relaxed">
              Already logged today at <span className="font-mono font-bold text-text">{conflictData?.logTime}</span>{' '}
              with a value of <span className="font-mono font-bold text-text">{conflictData?.existingValue}°F</span>.
            </p>
            <p className="text-text-muted">
              Do you want to overwrite and record an additional reading of{' '}
              <span className="font-mono font-bold text-text">{conflictData?.tempValueToRetry}°F</span>?
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConflictModal(false);
                  setConflictData(null);
                }}
                className="flex-1 px-3 py-1.5 rounded-[3px] border border-border bg-ink hover:bg-panel text-text-muted text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmittingTemp}
                onClick={() => handleLogTemperature(true, conflictData?.tempValueToRetry)}
                className="flex-1 px-3 py-1.5 rounded-[3px] bg-btn hover:bg-btn-hover active:bg-btn-active border border-border text-text font-bold text-xs transition-colors"
              >
                {isSubmittingTemp ? 'Saving...' : 'Overwrite (?force)'}
              </button>
            </div>
          </div>
        </Modal>
      </AppLayout>
    </RoleGuard>
  );
}
