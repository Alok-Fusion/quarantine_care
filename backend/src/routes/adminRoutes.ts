import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Patient } from '../models/Patient';
import { TemperatureLog } from '../models/TemperatureLog';
import { DoctorVisit } from '../models/DoctorVisit';
import { authenticateStaff, requireRole } from '../middleware/auth';
import { evaluateDischargeEligibility } from '../services/dischargeService';

const router = Router();

// All admin routes require staff authentication and admin role
router.use(authenticateStaff);
router.use(requireRole('admin'));

/**
 * @route   GET /api/stats (and /api/admin/stats)
 * @desc    Get facility statistics and alerts
 * @access  Admin only
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const CAPACITY = 74;

    const [occupied, dischargedCount, deceasedCount, totalAdmitted] = await Promise.all([
      Patient.countDocuments({ status: 'active' }),
      Patient.countDocuments({ status: 'discharged' }),
      Patient.countDocuments({ status: 'deceased' }),
      Patient.countDocuments(),
    ]);

    const totalResolved = dischargedCount + deceasedCount;
    
    // Mortality rate relative to total admitted or resolved
    const mortalityRate =
      totalAdmitted > 0
        ? Number((deceasedCount / totalAdmitted).toFixed(4))
        : 0;

    const successRate =
      totalResolved > 0
        ? Number((dischargedCount / totalResolved).toFixed(4))
        : 0;

    const mortalityAlert = mortalityRate > 0.15;
    const occupancyRate = Number((occupied / CAPACITY).toFixed(4));

    res.json({
      occupied,
      capacity: CAPACITY,
      dischargedCount,
      deceasedCount,
      totalAdmitted,
      totalResolved,
      occupancyRate,
      mortalityRate,
      successRate,
      mortalityAlert,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Error fetching admin statistics',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/admin/discharge-queue
 * @desc    Get active patients eligible for discharge
 * @access  Admin only
 */
router.get('/discharge-queue', async (req: Request, res: Response): Promise<void> => {
  try {
    const activePatients = await Patient.find({ status: 'active' }).sort({
      admittedDate: 1,
    });

    const queue = [];
    for (const patient of activePatients) {
      const eligibility = await evaluateDischargeEligibility(patient._id as mongoose.Types.ObjectId);
      if (eligibility.isEligible) {
        const latestTemp = await TemperatureLog.findOne({ patientId: patient._id }).sort({
          loggedAt: -1,
        });
        const latestVisit = await DoctorVisit.findOne({ patientId: patient._id }).sort({
          visitedAt: -1,
        });

        queue.push({
          ...patient.toObject(),
          eligibility,
          latestTemperature: latestTemp,
          latestVisit,
        });
      }
    }

    res.json(queue);
  } catch (error: any) {
    res.status(500).json({
      error: 'Error fetching discharge queue',
      details: error.message,
    });
  }
});

export default router;
