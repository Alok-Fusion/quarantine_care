import { Router, Request, Response } from 'express';
import { Patient } from '../models/Patient';
import { authenticateStaff } from '../middleware/auth';

const router = Router();

// All bed routes require authentication
router.use(authenticateStaff);

export const TOTAL_CAPACITY = 74;

// Generate canonical 74 beds list
export function generateCanonicalBedsList(): Array<{ bedNumber: string; zone: string }> {
  const beds: Array<{ bedNumber: string; zone: string }> = [];

  // Zone A: Beds A-101 to A-120 (20 beds)
  for (let i = 1; i <= 20; i++) {
    const num = String(i).padStart(2, '0');
    beds.push({ bedNumber: `Bed A-1${num}`, zone: 'Zone A (Isolation Unit 1)' });
  }

  // Zone B: Beds B-201 to B-220 (20 beds)
  for (let i = 1; i <= 20; i++) {
    const num = String(i).padStart(2, '0');
    beds.push({ bedNumber: `Bed B-2${num}`, zone: 'Zone B (Isolation Unit 2)' });
  }

  // Zone C: Beds C-301 to C-320 (20 beds)
  for (let i = 1; i <= 20; i++) {
    const num = String(i).padStart(2, '0');
    beds.push({ bedNumber: `Bed C-3${num}`, zone: 'Zone C (High-Observation Unit)' });
  }

  // Zone D: Beds D-401 to D-414 (14 beds)
  for (let i = 1; i <= 14; i++) {
    const num = String(i).padStart(2, '0');
    beds.push({ bedNumber: `Bed D-4${num}`, zone: 'Zone D (Recovery & Step-Down)' });
  }

  return beds;
}

function normalizeBedNumber(bed: string): string {
  return bed.trim().replace(/^bed\s+/i, '').toLowerCase();
}

/**
 * @route   GET /api/beds
 * @desc    Get all 74 facility beds with real-time occupancy and patient details
 * @access  Staff (Nurse, Doctor, Admin)
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const canonicalBeds = generateCanonicalBedsList();
    const activePatients = await Patient.find({ status: 'active' });

    // Map active patients by normalized bed number
    const occupiedMap = new Map<string, any>();
    for (const p of activePatients) {
      const key = normalizeBedNumber(p.bedNumber);
      occupiedMap.set(key, p);
    }

    let occupiedCount = 0;
    const bedsData = canonicalBeds.map((bedItem) => {
      const normKey = normalizeBedNumber(bedItem.bedNumber);
      const patient = occupiedMap.get(normKey);

      if (patient) {
        occupiedCount++;
        return {
          bedNumber: bedItem.bedNumber,
          zone: bedItem.zone,
          status: 'occupied' as const,
          patientId: patient._id,
          patientName: patient.name,
          admittedDate: patient.admittedDate,
        };
      } else {
        return {
          bedNumber: bedItem.bedNumber,
          zone: bedItem.zone,
          status: 'free' as const,
          patientId: null,
          patientName: null,
          admittedDate: null,
        };
      }
    });

    const freeCount = TOTAL_CAPACITY - occupiedCount;

    res.json({
      capacity: TOTAL_CAPACITY,
      occupiedCount,
      freeCount,
      occupancyRate: Number((occupiedCount / TOTAL_CAPACITY).toFixed(4)),
      beds: bedsData,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Error fetching beds status',
      details: error.message,
    });
  }
});

export default router;
