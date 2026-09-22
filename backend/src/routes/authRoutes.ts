import { Router, Request, Response } from 'express';
import { Staff } from '../models/Staff';

const router = Router();

/**
 * @route   POST /api/login
 * @desc    Authenticate staff member using staffId key
 * @access  Public
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { staffId } = req.body;

    if (!staffId || typeof staffId !== 'string') {
      res.status(400).json({
        error: 'staffId is required in request body',
      });
      return;
    }

    const cleanStaffId = staffId.trim().toUpperCase();
    const staff = await Staff.findOne({ staffId: cleanStaffId });

    if (!staff) {
      res.status(404).json({
        error: `Staff with ID '${cleanStaffId}' not found`,
      });
      return;
    }

    if (!staff.active) {
      res.status(401).json({
        error: `Staff account with ID '${cleanStaffId}' has been deactivated. Please contact an administrator.`,
      });
      return;
    }

    res.json({
      staffId: staff.staffId,
      name: staff.name,
      role: staff.role,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Error logging in',
      details: error.message,
    });
  }
});

export default router;
