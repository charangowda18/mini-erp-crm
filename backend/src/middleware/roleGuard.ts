import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types';

export const roleGuard = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Access denied. Insufficient permissions.',
        requiredRoles: allowedRoles,
        yourRole: req.user.role,
      });
      return;
    }

    next();
  };
};
