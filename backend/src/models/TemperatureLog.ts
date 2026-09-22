import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITemperatureLog extends Document {
  patientId: Types.ObjectId;
  value: number;
  hasFever: boolean;
  loggedAt: Date;
  loggedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export function calculateHasFever(value: number): boolean {
  // If value is in Celsius (typically 35-43) vs Fahrenheit (typically 95-108)
  if (value >= 100.4) {
    return true;
  }
  if (value >= 38.0 && value < 45.0) {
    return true;
  }
  return false;
}

const TemperatureLogSchema: Schema = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient ID is required'],
      index: true,
    },
    value: {
      type: Number,
      required: [true, 'Temperature value is required'],
      min: [30, 'Temperature value too low'],
      max: [115, 'Temperature value too high'],
    },
    hasFever: {
      type: Boolean,
      required: true,
      default: function (this: any) {
        return calculateHasFever(this.value);
      },
    },
    loggedAt: {
      type: Date,
      required: [true, 'Logged timestamp is required'],
      default: Date.now,
      index: true,
    },
    loggedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: [true, 'Logged by staff reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

TemperatureLogSchema.pre<ITemperatureLog>('save', function (next) {
  this.hasFever = calculateHasFever(this.value);
  next();
});

export const TemperatureLog = mongoose.model<ITemperatureLog>(
  'TemperatureLog',
  TemperatureLogSchema
);
