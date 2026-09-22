import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Staff } from '../models/Staff';
import { Patient } from '../models/Patient';
import { TemperatureLog } from '../models/TemperatureLog';
import { DoctorVisit } from '../models/DoctorVisit';
import { Notification } from '../models/Notification';

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/quarantinecare';

function getPastDate(daysAgo: number, hour = 9, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function seed() {
  try {
    console.log('='.repeat(65));
    console.log('      QUARANTINE CARE DATABASE SEEDING ENGINE      ');
    console.log('='.repeat(65));
    console.log(`Connecting to: ${MONGODB_URI.replace(/:[^:]*@/, ':****@')}...`);

    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // 1. Clear existing data
    console.log('\n[1/4] Clearing existing collections...');
    await Promise.all([
      Staff.deleteMany({}),
      Patient.deleteMany({}),
      TemperatureLog.deleteMany({}),
      DoctorVisit.deleteMany({}),
      Notification.deleteMany({}),
    ]);
    console.log('✓ All previous records cleared');

    // 2. Seed Staff Members
    console.log('\n[2/4] Creating Staff accounts...');
    const nurse = await Staff.create({
      staffId: 'N001',
      name: 'Nurse Sarah Jenkins',
      role: 'nurse',
      active: true,
      createdBy: null,
    });

    const doctor = await Staff.create({
      staffId: 'D001',
      name: 'Dr. Alexander Ross, MD',
      role: 'doctor',
      active: true,
      createdBy: null,
    });

    const admin = await Staff.create({
      staffId: 'A001',
      name: 'Director Marcus Vance',
      role: 'admin',
      active: true,
      createdBy: null,
    });

    console.log('✓ Created 3 staff members (Nurse, Doctor, Admin)');

    // 3. Seed Patients & History
    console.log('\n[3/4] Seeding ~20 realistic patient records with clinical logs...');

    // --- Group A: Discharge-Eligible Patients (3+ consecutive fever-free days) ---
    const eligiblePatientsData = [
      {
        name: 'Eleanor Vance',
        bedNumber: 'Bed A-101',
        admittedDaysAgo: 6,
        status: 'active' as const,
        tempHistory: [
          { daysAgo: 5, value: 102.1 }, // fever
          { daysAgo: 4, value: 100.8 }, // fever
          { daysAgo: 3, value: 98.6 },  // fever-free 1
          { daysAgo: 2, value: 98.4 },  // fever-free 2
          { daysAgo: 1, value: 98.6 },  // fever-free 3
          { daysAgo: 0, value: 98.5 },  // fever-free 4
        ],
        visitNotes: [
          { daysAgo: 3, notes: 'Fever broke overnight. Oxygen saturation normal at 98%.' },
          { daysAgo: 1, notes: 'Lungs clear on auscultation. Vitals stable.' },
          { daysAgo: 0, notes: 'Patient is asymptomatic and ready for final discharge evaluation.' },
        ],
      },
      {
        name: 'David Chen',
        bedNumber: 'Bed A-102',
        admittedDaysAgo: 5,
        status: 'active' as const,
        tempHistory: [
          { daysAgo: 4, value: 101.4 }, // fever
          { daysAgo: 3, value: 98.2 },  // fever-free 1
          { daysAgo: 2, value: 98.4 },  // fever-free 2
          { daysAgo: 1, value: 98.6 },  // fever-free 3
          { daysAgo: 0, value: 98.2 },  // fever-free 4
        ],
        visitNotes: [
          { daysAgo: 2, notes: 'Good appetite, no cough or fatigue reported.' },
          { daysAgo: 0, notes: 'Candidate for discharge protocol. All vitals normalized.' },
        ],
      },
      {
        name: 'Amina Al-Mansoor',
        bedNumber: 'Bed A-103',
        admittedDaysAgo: 5,
        status: 'active' as const,
        tempHistory: [
          { daysAgo: 4, value: 100.9 }, // fever
          { daysAgo: 3, value: 98.8 },  // fever-free 1
          { daysAgo: 2, value: 98.4 },  // fever-free 2
          { daysAgo: 1, value: 98.1 },  // fever-free 3
        ],
        visitNotes: [
          { daysAgo: 3, notes: 'Temperature down to normal. Patient resting comfortably.' },
          { daysAgo: 1, notes: '3 consecutive fever-free days reached. Awaiting today temperature.' },
        ],
      },
      {
        name: 'Carlos Rodriguez',
        bedNumber: 'Bed A-104',
        admittedDaysAgo: 5,
        status: 'active' as const,
        tempHistory: [
          { daysAgo: 3, value: 98.6 }, // fever-free 1
          { daysAgo: 2, value: 98.4 }, // fever-free 2
          { daysAgo: 1, value: 98.2 }, // fever-free 3
          { daysAgo: 0, value: 98.3 }, // fever-free 4
        ],
        visitNotes: [
          { daysAgo: 1, notes: 'Mild rhinorrhea resolved. Patient in high spirits.' },
        ],
      },
    ];

    // --- Group B: Mid-Cycle Patients (Active, still recovering, not yet eligible) ---
    const midCyclePatientsData = [
      {
        name: "Liam O'Connor",
        bedNumber: 'Bed B-201',
        admittedDaysAgo: 4,
        status: 'active' as const,
        tempHistory: [
          { daysAgo: 3, value: 102.3 }, // fever
          { daysAgo: 2, value: 101.5 }, // fever
          { daysAgo: 1, value: 100.6 }, // fever
          { daysAgo: 0, value: 99.1 },  // fever-free 1
        ],
        visitNotes: [
          { daysAgo: 2, notes: 'Prescribed antipyretics and IV hydration.' },
          { daysAgo: 0, notes: 'Fever starting to subside. Continue current treatment plan.' },
        ],
      },
      {
        name: 'Sophia Patel',
        bedNumber: 'Bed B-202',
        admittedDaysAgo: 4,
        status: 'active' as const,
        tempHistory: [
          { daysAgo: 3, value: 102.0 }, // fever
          { daysAgo: 2, value: 101.2 }, // fever
          { daysAgo: 1, value: 98.6 },  // fever-free 1
          { daysAgo: 0, value: 98.4 },  // fever-free 2 (needs 1 more day)
        ],
        visitNotes: [
          { daysAgo: 1, notes: 'Day 1 of fever-free state. Monitoring for rebound fever.' },
          { daysAgo: 0, notes: 'Day 2 fever-free. Eligible for discharge tomorrow if stable.' },
        ],
      },
      {
        name: 'James Wilson',
        bedNumber: 'Bed B-203',
        admittedDaysAgo: 3,
        status: 'active' as const,
        tempHistory: [
          { daysAgo: 2, value: 99.0 },  // fever-free
          { daysAgo: 1, value: 98.6 },  // fever-free
          { daysAgo: 0, value: 101.4 }, // fever spike today
        ],
        visitNotes: [
          { daysAgo: 1, notes: 'Patient was doing well.' },
          { daysAgo: 0, notes: 'Acute temperature spike to 101.4F today. Ordered blood panel and chest X-ray.' },
        ],
      },
      {
        name: 'Elena Rostova',
        bedNumber: 'Bed B-204',
        admittedDaysAgo: 2,
        status: 'active' as const,
        tempHistory: [
          { daysAgo: 1, value: 102.5 }, // fever
          { daysAgo: 0, value: 101.8 }, // fever
        ],
        visitNotes: [
          { daysAgo: 0, notes: 'Persistent high fever and productive cough. Supplemental oxygen at 2L/min.' },
        ],
      },
      {
        name: 'Kwame Mensah',
        bedNumber: 'Bed B-205',
        admittedDaysAgo: 5,
        status: 'active' as const,
        tempHistory: [
          { daysAgo: 4, value: 101.9 }, // fever
          { daysAgo: 3, value: 98.4 },  // fever-free
          { daysAgo: 2, value: 98.6 },  // fever-free
          { daysAgo: 1, value: 100.8 }, // relapse fever yesterday
          { daysAgo: 0, value: 99.2 },  // fever-free 1
        ],
        visitNotes: [
          { daysAgo: 1, notes: 'Secondary temperature spike yesterday. Resetting quarantine timeline.' },
        ],
      },
      {
        name: 'Maria Santos',
        bedNumber: 'Bed B-206',
        admittedDaysAgo: 3,
        status: 'active' as const,
        tempHistory: [
          { daysAgo: 2, value: 98.6 }, // fever-free 1
          { daysAgo: 1, value: 98.4 }, // fever-free 2
        ],
        visitNotes: [
          { daysAgo: 2, notes: 'Mild symptoms upon admission, settling well.' },
        ],
      },
      {
        name: 'Oliver Taylor',
        bedNumber: 'Bed B-207',
        admittedDaysAgo: 4,
        status: 'active' as const,
        tempHistory: [
          { daysAgo: 3, value: 100.9 },
          { daysAgo: 2, value: 99.1 },
          { daysAgo: 1, value: 98.6 },
          { daysAgo: 0, value: 100.5 }, // fever today
        ],
        visitNotes: [
          { daysAgo: 0, notes: 'Mild fever recurrence. Continue symptom monitoring.' },
        ],
      },
    ];

    // --- Group C: Just Admitted Patients ---
    const newlyAdmittedPatientsData = [
      {
        name: 'Zoe Kravitz',
        bedNumber: 'Bed C-301',
        admittedDaysAgo: 0,
        status: 'active' as const,
        tempHistory: [],
        visitNotes: [],
      },
      {
        name: 'Mateo Silva',
        bedNumber: 'Bed C-302',
        admittedDaysAgo: 0,
        status: 'active' as const,
        tempHistory: [
          { daysAgo: 0, value: 101.6 },
        ],
        visitNotes: [
          { daysAgo: 0, notes: 'Initial intake assessment. Patient placed in isolation.' },
        ],
      },
      {
        name: 'Hana Takahashi',
        bedNumber: 'Bed C-303',
        admittedDaysAgo: 1,
        status: 'active' as const,
        tempHistory: [
          { daysAgo: 1, value: 100.9 },
          { daysAgo: 0, value: 99.4 },
        ],
        visitNotes: [
          { daysAgo: 0, notes: 'Admitted yesterday with flu-like symptoms. Responding to treatment.' },
        ],
      },
      {
        name: 'Benjamin Clark',
        bedNumber: 'Bed C-304',
        admittedDaysAgo: 0,
        status: 'active' as const,
        tempHistory: [],
        visitNotes: [],
      },
    ];

    // --- Group D: Discharged Patients ---
    const dischargedPatientsData = [
      {
        name: 'Grace Hopper',
        bedNumber: 'Bed D-401',
        admittedDaysAgo: 9,
        status: 'discharged' as const,
        dischargeDaysAgo: 2,
        notes: 'Successfully recovered after completing 14-day protocol and testing negative.',
        tempHistory: [
          { daysAgo: 8, value: 102.2 },
          { daysAgo: 7, value: 101.4 },
          { daysAgo: 6, value: 99.8 },
          { daysAgo: 5, value: 98.6 },
          { daysAgo: 4, value: 98.4 },
          { daysAgo: 3, value: 98.6 },
          { daysAgo: 2, value: 98.2 },
        ],
        visitNotes: [
          { daysAgo: 2, notes: 'Final discharge clearance approved. Patient sent home in good health.' },
        ],
      },
      {
        name: 'Alan Turing',
        bedNumber: 'Bed D-402',
        admittedDaysAgo: 8,
        status: 'discharged' as const,
        dischargeDaysAgo: 1,
        notes: 'Discharged following 5 consecutive fever-free days.',
        tempHistory: [
          { daysAgo: 7, value: 101.8 },
          { daysAgo: 6, value: 100.2 },
          { daysAgo: 5, value: 98.5 },
          { daysAgo: 4, value: 98.6 },
          { daysAgo: 3, value: 98.4 },
          { daysAgo: 2, value: 98.5 },
          { daysAgo: 1, value: 98.3 },
        ],
        visitNotes: [
          { daysAgo: 1, notes: 'Patient fully cleared of contagion risk and released.' },
        ],
      },
      {
        name: 'Ada Lovelace',
        bedNumber: 'Bed D-403',
        admittedDaysAgo: 7,
        status: 'discharged' as const,
        dischargeDaysAgo: 0,
        notes: 'Cleared quarantine today.',
        tempHistory: [
          { daysAgo: 6, value: 101.5 },
          { daysAgo: 5, value: 100.4 },
          { daysAgo: 4, value: 98.6 },
          { daysAgo: 3, value: 98.4 },
          { daysAgo: 2, value: 98.2 },
          { daysAgo: 1, value: 98.4 },
          { daysAgo: 0, value: 98.5 },
        ],
        visitNotes: [
          { daysAgo: 0, notes: 'All criteria met. Official discharge signed off by Dr. Ross.' },
        ],
      },
    ];

    // --- Group E: Deceased Patients ---
    const deceasedPatientsData = [
      {
        name: 'Arthur Pendelton',
        bedNumber: 'Bed D-413',
        admittedDaysAgo: 7,
        status: 'deceased' as const,
        dischargeDaysAgo: 2,
        notes: '[Deceased Note]: Patient suffered acute respiratory distress syndrome (ARDS) refractory to mechanical ventilation.',
        tempHistory: [
          { daysAgo: 6, value: 103.5 },
          { daysAgo: 5, value: 104.1 },
          { daysAgo: 4, value: 103.8 },
          { daysAgo: 3, value: 104.2 },
          { daysAgo: 2, value: 102.9 },
        ],
        visitNotes: [
          { daysAgo: 3, notes: 'Transferred to intensive isolation. Critical condition.' },
          { daysAgo: 2, notes: 'Cardiac arrest at 04:15. Pronounced deceased by Dr. Ross.' },
        ],
      },
      {
        name: 'Margaret Thorne',
        bedNumber: 'Bed D-414',
        admittedDaysAgo: 6,
        status: 'deceased' as const,
        dischargeDaysAgo: 1,
        notes: '[Deceased Note]: Septic shock with secondary bacterial pneumonia and multi-organ failure.',
        tempHistory: [
          { daysAgo: 5, value: 103.2 },
          { daysAgo: 4, value: 103.9 },
          { daysAgo: 3, value: 103.4 },
          { daysAgo: 2, value: 102.8 },
          { daysAgo: 1, value: 101.9 },
        ],
        visitNotes: [
          { daysAgo: 2, notes: 'Multi-organ failure markers rising.' },
          { daysAgo: 1, notes: 'Patient passed away at 22:40 surrounded by palliative care staff.' },
        ],
      },
    ];

    const allPatientDatasets = [
      ...eligiblePatientsData,
      ...midCyclePatientsData,
      ...newlyAdmittedPatientsData,
      ...dischargedPatientsData,
      ...deceasedPatientsData,
    ];

    let totalTempLogs = 0;
    let totalVisits = 0;

    for (const data of allPatientDatasets) {
      const patient = await Patient.create({
        name: data.name,
        bedNumber: data.bedNumber,
        admittedDate: getPastDate(data.admittedDaysAgo, 8, 0),
        status: data.status,
        dischargeDate:
          'dischargeDaysAgo' in data
            ? getPastDate(data.dischargeDaysAgo!, 16, 0)
            : null,
        notes: (data as any).notes || '',
        dischargedBy: data.status === 'discharged' ? doctor._id : null,
      });

      // Add temperature logs
      for (const t of data.tempHistory) {
        await TemperatureLog.create({
          patientId: patient._id,
          value: t.value,
          loggedAt: getPastDate(t.daysAgo, 8, 30),
          loggedBy: nurse._id,
        });
        totalTempLogs++;
      }

      // Add doctor visits
      for (const v of data.visitNotes) {
        await DoctorVisit.create({
          patientId: patient._id,
          visitedAt: getPastDate(v.daysAgo, 14, 0),
          notes: v.notes,
          visitedBy: doctor._id,
        });
        totalVisits++;
      }
    }

    console.log(
      `✓ Seeded ${allPatientDatasets.length} patients with ${totalTempLogs} temperature logs and ${totalVisits} doctor visits.`
    );

    // Initial Welcome Notifications
    await Notification.create([
      {
        recipientStaffId: nurse._id,
        type: 'new-patient',
        message: 'Welcome to Quarantine Care Nurse Station. Daily vitals tracking initialized.',
        read: false,
      },
      {
        recipientStaffId: doctor._id,
        type: 'discharge-eligible',
        message: 'Multiple active patients are eligible for discharge rounds.',
        read: false,
      },
      {
        recipientStaffId: admin._id,
        type: 'new-patient',
        message: 'Facility bed capacity tracking initialized (74 beds available).',
        read: false,
      },
    ]);

    // 4. Output Summary & Credentials
    console.log('\n[4/4] Generating Seed Summary & Quick Access Credentials...');
    console.log('='.repeat(65));
    console.log('                 LOGIN CREDENTIALS (STAFF IDs)                 ');
    console.log('='.repeat(65));
    console.table([
      { Role: 'NURSE', 'Staff ID': 'N001', Name: nurse.name, Header: 'x-staff-id: N001' },
      { Role: 'DOCTOR', 'Staff ID': 'D001', Name: doctor.name, Header: 'x-staff-id: D001' },
      { Role: 'ADMIN', 'Staff ID': 'A001', Name: admin.name, Header: 'x-staff-id: A001' },
    ]);

    console.log('='.repeat(65));
    console.log('✓ Database seeding complete!\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('✗ Seeding failed with error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
