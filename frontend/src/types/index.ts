export type StaffRole = 'nurse' | 'doctor' | 'admin';

export interface Staff {
  _id?: string;
  staffId: string;
  name: string;
  role: StaffRole;
  active?: boolean;
  createdBy?: {
    _id: string;
    name: string;
    staffId: string;
    role: StaffRole;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  _id?: string;
  staffId: string;
  name: string;
  role: StaffRole;
}

export type PatientStatus = 'active' | 'discharged' | 'deceased';

export interface TemperatureLog {
  _id: string;
  patientId: string;
  value: number;
  hasFever: boolean;
  loggedAt: string;
  loggedBy?: {
    _id: string;
    name: string;
    staffId: string;
    role: StaffRole;
  };
}

export interface DoctorVisit {
  _id: string;
  patientId: string;
  visitedAt: string;
  notes: string;
  visitedBy?: {
    _id: string;
    name: string;
    staffId: string;
    role: StaffRole;
  };
}

export interface DischargeEligibility {
  patientId: string;
  patientName: string;
  isEligible: boolean;
  consecutiveFeverFreeDays: number;
  requiredFeverFreeDays: number;
  daySummaries: Array<{
    date: string;
    readingsCount: number;
    maxTemperature: number;
    hasFever: boolean;
    loggedAtLatest: string;
  }>;
  reason: string;
}

export interface Patient {
  _id: string;
  name: string;
  bedNumber: string;
  admittedDate: string;
  status: PatientStatus;
  dischargeDate?: string | null;
  notes?: string;
  dischargedBy?: {
    name: string;
    staffId: string;
    role: StaffRole;
  } | null;
  // Computed fields
  tempLoggedToday?: boolean;
  visitedToday?: boolean;
  latestTemperature?: TemperatureLog | null;
  latestTemp?: TemperatureLog | null;
  consecutiveFeverFreeDays?: number;
  dischargeEligible?: boolean;
  eligibility?: DischargeEligibility;
}

export interface PatientDetailResponse {
  patient: Patient;
  temperatureLogs: TemperatureLog[];
  doctorVisits: DoctorVisit[];
  eligibility: DischargeEligibility;
  tempLoggedToday: boolean;
  visitedToday: boolean;
}

export interface FacilityStats {
  occupied: number;
  capacity: number;
  dischargedCount: number;
  deceasedCount: number;
  totalAdmitted: number;
  totalResolved: number;
  occupancyRate: number;
  mortalityRate: number;
  successRate: number;
  mortalityAlert: boolean;
}

export interface BedItem {
  bedNumber: string;
  zone: string;
  status: 'occupied' | 'free';
  patientId?: string | null;
  patientName?: string | null;
  admittedDate?: string | null;
}

export interface BedsResponse {
  capacity: number;
  occupiedCount: number;
  freeCount: number;
  occupancyRate: number;
  beds: BedItem[];
}

export type NotificationType =
  | 'new-patient'
  | 'discharge-eligible'
  | 'temp-overdue'
  | 'visit-overdue'
  | 'mortality-alert';

export interface NotificationItem {
  _id: string;
  recipientStaffId: string;
  type: NotificationType;
  message: string;
  relatedPatientId?: {
    _id: string;
    name: string;
    bedNumber: string;
    status: PatientStatus;
  } | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  unreadCount: number;
  notifications: NotificationItem[];
}
