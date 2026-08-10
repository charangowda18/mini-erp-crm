import { z } from 'zod';

const challanItemSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

export const createChallanSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  items: z.array(challanItemSchema).min(1, 'At least one product is required'),
  status: z.enum(['Draft', 'Confirmed']).default('Draft'),
});

export type CreateChallanInput = z.infer<typeof createChallanSchema>;
export type ChallanItemInput = z.infer<typeof challanItemSchema>;
