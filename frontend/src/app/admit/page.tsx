'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { RoleGuard } from '../../components/RoleGuard';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { BedsResponse, BedItem } from '../../types';
import {
  UserPlus,
  RefreshCw,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Building,
  Bed,
  CheckCircle2,
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
        `Patient ${patientName.trim()} admitted to ${selectedBed}.`,
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
              <div className="flex items-center gap-2 text-accent text-xs font-mono uppercase tracking-wider mb-1 font-semibold">
                <Building className="w-3.5 h-3.5" />
                <span>Facility Allocation</span>
              </div>
              <h1 className="text-2xl font-bold text-text tracking-tight">
                Patient Intake & Bed Allocation
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                Assign available quarantine beds across zones and manage admissions.
              </p>
            </div>

            <button
              onClick={fetchBeds}
              disabled={isLoadingBeds}
              className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-panel hover:bg-subpanel text-text-muted hover:text-text text-xs font-medium font-mono transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBeds ? 'animate-spin' : ''}`} />
              <span>Refresh Map</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-panel border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[11px] font-mono uppercase text-text-muted font-semibold tracking-wider">Total Occupancy</span>
                <div className="text-2xl font-bold text-text mt-1 font-mono tabular-nums">
                  {occupiedCount} <span className="text-xs text-text-muted font-normal font-sans">/ {capacity} beds</span>
                </div>
              </div>
              <span className="text-xs font-mono tabular-nums text-accent font-semibold px-2.5 py-0.5 rounded bg-accent/10 border border-accent/20">
                {occupancyPercent}% Utilized
              </span>
            </div>

            <div className="bg-panel border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[11px] font-mono uppercase text-text-muted font-semibold tracking-wider">Available Beds</span>
                <div className="text-2xl font-bold text-status-stable mt-1 font-mono tabular-nums">
                  {freeCount} Free
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-status-stable" />
            </div>

            <div className="bg-panel border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[11px] font-mono uppercase text-text-muted font-semibold tracking-wider">Quarantine Zones</span>
                <div className="text-xs font-semibold text-text mt-1.5 font-mono">
                  Zones A, B, C, D (74 total units)
                </div>
              </div>
              <Building className="w-4 h-4 text-accent" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: 74-Bed Map Grid */}
            <div className="lg:col-span-7 bg-panel border border-border rounded-xl p-4 sm:p-5 space-y-3.5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <h3 className="text-xs font-semibold text-text font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Bed className="w-3.5 h-3.5 text-accent" />
                  <span>Bed Allocation Matrix ({filteredBeds.length} units)</span>
                </h3>

                {/* Zone Filter */}
                <div className="flex items-center gap-1 p-0.5 bg-subpanel rounded-lg border border-border">
                  {['all', 'Zone A', 'Zone B', 'Zone C', 'Zone D'].map((zone) => (
                    <button
                      key={zone}
                      onClick={() => setSelectedZone(zone)}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
                        selectedZone === zone
                          ? 'bg-panel text-accent font-semibold border border-border shadow-sm'
                          : 'text-text-muted hover:text-text'
                      }`}
                    >
                      {zone === 'all' ? 'All' : zone.replace('Zone ', '')}
                    </button>
                  ))}
                </div>
              </div>

              {isLoadingBeds ? (
                <div className="py-20 flex flex-col items-center justify-center text-text-muted font-mono gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-accent" />
                  <p className="text-xs">Loading facility beds...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[440px] overflow-y-auto pr-1">
                  {filteredBeds.map((bed) => {
                    const isOccupied = bed.status === 'occupied';
                    const isSelected = selectedBed === bed.bedNumber;

                    return (
                      <div
                        key={bed.bedNumber}
                        onClick={() => handleBedClick(bed)}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between min-h-[68px] ${
                          isSelected
                            ? 'border-accent bg-accent/10 ring-1 ring-accent text-text'
                            : isOccupied
                            ? 'border-border bg-subpanel/50 text-text-muted'
                            : 'border-border bg-panel hover:bg-subpanel text-text'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-mono tabular-nums text-xs font-bold ${isSelected ? 'text-accent' : ''}`}>
                            {bed.bedNumber.replace('Bed ', '')}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isOccupied ? 'bg-border' : 'bg-status-stable'
                            }`}
                          />
                        </div>

                        <div className="mt-1.5">
                          {isOccupied ? (
                            <div className="text-[10px] text-text-muted truncate font-mono" title={bed.patientName || ''}>
                              {bed.patientName}
                            </div>
                          ) : (
                            <div className="text-[10px] text-status-stable font-mono font-medium">
                              Free
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-4 pt-2 text-xs text-text-muted border-t border-border font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-status-stable" />
                  <span>Available ({freeCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-border" />
                  <span>Occupied ({occupiedCount})</span>
                </div>
              </div>
            </div>

            {/* Right Column: Admission Form */}
            <div
              id="admit-form"
              className="lg:col-span-5 bg-panel border border-border rounded-xl p-4 sm:p-5 space-y-3.5 shadow-sm"
            >
              <div className="pb-2.5 border-b border-border">
                <h3 className="text-xs font-semibold text-text font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-accent" />
                  <span>Admit Patient</span>
                </h3>
              </div>

              {formError && (
                <div className="p-2.5 rounded-lg bg-alert border border-status-fever/30 text-xs text-text flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-status-fever shrink-0 mt-0.5" />
                  <span className="font-mono">{formError}</span>
                </div>
              )}

              {freeCount === 0 && (
                <div className="p-2.5 rounded-lg bg-alert border border-status-pending/30 text-xs text-text flex items-center gap-2 font-mono">
                  <AlertTriangle className="w-4 h-4 text-status-pending shrink-0" />
                  <span>Quarantine ward is at full capacity (74/74 beds).</span>
                </div>
              )}

              <form onSubmit={handleAdmitSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-text-muted mb-1 font-semibold">
                    Patient Name *
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
                    className="w-full bg-input border border-border focus:border-accent text-text rounded-lg px-3 py-2 text-xs focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-text-muted mb-1 font-semibold">
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
                    className="w-full bg-input border border-border focus:border-accent text-text rounded-lg px-3 py-2 text-xs focus:outline-none font-mono tabular-nums transition-all"
                  >
                    <option value="">-- Select Available Bed --</option>
                    {freeBedsList.map((bed) => (
                      <option key={bed.bedNumber} value={bed.bedNumber}>
                        {bed.bedNumber} ({bed.zone.split(' ')[0]})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-text-muted mb-1 font-semibold">
                    Intake Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Initial symptoms, emergency contact info..."
                    disabled={isSubmitting || freeCount === 0}
                    className="w-full bg-input border border-border focus:border-accent text-text rounded-lg p-2.5 text-xs focus:outline-none resize-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || freeCount === 0 || !patientName.trim() || !selectedBed}
                  className="w-full bg-btn hover:bg-btn-hover disabled:opacity-50 text-white font-semibold font-mono py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 text-xs transition-all shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Admitting...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Confirm Admission</span>
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2.5 border-t border-border text-[11px] text-text-muted flex items-center gap-1.5 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>Admission notifies attending ward staff.</span>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </RoleGuard>
  );
}
