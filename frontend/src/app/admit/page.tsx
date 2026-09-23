'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { RoleGuard } from '../../components/RoleGuard';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { BedsResponse, BedItem } from '../../types';
import {
  Bed,
  UserPlus,
  RefreshCw,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Building,
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
        `Patient ${patientName.trim()} admitted to ${selectedBed}. Notifications dispatched.`,
        'info',
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
  const filteredBeds =
    bedsData?.beds.filter((bed) => {
      if (selectedZone === 'all') return true;
      return bed.zone.toLowerCase().includes(selectedZone.toLowerCase());
    }) || [];

  const freeBedsList = bedsData?.beds.filter((b) => b.status === 'free') || [];

  return (
    <RoleGuard allowedRoles={['nurse', 'admin']}>
      <AppLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2 text-text-muted text-[11px] font-mono uppercase tracking-wider mb-1">
                <span>Facility Logistics</span>
                <span>•</span>
                <span>Bed Allocation</span>
              </div>
              <h1 className="text-xl font-bold text-text tracking-tight">
                Patient Admission & 74-Bed Map
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                Assign available quarantine beds, enforce 74-patient capacity limits, and auto-dispatch clinical notifications.
              </p>
            </div>

            <button
              onClick={fetchBeds}
              disabled={isLoadingBeds}
              className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] border border-border bg-panel hover:bg-[#1D2B3A] text-text-muted hover:text-text text-xs font-medium transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBeds ? 'animate-spin' : ''}`} />
              <span>Refresh Map</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-panel border border-border rounded-[3px] p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase text-text-muted">Total Occupancy</span>
                <div className="text-xl font-bold text-text mt-0.5 font-mono tabular-nums">
                  {occupiedCount} <span className="text-xs text-text-muted font-normal">/ {capacity} beds</span>
                </div>
              </div>
              <span className="text-xs font-mono tabular-nums text-text px-2 py-0.5 rounded-[2px] bg-[#0B1118] border border-border">
                {occupancyPercent}%
              </span>
            </div>

            <div className="bg-panel border border-border rounded-[3px] p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase text-text-muted">Available Capacity</span>
                <div className="text-xl font-bold text-status-stable mt-0.5 font-mono tabular-nums">
                  {freeCount} Free
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-status-stable" />
            </div>

            <div className="bg-panel border border-border rounded-[3px] p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase text-text-muted">Quarantine Wards</span>
                <div className="text-xs font-semibold text-text mt-1 font-mono">
                  Zones A, B, C, D (74 total)
                </div>
              </div>
              <Building className="w-4 h-4 text-text-muted" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: 74-Bed Map Grid (7 Cols) */}
            <div className="lg:col-span-7 bg-panel border border-border rounded-[3px] p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
                <h3 className="text-xs font-bold text-text font-mono uppercase tracking-wide">
                  Bed Grid Matrix ({filteredBeds.length} units)
                </h3>

                {/* Zone Filter */}
                <div className="flex items-center gap-1">
                  {['all', 'Zone A', 'Zone B', 'Zone C', 'Zone D'].map((zone) => (
                    <button
                      key={zone}
                      onClick={() => setSelectedZone(zone)}
                      className={`px-2.5 py-1 rounded-[2px] text-[11px] font-mono font-medium transition-colors ${
                        selectedZone === zone
                          ? 'bg-[#0B1118] text-text border border-border font-bold'
                          : 'text-text-muted hover:text-text hover:bg-[#1D2B3A]'
                      }`}
                    >
                      {zone === 'all' ? 'All' : zone.replace('Zone ', '')}
                    </button>
                  ))}
                </div>
              </div>

              {isLoadingBeds ? (
                <div className="py-20 flex flex-col items-center justify-center text-text-muted font-mono">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" />
                  <p className="text-xs">Loading bed matrix...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-1.5 max-h-[480px] overflow-y-auto pr-1">
                  {filteredBeds.map((bed) => {
                    const isOccupied = bed.status === 'occupied';
                    const isSelected = selectedBed === bed.bedNumber;

                    return (
                      <div
                        key={bed.bedNumber}
                        onClick={() => handleBedClick(bed)}
                        className={`p-2 rounded-[3px] border transition-colors cursor-pointer flex flex-col justify-between min-h-[68px] ${
                          isSelected
                            ? 'border-[#4E677E] bg-[#1E2D3C] ring-1 ring-[#4E677E]'
                            : isOccupied
                            ? 'border-border bg-[#0B1118] text-text-muted hover:border-[#384858]'
                            : 'border-border bg-panel hover:bg-[#1C2937] hover:border-[#4E677E] text-text'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono tabular-nums text-xs font-bold">
                            {bed.bedNumber.replace('Bed ', '')}
                          </span>
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOccupied ? 'bg-[#55697A]' : 'bg-status-stable'
                            }`}
                          />
                        </div>

                        <div className="mt-1">
                          {isOccupied ? (
                            <div className="text-[10px] text-text-muted truncate font-mono" title={bed.patientName || ''}>
                              {bed.patientName}
                            </div>
                          ) : (
                            <div className="text-[10px] text-text-muted font-mono">
                              Available
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-4 pt-2 text-[11px] text-text-muted border-t border-border font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-status-stable" />
                  <span>Available ({freeCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#55697A]" />
                  <span>Occupied ({occupiedCount})</span>
                </div>
              </div>
            </div>

            {/* Right Column: Admission Form (5 Cols) */}
            <div
              id="admit-form"
              className="lg:col-span-5 bg-panel border border-border rounded-[3px] p-4 space-y-4"
            >
              <div className="pb-2 border-b border-border">
                <h3 className="text-xs font-bold text-text font-mono uppercase tracking-wide">
                  Admit New Quarantine Patient
                </h3>
              </div>

              {formError && (
                <div className="p-2.5 rounded-[3px] bg-[#2A1E24] border-l-2 border-l-status-fever border border-border text-xs text-text flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-status-fever shrink-0 mt-0.5" />
                  <span className="font-mono">{formError}</span>
                </div>
              )}

              {freeCount === 0 && (
                <div className="p-2.5 rounded-[3px] bg-[#221D15] border-l-2 border-l-status-pending border border-border text-xs text-text flex items-center gap-2 font-mono">
                  <AlertTriangle className="w-4 h-4 text-status-pending shrink-0" />
                  <span>Facility is currently at full capacity (74/74 beds).</span>
                </div>
              )}

              <form onSubmit={handleAdmitSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-text-muted mb-1.5 font-semibold">
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
                    className="w-full bg-[#0B1118] border border-border focus:border-[#4E677E] text-text rounded-[3px] px-3 py-2 text-xs focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-text-muted mb-1.5 font-semibold">
                    Assigned Bed *
                  </label>
                  <select
                    required
                    value={selectedBed}
                    onChange={(e) => {
                      setSelectedBed(e.target.value);
                      if (formError) setFormError('');
                    }}
                    disabled={isSubmitting || freeCount === 0}
                    className="w-full bg-[#0B1118] border border-border focus:border-[#4E677E] text-text rounded-[3px] px-3 py-2 text-xs focus:outline-none font-mono tabular-nums transition-colors"
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
                  <label className="block text-xs font-mono uppercase text-text-muted mb-1.5 font-semibold">
                    Intake Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Intake symptoms, contact tracing history, emergency contact..."
                    disabled={isSubmitting || freeCount === 0}
                    className="w-full bg-[#0B1118] border border-border focus:border-[#4E677E] text-text rounded-[3px] p-2.5 text-xs focus:outline-none resize-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || freeCount === 0 || !patientName.trim() || !selectedBed}
                  className="w-full bg-[#233546] hover:bg-[#2F4458] disabled:opacity-50 text-text font-bold font-mono py-2.5 px-3 rounded-[3px] border border-border flex items-center justify-center gap-1.5 text-xs transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Admitting Patient...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5 text-text-muted" />
                      <span>Confirm Admission</span>
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 border-t border-border text-[11px] text-text-muted flex items-center gap-1.5 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <span>Admission generates automatic notifications to attending staff.</span>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </RoleGuard>
  );
}
