import { Request, Response, NextFunction } from 'express';
import { Staff, IStaff, StaffRole } from '../models/Staff';

// Extend Express Request type to include authenticated staff
declare global {
  namespace Express {
    interface Request {
      staff?: IStaff;
    }
  }
}

/**
 * Authentication middleware:
 * Validates 'x-staff-id' header against the database and attaches staff document to req.staff.
 * Returns 401 Unauthorized if missing or invalid.
 */
export async function authenticateStaff(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawStaffId = req.headers['x-staff-id'];

    if (!rawStaffId || typeof rawStaffId !== 'string') {
      res.status(401).json({
        error: 'Unauthorized: Missing or invalid x-staff-id header',
      });
      return;
    }

    const staffId = rawStaffId.trim().toUpperCase();
    const staff = await Staff.findOne({ staffId });

    if (!staff) {
      res.status(401).json({
        error: `Unauthorized: Staff with ID '${staffId}' not found`,
      });
      return;
    }

    req.staff = staff;
    next();
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal server error during authentication',
      details: error.message,
    });
  }
}

/**
 * Role-based authorization middleware:
 * Checks if authenticated staff has one of the allowed roles.
 * Returns 403 Forbidden with "Action not permitted for role: [role]" if role doesn't match.
 */
export function requireRole(...allowedRoles: StaffRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.staff) {
      res.status(401).json({
        error: 'Unauthorized: Authentication required before role check',
      });
      return;
    }

    if (!allowedRoles.includes(req.staff.role)) {
      res.status(403).json({
        error: `Action not permitted for role: ${req.staff.role}`,
      });
      return;
    }

    next();
  };
}
