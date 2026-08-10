import { Router } from 'express';
import { ChallansController } from './challans.controller';
import { authenticate } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import { createChallanSchema } from './challans.schema';
import { UserRole } from '../../types';

const router = Router();
const controller = new ChallansController();

// All routes require authentication
router.use(authenticate);

// GET /api/challans - List all challans (all roles)
router.get('/', controller.getAll);

// GET /api/challans/:id - Get challan detail (all roles)
router.get('/:id', controller.getById);

// POST /api/challans - Create challan (Admin, Sales)
router.post(
  '/',
  roleGuard(UserRole.ADMIN, UserRole.SALES),
  validate(createChallanSchema),
  controller.create
);

// PATCH /api/challans/:id/confirm - Confirm draft challan (Admin, Sales)
router.patch(
  '/:id/confirm',
  roleGuard(UserRole.ADMIN, UserRole.SALES),
  controller.confirm
);

// PATCH /api/challans/:id/cancel - Cancel challan (Admin)
router.patch(
  '/:id/cancel',
  roleGuard(UserRole.ADMIN),
  controller.cancel
);

export default router;
