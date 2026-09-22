import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Patient, IPatient } from '../models/Patient';
import { TemperatureLog } from '../models/TemperatureLog';
import { DoctorVisit } from '../models/DoctorVisit';
import { authenticateStaff, requireRole } from '../middleware/auth';
import { getStartOfDay, getEndOfDay } from '../utils/dateUtils';
import { evaluateDischargeEligibility } from '../services/dischargeService';

const router = Router();

// All patient routes require staff authentication
router.use(authenticateStaff);

/**
 * @route   GET /api/patients/discharge-queue
 * @desc    Get all active patients eligible for discharge
 * @access  Staff (Nurse, Doctor, Admin)
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
        // Fetch latest temp & visit
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

/**
 * @route   GET /api/patients
 * @desc    Get all active patients with computed fields (tempLoggedToday, visitedToday)
 * @query   filter=not-visited-today
 * @access  Staff (Nurse, Doctor, Admin)
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const filterQuery = req.query.filter as string;
    const statusQuery = (req.query.status as string) || 'active';
    const searchQuery = req.query.search as string;

    const query: any = {};
    if (statusQuery !== 'all') {
      query.status = statusQuery;
    }

    if (searchQuery) {
      query.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { bedNumber: { $regex: searchQuery, $options: 'i' } },
      ];
    }

    const patients = await Patient.find(query)
      .populate('dischargedBy', 'name staffId role')
      .sort({ admittedDate: -1 });

    const todayStart = getStartOfDay();
    const todayEnd = getEndOfDay();

    // Fetch today's logs for batch computation
    const patientIds = patients.map((p) => p._id);

    const [todayTemps, todayVisits, allLatestTemps] = await Promise.all([
      TemperatureLog.find({
        patientId: { $in: patientIds },
        loggedAt: { $gte: todayStart, $lte: todayEnd },
      }),
      DoctorVisit.find({
        patientId: { $in: patientIds },
        visitedAt: { $gte: todayStart, $lte: todayEnd },
      }),
      TemperatureLog.aggregate([
        { $match: { patientId: { $in: patientIds } } },
        { $sort: { loggedAt: -1 } },
        {
          $group: {
            _id: '$patientId',
            latestTemp: { $first: '$$ROOT' },
          },
        },
      ]),
    ]);

    const todayTempsSet = new Set(todayTemps.map((t) => t.patientId.toString()));
    const todayVisitsSet = new Set(todayVisits.map((v) => v.patientId.toString()));
    const latestTempMap = new Map(
      allLatestTemps.map((item) => [item._id.toString(), item.latestTemp])
    );

    let enrichedPatients = await Promise.all(
      patients.map(async (patient) => {
        const pId = patient._id.toString();
        const tempLoggedToday = todayTempsSet.has(pId);
        const visitedToday = todayVisitsSet.has(pId);
        const latestTemp = latestTempMap.get(pId) || null;

        let dischargeEligible = false;
        let consecutiveFeverFreeDays = 0;

        if (patient.status === 'active') {
          try {
            const eligibility = await evaluateDischargeEligibility(patient._id as mongoose.Types.ObjectId);
            dischargeEligible = eligibility.isEligible;
            consecutiveFeverFreeDays = eligibility.consecutiveFeverFreeDays;
          } catch (e) {
            // Ignore individual evaluation failure
          }
        }

        return {
          ...patient.toObject(),
          tempLoggedToday,
          visitedToday,
          latestTemperature: latestTemp,
          consecutiveFeverFreeDays,
          dischargeEligible,
        };
      })
    );

    // Apply ?filter=not-visited-today
    if (filterQuery === 'not-visited-today') {
      enrichedPatients = enrichedPatients.filter((p) => !p.visitedToday);
    }

    res.json(enrichedPatients);
  } catch (error: any) {
    res.status(500).json({
      error: 'Error fetching patients',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/patients
 * @desc    Admit a new patient
 * @access  Staff (Nurse, Doctor, Admin)
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, bedNumber, admittedDate, notes } = req.body;

    if (!name || !bedNumber) {
      res.status(400).json({
        error: 'Patient name and bedNumber are required',
      });
      return;
    }

    const patient = await Patient.create({
      name: name.trim(),
      bedNumber: bedNumber.trim(),
      admittedDate: admittedDate ? new Date(admittedDate) : new Date(),
      status: 'active',
      notes: notes ? notes.trim() : '',
    });

    res.status(201).json(patient);
  } catch (error: any) {
    res.status(500).json({
      error: 'Error admitting patient',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/patients/:id/discharge-eligible
 * @desc    Get discharge eligibility status and breakdown for a patient
 * @access  Staff (Nurse, Doctor, Admin)
 */
router.get('/:id/discharge-eligible', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid patient ID format' });
      return;
    }

    const result = await evaluateDischargeEligibility(id);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'Patient not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({
      error: 'Error evaluating discharge eligibility',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/patients/:id
 * @desc    Get full patient detail with temperature and visit history
 * @access  Staff (Nurse, Doctor, Admin)
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid patient ID format' });
      return;
    }

    const patient = await Patient.findById(id).populate(
      'dischargedBy',
      'name staffId role'
    );

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const todayStart = getStartOfDay();
    const todayEnd = getEndOfDay();

    const [temperatureLogs, doctorVisits, eligibility] = await Promise.all([
      TemperatureLog.find({ patientId: patient._id })
        .populate('loggedBy', 'name staffId role')
        .sort({ loggedAt: -1 }),
      DoctorVisit.find({ patientId: patient._id })
        .populate('visitedBy', 'name staffId role')
        .sort({ visitedAt: -1 }),
      evaluateDischargeEligibility(patient._id as mongoose.Types.ObjectId),
    ]);

    const tempLoggedToday = temperatureLogs.some(
      (log) => log.loggedAt >= todayStart && log.loggedAt <= todayEnd
    );
    const visitedToday = doctorVisits.some(
      (visit) => visit.visitedAt >= todayStart && visit.visitedAt <= todayEnd
    );

    res.json({
      patient,
      temperatureLogs,
      doctorVisits,
      eligibility,
      tempLoggedToday,
      visitedToday,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Error fetching patient details',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/patients/:id/temperature
 * @desc    Nurse logs patient temperature (duplicate prevention unless ?force=true)
 * @access  Nurse only
 */
router.post(
  '/:id/temperature',
  requireRole('nurse'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { value } = req.body;
      const force = req.query.force === 'true';

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid patient ID format' });
        return;
      }

      const tempValue = Number(value);
      if (isNaN(tempValue) || tempValue < 30 || tempValue > 115) {
        res.status(400).json({
          error: 'Valid temperature value is required (e.g. 98.6 or 101.2)',
        });
        return;
      }

      const patient = await Patient.findById(id);
      if (!patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      if (patient.status !== 'active') {
        res.status(400).json({
          error: `Cannot log temperature for patient with status '${patient.status}'`,
        });
        return;
      }

      // Check if temperature was already logged today
      const todayStart = getStartOfDay();
      const todayEnd = getEndOfDay();

      const existingLog = await TemperatureLog.findOne({
        patientId: patient._id,
        loggedAt: { $gte: todayStart, $lte: todayEnd },
      }).sort({ loggedAt: -1 });

      if (existingLog && !force) {
        res.status(409).json({
          error: 'Temperature already logged today for this patient',
          existingLogTime: existingLog.loggedAt,
          existingValue: existingLog.value,
          hasFever: existingLog.hasFever,
          message:
            'Append ?force=true query parameter to override and record an additional reading',
        });
        return;
      }

      const newLog = await TemperatureLog.create({
        patientId: patient._id,
        value: tempValue,
        loggedAt: new Date(),
        loggedBy: req.staff!._id,
      });

      const populatedLog = await TemperatureLog.findById(newLog._id).populate(
        'loggedBy',
        'name staffId role'
      );

      res.status(201).json(populatedLog);
    } catch (error: any) {
      res.status(500).json({
        error: 'Error recording temperature log',
        details: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/patients/:id/visit
 * @desc    Doctor logs a visit (requires temperature recorded today)
 * @access  Doctor only
 */
router.post(
  '/:id/visit',
  requireRole('doctor'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { notes } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid patient ID format' });
        return;
      }

      if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
        res.status(400).json({
          error: 'Clinical visit notes are required',
        });
        return;
      }

      const patient = await Patient.findById(id);
      if (!patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      if (patient.status !== 'active') {
        res.status(400).json({
          error: `Cannot log visit for patient with status '${patient.status}'`,
        });
        return;
      }

      // Check if temperature was logged today
      const todayStart = getStartOfDay();
      const todayEnd = getEndOfDay();

      const tempToday = await TemperatureLog.findOne({
        patientId: patient._id,
        loggedAt: { $gte: todayStart, $lte: todayEnd },
      });

      if (!tempToday) {
        res.status(400).json({
          error: 'Cannot log visit: temperature not yet recorded today',
        });
        return;
      }

      const newVisit = await DoctorVisit.create({
        patientId: patient._id,
        notes: notes.trim(),
        visitedAt: new Date(),
        visitedBy: req.staff!._id,
      });

      const populatedVisit = await DoctorVisit.findById(newVisit._id).populate(
        'visitedBy',
        'name staffId role'
      );

      res.status(201).json(populatedVisit);
    } catch (error: any) {
      res.status(500).json({
        error: 'Error recording doctor visit',
        details: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/patients/:id/discharge
 * @desc    Doctor discharges an eligible patient (requires 3 consecutive fever-free days)
 * @access  Doctor only
 */
router.post(
  '/:id/discharge',
  requireRole('doctor'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid patient ID format' });
        return;
      }

      const patient = await Patient.findById(id);
      if (!patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      if (patient.status !== 'active') {
        res.status(400).json({
          error: `Patient is already ${patient.status}`,
        });
        return;
      }

      // Verify discharge eligibility
      const eligibility = await evaluateDischargeEligibility(patient._id as mongoose.Types.ObjectId);
      if (!eligibility.isEligible) {
        res.status(400).json({
          error: 'Patient is not eligible for discharge. Requires 3 consecutive fever-free days.',
          eligibility,
        });
        return;
      }

      patient.status = 'discharged';
      patient.dischargeDate = new Date();
      patient.dischargedBy = req.staff!._id as mongoose.Types.ObjectId;
      if (req.body.notes) {
        patient.notes = patient.notes
          ? `${patient.notes}\n[Discharge Note]: ${req.body.notes}`
          : `[Discharge Note]: ${req.body.notes}`;
      }
      await patient.save();

      res.json({
        message: 'Patient successfully discharged',
        patient,
        eligibility,
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Error processing patient discharge',
        details: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/patients/:id/mark-deceased
 * @desc    Doctor marks patient as deceased
 * @access  Doctor only
 */
router.post(
  '/:id/mark-deceased',
  requireRole('doctor'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { notes } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid patient ID format' });
        return;
      }

      const patient = await Patient.findById(id);
      if (!patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      if (patient.status !== 'active') {
        res.status(400).json({
          error: `Patient is already marked as ${patient.status}`,
        });
        return;
      }

      patient.status = 'deceased';
      patient.dischargeDate = new Date();
      if (notes) {
        patient.notes = patient.notes
          ? `${patient.notes}\n[Deceased Note]: ${notes.trim()}`
          : `[Deceased Note]: ${notes.trim()}`;
      }
      await patient.save();

      res.json({
        message: 'Patient marked as deceased',
        patient,
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Error marking patient as deceased',
        details: error.message,
      });
    }
  }
);

export default router;
