import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Staff, StaffRole } from '../models/Staff';
import { authenticateStaff, requireRole } from '../middleware/auth';

const router = Router();

// All staff routes require Admin role
router.use(authenticateStaff);
router.use(requireRole('admin'));

/**
 * Helper to auto-generate the next incrementing staffId
 * E.g. role 'nurse' -> prefix 'N' -> N001, N002, N003, N004...
 * role 'doctor' -> prefix 'D' -> D001, D002...
 * role 'admin' -> prefix 'A' -> A001, A002...
 */
async function generateNextStaffId(role: StaffRole): Promise<string> {
  const prefixMap: Record<StaffRole, string> = {
    nurse: 'N',
    doctor: 'D',
    admin: 'A',
  };

  const prefix = prefixMap[role] || 'S';
  const existingStaff = await Staff.find({
    staffId: { $regex: new RegExp(`^${prefix}`, 'i') },
  });

  let maxNum = 0;
  for (const s of existingStaff) {
    const numericPart = s.staffId.replace(new RegExp(`^${prefix}`, 'i'), '');
    const num = parseInt(numericPart, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }

  const nextNum = maxNum + 1;
  const zeroPadded = String(nextNum).padStart(3, '0');
  return `${prefix}${zeroPadded}`;
}

/**
 * @route   GET /api/staff
 * @desc    List all staff members with roles and active status
 * @access  Admin only
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const staffList = await Staff.find()
      .populate('createdBy', 'name staffId role')
      .sort({ createdAt: -1 });

    res.json(staffList);
  } catch (error: any) {
    res.status(500).json({
      error: 'Error fetching staff directory',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/staff
 * @desc    Admin adds new staff member (auto-generates staffId)
 * @access  Admin only
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, role } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Staff name is required' });
      return;
    }

    if (!role || !['nurse', 'doctor', 'admin'].includes(role.toLowerCase())) {
      res.status(400).json({
        error: "Invalid staff role. Allowed: 'nurse', 'doctor', 'admin'",
      });
      return;
    }

    const staffRole = role.toLowerCase() as StaffRole;
    const staffId = await generateNextStaffId(staffRole);

    const newStaff = await Staff.create({
      name: name.trim(),
      role: staffRole,
      staffId,
      active: true,
      createdBy: req.staff!._id,
    });

    const populatedStaff = await Staff.findById(newStaff._id).populate(
      'createdBy',
      'name staffId role'
    );

    res.status(201).json({
      message: `Staff member created successfully. Staff ID: ${staffId}`,
      staffId,
      staff: populatedStaff,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Error creating staff member',
      details: error.message,
    });
  }
});

/**
 * @route   PATCH /api/staff/:id
 * @desc    Update staff details or active/deactivated status
 * @access  Admin only
 */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, role, active } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid staff ID format' });
      return;
    }

    const staffMember = await Staff.findById(id);
    if (!staffMember) {
      res.status(404).json({ error: 'Staff member not found' });
      return;
    }

    // Prevent admin from deactivating their own active account
    if (
      active === false &&
      req.staff!._id.toString() === staffMember._id.toString()
    ) {
      res.status(400).json({
        error: 'You cannot deactivate your own current administrator account',
      });
      return;
    }

    if (name && typeof name === 'string') {
      staffMember.name = name.trim();
    }

    if (role && ['nurse', 'doctor', 'admin'].includes(role.toLowerCase())) {
      staffMember.role = role.toLowerCase() as StaffRole;
    }

    if (typeof active === 'boolean') {
      staffMember.active = active;
    }

    await staffMember.save();

    const updated = await Staff.findById(staffMember._id).populate(
      'createdBy',
      'name staffId role'
    );

    res.json({
      message: `Staff member ${updated!.staffId} updated successfully`,
      staff: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Error updating staff member',
      details: error.message,
    });
  }
});

export default router;
