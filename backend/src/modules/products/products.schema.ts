import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  sku: z.string().min(1, 'SKU is required').max(100),
  category: z.string().min(1, 'Category is required').max(100),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  current_stock: z.number().int().min(0, 'Stock must be non-negative').default(0),
  min_stock_alert: z.number().int().min(0, 'Min stock alert must be non-negative').default(0),
  location_warehouse: z.string().min(1, 'Warehouse location is required').max(255),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  sku: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(100).optional(),
  unit_price: z.number().min(0).optional(),
  min_stock_alert: z.number().int().min(0).optional(),
  location_warehouse: z.string().min(1).max(255).optional(),
});

export const stockMovementSchema = z.object({
  quantity_changed: z.number().int().min(1, 'Quantity must be at least 1'),
  movement_type: z.enum(['IN', 'OUT'], {
    errorMap: () => ({ message: 'Movement type must be IN or OUT' }),
  }),
  reason: z.string().min(1, 'Reason is required').max(255),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type StockMovementInput = z.infer<typeof stockMovementSchema>;
