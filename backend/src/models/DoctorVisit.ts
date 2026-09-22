import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDoctorVisit extends Document {
  patientId: Types.ObjectId;
  visitedAt: Date;
  notes: string;
  visitedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DoctorVisitSchema: Schema = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    visitedAt: {
      type: Date,
      required: [true, 'Visit timestamp is required'],
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      required: [true, 'Visit clinical notes are required'],
      trim: true,
    },
    visitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: [true, 'Visited by doctor reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

export const DoctorVisit = mongoose.model<IDoctorVisit>(
  'DoctorVisit',
  DoctorVisitSchema
);
