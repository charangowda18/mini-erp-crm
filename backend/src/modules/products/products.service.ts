import { query, getClient } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { CreateProductInput, UpdateProductInput, StockMovementInput } from './products.schema';
import { PaginatedResponse } from '../../types';

export class ProductsService {
  async getAll(page: number = 1, limit: number = 10, search?: string, category?: string): Promise<PaginatedResponse<any>> {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      conditions.push(`p.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM products p ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, limit, offset];
    const result = await query(
      `SELECT p.*, u.name as created_by_name
       FROM products p
       LEFT JOIN users u ON p.created_by = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
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
      `SELECT p.*, u.name as created_by_name
       FROM products p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Product not found.', 404);
    }

    // Get recent stock movements
    const movements = await query(
      `SELECT sm.*, u.name as created_by_name
       FROM stock_movements sm
       LEFT JOIN users u ON sm.created_by = u.id
       WHERE sm.product_id = $1
       ORDER BY sm.created_at DESC
       LIMIT 10`,
      [id]
    );

    return {
      ...result.rows[0],
      recent_stock_movements: movements.rows,
    };
  }

  async create(data: CreateProductInput, createdBy: string) {
    // Check for duplicate SKU
    const existing = await query('SELECT id FROM products WHERE sku = $1', [data.sku]);
    if (existing.rows.length > 0) {
      throw new AppError('A product with this SKU already exists.', 409);
    }

    const result = await query(
      `INSERT INTO products (name, sku, category, unit_price, current_stock, min_stock_alert, location_warehouse, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.name, data.sku, data.category, data.unit_price,
        data.current_stock, data.min_stock_alert, data.location_warehouse, createdBy,
      ]
    );

    // If initial stock > 0, create a stock movement
    if (data.current_stock > 0) {
      await query(
        `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by)
         VALUES ($1, $2, 'IN', 'Initial stock entry', $3)`,
        [result.rows[0].id, data.current_stock, createdBy]
      );
    }

    return result.rows[0];
  }

  async update(id: string, data: UpdateProductInput) {
    const existing = await query('SELECT id FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      throw new AppError('Product not found.', 404);
    }

    // Check SKU uniqueness if updating SKU
    if (data.sku) {
      const skuCheck = await query('SELECT id FROM products WHERE sku = $1 AND id != $2', [data.sku, id]);
      if (skuCheck.rows.length > 0) {
        throw new AppError('A product with this SKU already exists.', 409);
      }
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      name: 'name', sku: 'sku', category: 'category',
      unit_price: 'unit_price', min_stock_alert: 'min_stock_alert',
      location_warehouse: 'location_warehouse',
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if (data[key as keyof UpdateProductInput] !== undefined) {
        fields.push(`${column} = $${paramIndex}`);
        values.push(data[key as keyof UpdateProductInput]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new AppError('No fields to update.', 400);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  async getLowStock(): Promise<any[]> {
    const result = await query(
      `SELECT p.*, u.name as created_by_name
       FROM products p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.current_stock <= p.min_stock_alert
       ORDER BY (p.current_stock::float / NULLIF(p.min_stock_alert, 0)) ASC, p.name ASC`
    );

    return result.rows;
  }

  async addStockMovement(productId: string, data: StockMovementInput, createdBy: string) {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Get current stock with row lock
      const productResult = await client.query(
        'SELECT id, name, current_stock FROM products WHERE id = $1 FOR UPDATE',
        [productId]
      );

      if (productResult.rows.length === 0) {
        throw new AppError('Product not found.', 404);
      }

      const product = productResult.rows[0];
      let newStock: number;

      if (data.movement_type === 'IN') {
        newStock = product.current_stock + data.quantity_changed;
      } else {
        newStock = product.current_stock - data.quantity_changed;
        if (newStock < 0) {
          throw new AppError(
            `Insufficient stock. Current stock: ${product.current_stock}, requested: ${data.quantity_changed}`,
            400
          );
        }
      }

      // Update product stock
      await client.query(
        'UPDATE products SET current_stock = $1, updated_at = NOW() WHERE id = $2',
        [newStock, productId]
      );

      // Insert stock movement
      const movementResult = await client.query(
        `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [productId, data.quantity_changed, data.movement_type, data.reason, createdBy]
      );

      await client.query('COMMIT');

      return {
        movement: movementResult.rows[0],
        new_stock: newStock,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getStockMovements(productId: string, page: number = 1, limit: number = 10): Promise<PaginatedResponse<any>> {
    const existing = await query('SELECT id FROM products WHERE id = $1', [productId]);
    if (existing.rows.length === 0) {
      throw new AppError('Product not found.', 404);
    }

    const offset = (page - 1) * limit;

    const countResult = await query(
      'SELECT COUNT(*) FROM stock_movements WHERE product_id = $1',
      [productId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT sm.*, u.name as created_by_name
       FROM stock_movements sm
       LEFT JOIN users u ON sm.created_by = u.id
       WHERE sm.product_id = $1
       ORDER BY sm.created_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, limit, offset]
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
}
