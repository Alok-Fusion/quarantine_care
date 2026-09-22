import mongoose, { Document, Schema, Types } from 'mongoose';

export type StaffRole = 'nurse' | 'doctor' | 'admin';

export interface IStaff extends Document {
  name: string;
  role: StaffRole;
  staffId: string;
  active: boolean;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Staff name is required'],
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'Staff role is required'],
      enum: {
        values: ['nurse', 'doctor', 'admin'],
        message: '{VALUE} is not a valid role. Allowed: nurse, doctor, admin',
      },
    },
    staffId: {
      type: String,
      required: [true, 'Staff ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Staff = mongoose.model<IStaff>('Staff', StaffSchema);
