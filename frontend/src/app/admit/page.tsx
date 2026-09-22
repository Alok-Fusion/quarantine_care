'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '../../components/Navbar';
import { RoleGuard } from '../../components/RoleGuard';
import { useToast } from '../../context/ToastContext';
import { api, ApiError } from '../../lib/api';
import { BedsResponse, BedItem } from '../../types';
import {
  Bed,
  UserPlus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Users,
  Calendar,
  Sparkles,
  Loader2,
  ShieldCheck,
  Building,
  ArrowRight,
  Filter,
} from 'lucide-react';

export default function AdmitPatientPage() {
  const [bedsData, setBedsData] = useState<BedsResponse | null>(null);
  const [isLoadingBeds, setIsLoadingBeds] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string>('all');

  // Form state
  const [patientName, setPatientName] = useState('');
  const [selectedBed, setSelectedBed] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { showToast } = useToast();

  const fetchBeds = useCallback(async () => {
    setIsLoadingBeds(true);
    try {
      const data = await api.get<BedsResponse>('/api/beds');
      setBedsData(data);
    } catch (err: any) {
      console.error('Failed to fetch beds', err);
      showToast(err.message || 'Error loading facility beds', 'error');
    } finally {
      setIsLoadingBeds(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchBeds();
  }, [fetchBeds]);

  const handleBedClick = (bed: BedItem) => {
    if (bed.status === 'free') {
      setSelectedBed(bed.bedNumber);
      setFormError('');
      showToast(`Selected ${bed.bedNumber} for admission`, 'info');
      // Scroll to form smoothly on mobile
      const formElem = document.getElementById('admit-form');
      if (formElem) {
        formElem.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      showToast(
        `${bed.bedNumber} is currently occupied by ${bed.patientName || 'another patient'}`,
        'warning'
      );
    }
  };

  const handleAdmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientName.trim()) {
      setFormError('Patient full name is required');
      return;
    }

    if (!selectedBed.trim()) {
      setFormError('Please select an available bed from the map or dropdown');
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      await api.post('/api/patients', {
        name: patientName.trim(),
        bedNumber: selectedBed.trim(),
        notes: notes.trim(),
      });

      showToast(
        `Patient ${patientName.trim()} admitted to ${selectedBed}. Notifications sent to clinical staff.`,
        'success',
        'Patient Admitted'
      );

      // Reset form
      setPatientName('');
      setSelectedBed('');
      setNotes('');

      // Refresh beds
      await fetchBeds();
    } catch (err: any) {
      console.error('Admission error', err);
      const msg = err.data?.error || err.message || 'Failed to admit patient';
      setFormError(msg);
      showToast(msg, 'error', 'Admission Blocked');
    } finally {
      setIsSubmitting(false);
    }
  };

  const capacity = bedsData?.capacity ?? 74;
  const occupiedCount = bedsData?.occupiedCount ?? 0;
  const freeCount = bedsData?.freeCount ?? 0;
  const occupancyPercent = Math.round((occupiedCount / capacity) * 100);

  // Filter beds by zone
  const filteredBeds = bedsData?.beds.filter((bed) => {
    if (selectedZone === 'all') return true;
    return bed.zone.toLowerCase().includes(selectedZone.toLowerCase());
  }) || [];

  const freeBedsList = bedsData?.beds.filter((b) => b.status === 'free') || [];

  return (
    <RoleGuard allowedRoles={['nurse', 'admin']}>
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider mb-1">
                <Building className="w-4 h-4" /> Bed Assignment & Quarantine Intake
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
                Patient Admission & 74-Bed Map
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Assign available isolation beds, enforce 74-patient capacity limits, and auto-notify attending staff.
              </p>
            </div>

            <button
              onClick={fetchBeds}
              disabled={isLoadingBeds}
              className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all hover:border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBeds ? 'animate-spin' : ''}`} />
              <span>Refresh Bed Map</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Occupancy Status
                </span>
                <div className="text-xl font-extrabold text-slate-100 mt-1 font-mono">
                  {occupiedCount} <span className="text-xs font-normal text-slate-400">/ {capacity} Beds</span>
                </div>
              </div>
              <span className="text-sm font-bold font-mono px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-400 border border-slate-700">
                {occupancyPercent}%
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Available Beds
                </span>
                <div className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">
                  {freeCount} Free
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Clinical Zones
                </span>
                <div className="text-sm font-semibold text-slate-200 mt-1">
                  4 Quarantine Wards (A, B, C, D)
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Bed className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: 74-Bed Map Grid (7 Cols) */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Bed className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                    Interactive 74-Bed Map
                  </h3>
                </div>

                {/* Zone Filter */}
                <div className="flex items-center gap-1">
                  {['all', 'Zone A', 'Zone B', 'Zone C', 'Zone D'].map((zone) => (
                    <button
                      key={zone}
                      onClick={() => setSelectedZone(zone)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        selectedZone === zone
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {zone === 'all' ? 'All' : zone.replace('Zone ', '')}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Click any <span className="text-emerald-400 font-semibold">green available bed</span> to select it for admission.
              </p>

              {isLoadingBeds ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
                  <p className="text-xs">Loading facility bed matrix...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[500px] overflow-y-auto pr-1">
                  {filteredBeds.map((bed) => {
                    const isOccupied = bed.status === 'occupied';
                    const isSelected = selectedBed === bed.bedNumber;

                    return (
                      <div
                        key={bed.bedNumber}
                        onClick={() => handleBedClick(bed)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[76px] relative overflow-hidden ${
                          isSelected
                            ? 'border-emerald-400 bg-emerald-950/60 ring-2 ring-emerald-500/40 shadow-lg'
                            : isOccupied
                            ? 'border-rose-900/40 bg-rose-950/20 hover:border-rose-800/60 text-slate-400'
                            : 'border-emerald-500/30 bg-emerald-950/15 hover:border-emerald-400 hover:bg-emerald-900/30 text-emerald-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-100">
                            {bed.bedNumber.replace('Bed ', '')}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isOccupied ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'
                            }`}
                          />
                        </div>

                        <div className="mt-1">
                          {isOccupied ? (
                            <div className="text-[10px] text-slate-400 truncate" title={bed.patientName || ''}>
                              {bed.patientName}
                            </div>
                          ) : (
                            <div className="text-[10px] font-semibold text-emerald-400">
                              Available
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-4 pt-2 text-xs text-slate-400 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-400" />
                  <span>Available ({freeCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                  <span>Occupied ({occupiedCount})</span>
                </div>
              </div>
            </div>

            {/* Right Column: Admission Form (5 Cols) */}
            <div
              id="admit-form"
              className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4"
            >
              <div className="pb-3 border-b border-slate-800 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Admit New Patient
                </h3>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {freeCount === 0 && (
                <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Facility is currently at full capacity (74/74 beds).</span>
                </div>
              )}

              <form onSubmit={handleAdmitSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Patient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => {
                      setPatientName(e.target.value);
                      if (formError) setFormError('');
                    }}
                    placeholder="e.g. Samuel Jackson"
                    disabled={isSubmitting || freeCount === 0}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 text-slate-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Select Bed Assignment *
                  </label>
                  <select
                    required
                    value={selectedBed}
                    onChange={(e) => {
                      setSelectedBed(e.target.value);
                      if (formError) setFormError('');
                    }}
                    disabled={isSubmitting || freeCount === 0}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 text-slate-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none font-mono"
                  >
                    <option value="">-- Choose an Available Bed --</option>
                    {freeBedsList.map((bed) => (
                      <option key={bed.bedNumber} value={bed.bedNumber}>
                        {bed.bedNumber} ({bed.zone.split(' ')[0]})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Clinical Intake Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Intake symptoms, contact tracing history, emergency contact..."
                    disabled={isSubmitting || freeCount === 0}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 text-slate-100 rounded-xl p-3 text-xs focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || freeCount === 0 || !patientName.trim() || !selectedBed}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-950/50 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Assigning Bed & Admitting...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Confirm Patient Admission</span>
                    </>
                  )}
                </button>
              </form>

              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Admission generates automatic notifications to all active attending nurses and doctors.</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
