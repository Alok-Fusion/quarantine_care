import { Types } from 'mongoose';
import { TemperatureLog, ITemperatureLog } from '../models/TemperatureLog';
import { Patient, IPatient } from '../models/Patient';
import { formatDayKey } from '../utils/dateUtils';

export interface DaySummary {
  date: string;
  readingsCount: number;
  maxTemperature: number;
  hasFever: boolean;
  loggedAtLatest: Date;
}

export interface DischargeEligibilityResult {
  patientId: string;
  patientName: string;
  isEligible: boolean;
  consecutiveFeverFreeDays: number;
  requiredFeverFreeDays: number;
  daySummaries: DaySummary[];
  reason: string;
}

/**
 * Calculates discharge eligibility based on 3 consecutive fever-free days.
 */
export async function evaluateDischargeEligibility(
  patientId: string | Types.ObjectId
): Promise<DischargeEligibilityResult> {
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new Error('Patient not found');
  }

  const logs = await TemperatureLog.find({ patientId: patient._id }).sort({
    loggedAt: 1,
  });

  if (patient.status !== 'active') {
    return {
      patientId: patient._id.toString(),
      patientName: patient.name,
      isEligible: false,
      consecutiveFeverFreeDays: 0,
      requiredFeverFreeDays: 3,
      daySummaries: [],
      reason: `Patient is currently ${patient.status}, not active.`,
    };
  }

  if (logs.length === 0) {
    return {
      patientId: patient._id.toString(),
      patientName: patient.name,
      isEligible: false,
      consecutiveFeverFreeDays: 0,
      requiredFeverFreeDays: 3,
      daySummaries: [],
      reason: 'No temperature logs recorded yet.',
    };
  }

  // Group logs by calendar day
  const daysMap = new Map<string, ITemperatureLog[]>();
  for (const log of logs) {
    const dayKey = formatDayKey(new Date(log.loggedAt));
    if (!daysMap.has(dayKey)) {
      daysMap.set(dayKey, []);
    }
    daysMap.get(dayKey)!.push(log);
  }

  // Sort day keys in ascending chronological order
  const sortedDayKeys = Array.from(daysMap.keys()).sort();

  const daySummaries: DaySummary[] = sortedDayKeys.map((dayKey) => {
    const dayLogs = daysMap.get(dayKey)!;
    const hasFever = dayLogs.some((l) => l.hasFever);
    const maxTemp = Math.max(...dayLogs.map((l) => l.value));
    const latestLog = dayLogs.reduce((latest, current) =>
      new Date(current.loggedAt) > new Date(latest.loggedAt) ? current : latest
    );

    return {
      date: dayKey,
      readingsCount: dayLogs.length,
      maxTemperature: maxTemp,
      hasFever,
      loggedAtLatest: latestLog.loggedAt,
    };
  });

  // Calculate consecutive fever-free days working backwards from the most recent day
  let consecutiveFeverFreeDays = 0;
  for (let i = daySummaries.length - 1; i >= 0; i--) {
    const day = daySummaries[i];
    if (!day.hasFever) {
      consecutiveFeverFreeDays++;
    } else {
      break;
    }
  }

  const isEligible = consecutiveFeverFreeDays >= 3;
  let reason = '';
  if (isEligible) {
    reason = `Patient has ${consecutiveFeverFreeDays} consecutive fever-free days (required: 3). Eligible for discharge.`;
  } else {
    reason = `Patient has ${consecutiveFeverFreeDays} consecutive fever-free days (required: 3). Not eligible for discharge yet.`;
  }

  return {
    patientId: patient._id.toString(),
    patientName: patient.name,
    isEligible,
    consecutiveFeverFreeDays,
    requiredFeverFreeDays: 3,
    daySummaries,
    reason,
  };
}
