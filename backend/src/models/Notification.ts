import mongoose, { Document, Schema, Types } from 'mongoose';

export type NotificationType =
  | 'new-patient'
  | 'discharge-eligible'
  | 'temp-overdue'
  | 'visit-overdue'
  | 'mortality-alert';

export interface INotification extends Document {
  recipientStaffId: Types.ObjectId;
  type: NotificationType;
  message: string;
  relatedPatientId?: Types.ObjectId | null;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    recipientStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: [true, 'Recipient Staff ID is required'],
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: [
        'new-patient',
        'discharge-eligible',
        'temp-overdue',
        'visit-overdue',
        'mortality-alert',
      ],
      index: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    relatedPatientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Notification = mongoose.model<INotification>(
  'Notification',
  NotificationSchema
);
