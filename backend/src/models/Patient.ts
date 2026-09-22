import mongoose, { Document, Schema, Types } from 'mongoose';

export type PatientStatus = 'active' | 'discharged' | 'deceased';

export interface IPatient extends Document {
  name: string;
  bedNumber: string;
  admittedDate: Date;
  status: PatientStatus;
  dischargeDate?: Date | null;
  notes?: string;
  dischargedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
    },
    bedNumber: {
      type: String,
      required: [true, 'Bed number is required'],
      trim: true,
    },
    admittedDate: {
      type: Date,
      required: [true, 'Admission date is required'],
      default: Date.now,
    },
    status: {
      type: String,
      required: [true, 'Patient status is required'],
      enum: {
        values: ['active', 'discharged', 'deceased'],
        message: '{VALUE} is not a valid status. Allowed: active, discharged, deceased',
      },
      default: 'active',
      index: true,
    },
    dischargeDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    dischargedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Patient = mongoose.model<IPatient>('Patient', PatientSchema);
