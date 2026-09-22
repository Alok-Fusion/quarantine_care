import mongoose, { Types } from 'mongoose';
import { Staff } from '../models/Staff';
import { Notification } from '../models/Notification';

/**
 * Triggered on patient admission:
 * Notifies all active nurses and doctors: "New patient [name] admitted to bed [X]"
 */
export async function notifyPatientAdmission(
  patientName: string,
  bedNumber: string,
  patientId: Types.ObjectId
): Promise<void> {
  try {
    const recipients = await Staff.find({
      active: true,
      role: { $in: ['nurse', 'doctor'] },
    });

    if (recipients.length === 0) return;

    const notifications = recipients.map((staff) => ({
      recipientStaffId: staff._id,
      type: 'new-patient' as const,
      message: `New patient ${patientName} admitted to ${bedNumber}`,
      relatedPatientId: patientId,
      read: false,
      createdAt: new Date(),
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    console.error('[NotificationService] Error creating admission notifications:', error);
  }
}

/**
 * Triggered when a patient becomes discharge-eligible:
 * Notifies all active doctors and admins: "[name] is discharge-eligible"
 */
export async function notifyDischargeEligible(
  patientName: string,
  patientId: Types.ObjectId
): Promise<void> {
  try {
    const recipients = await Staff.find({
      active: true,
      role: { $in: ['doctor', 'admin'] },
    });

    if (recipients.length === 0) return;

    // Check if an unread notification already exists for this patient to prevent spam
    const existing = await Notification.findOne({
      relatedPatientId: patientId,
      type: 'discharge-eligible',
      read: false,
    });

    if (existing) return;

    const notifications = recipients.map((staff) => ({
      recipientStaffId: staff._id,
      type: 'discharge-eligible' as const,
      message: `Patient ${patientName} has achieved 3 consecutive fever-free days and is discharge-eligible`,
      relatedPatientId: patientId,
      read: false,
      createdAt: new Date(),
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    console.error('[NotificationService] Error creating discharge-eligible notifications:', error);
  }
}

/**
 * Triggered when facility mortality rate crosses 15%:
 * Notifies all active admins: "Mortality rate alert: [rate]%"
 */
export async function notifyMortalityAlert(mortalityRate: number): Promise<void> {
  try {
    const admins = await Staff.find({
      active: true,
      role: 'admin',
    });

    if (admins.length === 0) return;

    const percentStr = (mortalityRate * 100).toFixed(1);

    // Prevent duplicate alert within the last 12 hours
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const existing = await Notification.findOne({
      type: 'mortality-alert',
      createdAt: { $gte: twelveHoursAgo },
    });

    if (existing) return;

    const notifications = admins.map((admin) => ({
      recipientStaffId: admin._id,
      type: 'mortality-alert' as const,
      message: `Critical Facility Alert: Quarantine mortality rate has crossed ${percentStr}%`,
      relatedPatientId: null,
      read: false,
      createdAt: new Date(),
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    console.error('[NotificationService] Error creating mortality alert notifications:', error);
  }
}
