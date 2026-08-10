import { query } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { CreateCustomerInput, UpdateCustomerInput, AddFollowUpInput } from './customers.schema';
import { PaginatedResponse } from '../../types';

export class CustomersService {
  async getAll(page: number = 1, limit: number = 10, search?: string): Promise<PaginatedResponse<any>> {
    const offset = (page - 1) * limit;
    let whereClause = '';
    const params: any[] = [];

    if (search) {
      whereClause = `WHERE c.name ILIKE $1 OR c.mobile ILIKE $1 OR c.email ILIKE $1 OR c.business_name ILIKE $1`;
      params.push(`%${search}%`);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM customers c ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const dataParams = search ? [`%${search}%`, limit, offset] : [limit, offset];
    const result = await query(
      `SELECT c.*, u.name as created_by_name
       FROM customers c
       LEFT JOIN users u ON c.created_by = u.id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${search ? 2 : 1} OFFSET $${search ? 3 : 2}`,
      dataParams
    );

    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string) {
    const result = await query(
      `SELECT c.*, u.name as created_by_name
       FROM customers c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Customer not found.', 404);
    }

    // Get latest follow-ups
    const followUps = await query(
      `SELECT cf.*, u.name as created_by_name
       FROM customer_follow_ups cf
       LEFT JOIN users u ON cf.created_by = u.id
       WHERE cf.customer_id = $1
       ORDER BY cf.created_at DESC
       LIMIT 5`,
      [id]
    );

    return {
      ...result.rows[0],
      recent_follow_ups: followUps.rows,
    };
  }

  async create(data: CreateCustomerInput, createdBy: string) {
    const result = await query(
      `INSERT INTO customers (name, mobile, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.name, data.mobile, data.email, data.business_name,
        data.gst_number || null, data.customer_type, data.address,
        data.status, data.follow_up_date || null, data.notes || null, createdBy,
      ]
    );

    return result.rows[0];
  }

  async update(id: string, data: UpdateCustomerInput) {
    // Check if customer exists
    const existing = await query('SELECT id FROM customers WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      throw new AppError('Customer not found.', 404);
    }

    // Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      name: 'name', mobile: 'mobile', email: 'email',
      business_name: 'business_name', gst_number: 'gst_number',
      customer_type: 'customer_type', address: 'address',
      status: 'status', follow_up_date: 'follow_up_date', notes: 'notes',
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if (data[key as keyof UpdateCustomerInput] !== undefined) {
        fields.push(`${column} = $${paramIndex}`);
        values.push(data[key as keyof UpdateCustomerInput]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new AppError('No fields to update.', 400);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE customers SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  async getFollowUps(customerId: string, page: number = 1, limit: number = 10): Promise<PaginatedResponse<any>> {
    // Check if customer exists
    const existing = await query('SELECT id FROM customers WHERE id = $1', [customerId]);
    if (existing.rows.length === 0) {
      throw new AppError('Customer not found.', 404);
    }

    const offset = (page - 1) * limit;

    const countResult = await query(
      'SELECT COUNT(*) FROM customer_follow_ups WHERE customer_id = $1',
      [customerId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT cf.*, u.name as created_by_name
       FROM customer_follow_ups cf
       LEFT JOIN users u ON cf.created_by = u.id
       WHERE cf.customer_id = $1
       ORDER BY cf.created_at DESC
       LIMIT $2 OFFSET $3`,
      [customerId, limit, offset]
    );

    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async addFollowUp(customerId: string, data: AddFollowUpInput, createdBy: string) {
    // Check if customer exists
    const existing = await query('SELECT id FROM customers WHERE id = $1', [customerId]);
    if (existing.rows.length === 0) {
      throw new AppError('Customer not found.', 404);
    }

    const result = await query(
      `INSERT INTO customer_follow_ups (customer_id, notes, next_follow_up_date, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [customerId, data.notes, data.next_follow_up_date || null, createdBy]
    );

    // Update follow_up_date on customer if next_follow_up_date is provided
    if (data.next_follow_up_date) {
      await query(
        'UPDATE customers SET follow_up_date = $1, updated_at = NOW() WHERE id = $2',
        [data.next_follow_up_date, customerId]
      );
    }

    return result.rows[0];
  }
}
