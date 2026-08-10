import { Router } from 'express';
import { CustomersController } from './customers.controller';
import { authenticate } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import { createCustomerSchema, updateCustomerSchema, addFollowUpSchema } from './customers.schema';
import { UserRole } from '../../types';

const router = Router();
const controller = new CustomersController();

// All routes require authentication
router.use(authenticate);

// GET /api/customers - List all customers (all roles)
router.get('/', controller.getAll);

// GET /api/customers/:id - Get customer detail (all roles)
router.get('/:id', controller.getById);

// POST /api/customers - Create customer (Admin, Sales)
router.post(
  '/',
  roleGuard(UserRole.ADMIN, UserRole.SALES),
  validate(createCustomerSchema),
  controller.create
);

// PUT /api/customers/:id - Update customer (Admin, Sales)
router.put(
  '/:id',
  roleGuard(UserRole.ADMIN, UserRole.SALES),
  validate(updateCustomerSchema),
  controller.update
);

// GET /api/customers/:id/follow-ups - Get follow-up history (all roles)
router.get('/:id/follow-ups', controller.getFollowUps);

// POST /api/customers/:id/follow-ups - Add follow-up note (Admin, Sales)
router.post(
  '/:id/follow-ups',
  roleGuard(UserRole.ADMIN, UserRole.SALES),
  validate(addFollowUpSchema),
  controller.addFollowUp
);

export default router;
