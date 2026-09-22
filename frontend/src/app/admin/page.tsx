'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '../../components/Navbar';
import { RoleGuard } from '../../components/RoleGuard';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { FacilityStats, Patient } from '../../types';
import {
  ShieldAlert,
  Users,
  Bed,
  HeartCrack,
  Activity,
  Award,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  TrendingUp,
  UserCheck,
  Shield,
  Loader2,
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<FacilityStats | null>(null);
  const [dischargeQueue, setDischargeQueue] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const capacity = stats?.capacity ?? 74;
  const occupied = stats?.occupied ?? 0;
  const occupancyPercent = Math.round((occupied / capacity) * 100);
  const mortalityPercent = stats ? (stats.mortalityRate * 100).toFixed(1) : '0';
  const successPercent = stats ? (stats.successRate * 100).toFixed(1) : '0';
  const hasMortalityAlert = stats?.mortalityAlert ?? false;

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider mb-1">
                <Shield className="w-4 h-4" /> Command & Operations Centre
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
                Facility Executive Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Monitor quarantine capacity, epidemic mortality thresholds, and clinical discharge pipeline.
              </p>
            </div>

            <button
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all hover:border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>

          {/* CRITICAL MORTALITY ALERT BANNER */}
          {hasMortalityAlert && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-950/90 to-red-950/80 border-2 border-rose-500/60 shadow-2xl shadow-rose-950/60 flex items-start gap-4 animate-pulse">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
                <ShieldAlert className="w-6 h-6 text-rose-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-rose-100 flex items-center gap-2">
                  <span>CRITICAL EPIDEMIC ALERT: High Mortality Rate</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500 text-white font-extrabold">
                    {mortalityPercent}%
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-rose-200/90 mt-1">
                  Facility mortality has exceeded the safety threshold of{' '}
                  <span className="font-bold">15.0%</span>. Immediate epidemiological review and
                  palliative protocol reassessment is strongly advised.
                </p>
              </div>
            </div>
          )}

          {/* Key Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Bed Capacity & Occupancy */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Bed Occupancy</span>
                  <Bed className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-100 font-mono">
                    {occupied}
                  </span>
                  <span className="text-sm font-semibold text-slate-400 font-mono">
                    / {capacity} beds
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1.5">
                  <span>Capacity Utilization</span>
                  <span className="font-mono text-emerald-400">{occupancyPercent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 2. Quarantine Success Rate */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Recovery Rate</span>
                  <Award className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-emerald-400 font-mono">
                    {successPercent}%
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Target Benchmark:</span>
                <span className="font-semibold text-slate-200">85.0% Standard</span>
              </div>
            </div>

            {/* 3. Mortality Rate */}
            <div
              className={`bg-slate-900/90 border rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between ${
                hasMortalityAlert ? 'border-rose-500/50 bg-rose-950/20' : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Mortality Rate</span>
                  <HeartCrack className="w-4 h-4 text-rose-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-extrabold font-mono ${
                      hasMortalityAlert ? 'text-rose-400' : 'text-slate-100'
                    }`}
                  >
                    {mortalityPercent}%
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    ({stats?.deceasedCount ?? 0} deaths)
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Alert Threshold:</span>
                <span className="font-semibold text-rose-400">&gt; 15.0% Limit</span>
              </div>
            </div>

            {/* 4. Total Throughput */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Admitted</span>
                  <Users className="w-4 h-4 text-sky-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-100 font-mono">
                    {stats?.totalAdmitted ?? 0}
                  </span>
                  <span className="text-xs font-medium text-slate-400">Cases</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Discharged Recoveries:</span>
                <span className="font-semibold text-emerald-400 font-mono">
                  {stats?.dischargedCount ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Discharge Queue Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Clinical Discharge Queue
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Active patients who have achieved 3+ consecutive fever-free days awaiting physician clearance.
                </p>
              </div>

              <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {dischargeQueue.length} Ready for Release
              </span>
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
                <p className="text-xs">Evaluating patient fever-free streaks...</p>
              </div>
            ) : dischargeQueue.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No Pending Discharges</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  All eligible patients have been processed or are currently in active quarantine cycles.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Bed</th>
                      <th className="py-3 px-4">Patient Name</th>
                      <th className="py-3 px-4">Admitted Date</th>
                      <th className="py-3 px-4">Fever-Free Days</th>
                      <th className="py-3 px-4">Latest Vitals</th>
                      <th className="py-3 px-4">Action Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-slate-300">
                    {dischargeQueue.map((patient) => (
                      <tr key={patient._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                          {patient.bedNumber}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200">
                          {patient.name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(patient.admittedDate).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-emerald-400 font-mono text-sm">
                            {patient.eligibility?.consecutiveFeverFreeDays ?? 3} days
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {patient.latestTemperature?.value
                            ? `${patient.latestTemperature.value}°F`
                            : 'Normal'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Awaiting Doctor Sign-off
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
