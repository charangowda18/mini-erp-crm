import { query, getClient } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { CreateChallanInput } from './challans.schema';
import { PaginatedResponse } from '../../types';

export class ChallansService {
  private async generateChallanNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `CH-${dateStr}-`;

    const result = await query(
      `SELECT challan_number FROM sales_challans
       WHERE challan_number LIKE $1
       ORDER BY challan_number DESC
       LIMIT 1`,
      [`${prefix}%`]
    );

    let sequence = 1;
    if (result.rows.length > 0) {
      const lastNumber = result.rows[0].challan_number;
      const lastSequence = parseInt(lastNumber.split('-').pop() || '0');
      sequence = lastSequence + 1;
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }

  async getAll(page: number = 1, limit: number = 10, status?: string): Promise<PaginatedResponse<any>> {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`sc.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM sales_challans sc ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, limit, offset];
    const result = await query(
      `SELECT sc.*, c.name as customer_name, c.business_name as customer_business, u.name as created_by_name
       FROM sales_challans sc
       LEFT JOIN customers c ON sc.customer_id = c.id
       LEFT JOIN users u ON sc.created_by = u.id
       ${whereClause}
       ORDER BY sc.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
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
      `SELECT sc.*, c.name as customer_name, c.business_name as customer_business,
              c.mobile as customer_mobile, c.email as customer_email, c.address as customer_address,
              u.name as created_by_name
       FROM sales_challans sc
       LEFT JOIN customers c ON sc.customer_id = c.id
       LEFT JOIN users u ON sc.created_by = u.id
       WHERE sc.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Challan not found.', 404);
    }

    const items = await query(
      `SELECT ci.*, p.current_stock as product_current_stock
       FROM challan_items ci
       LEFT JOIN products p ON ci.product_id = p.id
       WHERE ci.challan_id = $1
       ORDER BY ci.created_at ASC`,
      [id]
    );

    return {
      ...result.rows[0],
      items: items.rows,
    };
  }

  async create(data: CreateChallanInput, createdBy: string) {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Verify customer exists
      const customerResult = await client.query(
        'SELECT id, name FROM customers WHERE id = $1',
        [data.customer_id]
      );
      if (customerResult.rows.length === 0) {
        throw new AppError('Customer not found.', 404);
      }

      // Get product details and validate stock
      const productIds = data.items.map(item => item.product_id);
      const productsResult = await client.query(
        `SELECT id, name, sku, unit_price, current_stock FROM products WHERE id = ANY($1) FOR UPDATE`,
        [productIds]
      );

      const productMap = new Map(productsResult.rows.map(p => [p.id, p]));

      // Validate all products exist
      for (const item of data.items) {
        if (!productMap.has(item.product_id)) {
          throw new AppError(`Product with ID ${item.product_id} not found.`, 404);
        }
      }

      // Check stock availability if confirming
      if (data.status === 'Confirmed') {
        const insufficientStock: string[] = [];
        for (const item of data.items) {
          const product = productMap.get(item.product_id)!;
          if (product.current_stock < item.quantity) {
            insufficientStock.push(
              `${product.name} (SKU: ${product.sku}): available ${product.current_stock}, requested ${item.quantity}`
            );
          }
        }
        if (insufficientStock.length > 0) {
          throw new AppError(
            `Insufficient stock for: ${insufficientStock.join('; ')}`,
            400
          );
        }
      }

      // Generate challan number
      const challanNumber = await this.generateChallanNumber();

      // Calculate totals
      let totalQuantity = 0;
      let totalAmount = 0;
      const itemsWithSnapshots = data.items.map(item => {
        const product = productMap.get(item.product_id)!;
        const lineTotal = parseFloat(product.unit_price) * item.quantity;
        totalQuantity += item.quantity;
        totalAmount += lineTotal;
        return {
          ...item,
          product_name_snapshot: product.name,
          product_sku_snapshot: product.sku,
          product_price_snapshot: product.unit_price,
          line_total: lineTotal,
        };
      });

      // Insert challan
      const challanResult = await client.query(
        `INSERT INTO sales_challans (challan_number, customer_id, total_quantity, total_amount, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [challanNumber, data.customer_id, totalQuantity, totalAmount, data.status, createdBy]
      );

      const challanId = challanResult.rows[0].id;

      // Insert challan items
      for (const item of itemsWithSnapshots) {
        await client.query(
          `INSERT INTO challan_items (challan_id, product_id, product_name_snapshot, product_sku_snapshot, product_price_snapshot, quantity, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [challanId, item.product_id, item.product_name_snapshot, item.product_sku_snapshot, item.product_price_snapshot, item.quantity, item.line_total]
        );
      }

      // If confirmed, reduce stock
      if (data.status === 'Confirmed') {
        for (const item of data.items) {
          await client.query(
            'UPDATE products SET current_stock = current_stock - $1, updated_at = NOW() WHERE id = $2',
            [item.quantity, item.product_id]
          );

          await client.query(
            `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by)
             VALUES ($1, $2, 'OUT', $3, $4)`,
            [item.product_id, item.quantity, `Sales Challan ${challanNumber}`, createdBy]
          );
        }
      }

      await client.query('COMMIT');

      // Return the full challan
      return this.getById(challanId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async confirm(id: string, confirmedBy: string) {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Get challan with lock
      const challanResult = await client.query(
        'SELECT * FROM sales_challans WHERE id = $1 FOR UPDATE',
        [id]
      );

      if (challanResult.rows.length === 0) {
        throw new AppError('Challan not found.', 404);
      }

      const challan = challanResult.rows[0];

      if (challan.status !== 'Draft') {
        throw new AppError(`Cannot confirm challan with status: ${challan.status}. Only Draft challans can be confirmed.`, 400);
      }

      // Get challan items
      const itemsResult = await client.query(
        'SELECT * FROM challan_items WHERE challan_id = $1',
        [id]
      );

      // Lock products and check stock
      const insufficientStock: string[] = [];
      for (const item of itemsResult.rows) {
        const productResult = await client.query(
          'SELECT id, name, sku, current_stock FROM products WHERE id = $1 FOR UPDATE',
          [item.product_id]
        );
        const product = productResult.rows[0];
        if (product.current_stock < item.quantity) {
          insufficientStock.push(
            `${product.name} (SKU: ${product.sku}): available ${product.current_stock}, requested ${item.quantity}`
          );
        }
      }

      if (insufficientStock.length > 0) {
        throw new AppError(
          `Insufficient stock for: ${insufficientStock.join('; ')}`,
          400
        );
      }

      // Reduce stock and create movements
      for (const item of itemsResult.rows) {
        await client.query(
          'UPDATE products SET current_stock = current_stock - $1, updated_at = NOW() WHERE id = $2',
          [item.quantity, item.product_id]
        );

        await client.query(
          `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by)
           VALUES ($1, $2, 'OUT', $3, $4)`,
          [item.product_id, item.quantity, `Sales Challan ${challan.challan_number}`, confirmedBy]
        );
      }

      // Update challan status
      await client.query(
        `UPDATE sales_challans SET status = 'Confirmed', updated_at = NOW() WHERE id = $1`,
        [id]
      );

      await client.query('COMMIT');

      return this.getById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async cancel(id: string) {
    const result = await query(
      'SELECT * FROM sales_challans WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Challan not found.', 404);
    }

    const challan = result.rows[0];

    if (challan.status === 'Cancelled') {
      throw new AppError('Challan is already cancelled.', 400);
    }

    await query(
      `UPDATE sales_challans SET status = 'Cancelled', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    return this.getById(id);
  }
}
