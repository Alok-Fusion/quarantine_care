import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Notification } from '../models/Notification';
import { authenticateStaff } from '../middleware/auth';

const router = Router();

// All notification routes require authenticated staff and are scoped to req.staff
router.use(authenticateStaff);

/**
 * @route   GET /api/notifications
 * @desc    Get notifications for logged-in staff (unread first, then chronological)
 * @access  Staff
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const staffId = req.staff!._id;

    const [unreadCount, notifications] = await Promise.all([
      Notification.countDocuments({
        recipientStaffId: staffId,
        read: false,
      }),
      Notification.find({ recipientStaffId: staffId })
        .populate('relatedPatientId', 'name bedNumber status')
        .sort({ read: 1, createdAt: -1 })
        .limit(50),
    ]);

    res.json({
      unreadCount,
      notifications,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Error fetching notifications',
      details: error.message,
    });
  }
});

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all unread notifications as read for logged-in staff
 * @access  Staff
 */
router.patch('/read-all', async (req: Request, res: Response): Promise<void> => {
  try {
    const staffId = req.staff!._id;

    const result = await Notification.updateMany(
      { recipientStaffId: staffId, read: false },
      { $set: { read: true } }
    );

    res.json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Error updating notifications',
      details: error.message,
    });
  }
});

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a single notification as read
 * @access  Staff
 */
router.patch('/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid notification ID' });
      return;
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientStaffId: req.staff!._id },
      { $set: { read: true } },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json(notification);
  } catch (error: any) {
    res.status(500).json({
      error: 'Error marking notification as read',
      details: error.message,
    });
  }
});

export default router;
