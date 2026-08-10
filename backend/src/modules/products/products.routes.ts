import { Router } from 'express';
import { ProductsController } from './products.controller';
import { authenticate } from '../../middleware/auth';
import { roleGuard } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import { createProductSchema, updateProductSchema, stockMovementSchema } from './products.schema';
import { UserRole } from '../../types';

const router = Router();
const controller = new ProductsController();

// All routes require authentication
router.use(authenticate);

// GET /api/products/low-stock - Get low stock products (all roles) — must be before /:id
router.get('/low-stock', controller.getLowStock);

// GET /api/products - List all products (all roles)
router.get('/', controller.getAll);

// GET /api/products/:id - Get product detail (all roles)
router.get('/:id', controller.getById);

// POST /api/products - Create product (Admin, Warehouse)
router.post(
  '/',
  roleGuard(UserRole.ADMIN, UserRole.WAREHOUSE),
  validate(createProductSchema),
  controller.create
);

// PUT /api/products/:id - Update product (Admin, Warehouse)
router.put(
  '/:id',
  roleGuard(UserRole.ADMIN, UserRole.WAREHOUSE),
  validate(updateProductSchema),
  controller.update
);

// POST /api/products/:id/stock-movements - Record stock movement (Admin, Warehouse)
router.post(
  '/:id/stock-movements',
  roleGuard(UserRole.ADMIN, UserRole.WAREHOUSE),
  validate(stockMovementSchema),
  controller.addStockMovement
);

// GET /api/products/:id/stock-movements - Get movement history (all roles)
router.get('/:id/stock-movements', controller.getStockMovements);

export default router;
