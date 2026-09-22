import mongoose, { Document, Schema } from 'mongoose';

export type StaffRole = 'nurse' | 'doctor' | 'admin';

export interface IStaff extends Document {
  name: string;
  role: StaffRole;
  staffId: string;
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
  },
  {
    timestamps: true,
  }
);

export const Staff = mongoose.model<IStaff>('Staff', StaffSchema);
