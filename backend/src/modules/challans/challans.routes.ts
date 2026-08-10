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

// Confirm draft challan (Support PATCH, PUT, and POST to avoid frontend method mismatch)
router.patch(
  '/:id/confirm',
  roleGuard(UserRole.ADMIN, UserRole.SALES),
  controller.confirm
);
router.put(
  '/:id/confirm',
  roleGuard(UserRole.ADMIN, UserRole.SALES),
  controller.confirm
);
router.post(
  '/:id/confirm',
  roleGuard(UserRole.ADMIN, UserRole.SALES),
  controller.confirm
);

// Cancel challan (Support PATCH, PUT, and POST to avoid frontend method mismatch)
router.patch(
  '/:id/cancel',
  roleGuard(UserRole.ADMIN),
  controller.cancel
);
router.put(
  '/:id/cancel',
  roleGuard(UserRole.ADMIN),
  controller.cancel
);
router.post(
  '/:id/cancel',
  roleGuard(UserRole.ADMIN),
  controller.cancel
);

export default router;
