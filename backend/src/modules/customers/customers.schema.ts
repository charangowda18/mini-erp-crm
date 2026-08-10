import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(255),
  mobile: z.string().min(10, 'Mobile number must be at least 10 digits').max(20),
  email: z.string().email('Invalid email address'),
  business_name: z.string().min(1, 'Business name is required').max(255),
  gst_number: z.string().max(20).optional().nullable(),
  customer_type: z.enum(['Retail', 'Wholesale', 'Distributor'], {
    errorMap: () => ({ message: 'Customer type must be Retail, Wholesale, or Distributor' }),
  }),
  address: z.string().min(1, 'Address is required'),
  status: z.enum(['Lead', 'Active', 'Inactive']).default('Lead'),
  follow_up_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const addFollowUpSchema = z.object({
  notes: z.string().min(1, 'Follow-up notes are required'),
  next_follow_up_date: z.string().optional().nullable(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type AddFollowUpInput = z.infer<typeof addFollowUpSchema>;
