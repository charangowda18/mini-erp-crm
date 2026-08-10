import bcrypt from 'bcryptjs';
import { pool } from '../config/database';

async function seed() {
  const client = await pool.connect();

  try {
    console.log('🔄 Seeding database...');

    // Clear existing data (in reverse dependency order)
    await client.query('DELETE FROM challan_items');
    await client.query('DELETE FROM sales_challans');
    await client.query('DELETE FROM stock_movements');
    await client.query('DELETE FROM customer_follow_ups');
    await client.query('DELETE FROM products');
    await client.query('DELETE FROM customers');
    await client.query('DELETE FROM users');

    // Hash password
    const passwordHash = await bcrypt.hash('password123', 10);

    // Seed users (one per role)
    const usersResult = await client.query(`
      INSERT INTO users (name, email, password_hash, role) VALUES
        ('Admin User', 'admin@erp.com', $1, 'Admin'),
        ('Sales User', 'sales@erp.com', $1, 'Sales'),
        ('Warehouse User', 'warehouse@erp.com', $1, 'Warehouse'),
        ('Accounts User', 'accounts@erp.com', $1, 'Accounts')
      RETURNING id, name, role
    `, [passwordHash]);

    console.log('✅ Users seeded:');
    usersResult.rows.forEach((u) => console.log(`   ${u.role}: ${u.name} (${u.role.toLowerCase()}@erp.com / password123)`));

    const adminId = usersResult.rows[0].id;
    const salesId = usersResult.rows[1].id;
    const warehouseId = usersResult.rows[2].id;

    // Seed customers
    const customersResult = await client.query(`
      INSERT INTO customers (name, mobile, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes, created_by) VALUES
        ('Rajesh Kumar', '9876543210', 'rajesh@wholesale.com', 'Kumar Wholesale Pvt Ltd', '29ABCDE1234F1Z5', 'Wholesale', '123 MG Road, Bangalore 560001', 'Active', '2026-08-15', 'Key wholesale client, monthly orders', $1),
        ('Priya Sharma', '9876543211', 'priya@retail.com', 'Sharma Retail Store', NULL, 'Retail', '456 Residency Road, Bangalore 560025', 'Active', NULL, 'Walk-in customer', $2),
        ('Amit Patel', '9876543212', 'amit@distribution.com', 'Patel Distribution Co', '24FGHIJ5678K2Z3', 'Distributor', '789 Industrial Area, Ahmedabad 380015', 'Lead', '2026-08-20', 'Interested in bulk orders', $2),
        ('Neha Gupta', '9876543213', 'neha@bizmart.com', 'BizMart Solutions', '07KLMNO9012P3Z1', 'Wholesale', '321 Sector 18, Noida 201301', 'Inactive', NULL, 'Previously active, follow up needed', $1),
        ('Suresh Reddy', '9876543214', 'suresh@megadist.com', 'Mega Distributors', '36PQRST3456U4Z9', 'Distributor', '654 Banjara Hills, Hyderabad 500034', 'Active', '2026-08-12', 'High volume distributor', $2)
      RETURNING id, name
    `, [adminId, salesId]);

    console.log('✅ Customers seeded:', customersResult.rows.length, 'records');

    const customerId1 = customersResult.rows[0].id;
    const customerId2 = customersResult.rows[1].id;

    // Seed follow-ups
    await client.query(`
      INSERT INTO customer_follow_ups (customer_id, notes, next_follow_up_date, created_by) VALUES
        ($1, 'Initial meeting done. Interested in monthly bulk orders.', '2026-08-10', $3),
        ($1, 'Sent product catalog. Waiting for response.', '2026-08-15', $4),
        ($2, 'Walk-in customer. Made first purchase.', NULL, $4)
    `, [customerId1, customerId2, adminId, salesId]);

    console.log('✅ Follow-ups seeded');

    // Seed products
    const productsResult = await client.query(`
      INSERT INTO products (name, sku, category, unit_price, current_stock, min_stock_alert, location_warehouse, created_by) VALUES
        ('Basmati Rice 5kg', 'RICE-BAS-5KG', 'Grains', 450.00, 200, 50, 'Warehouse A - Rack 1', $1),
        ('Toor Dal 1kg', 'DAL-TOOR-1KG', 'Pulses', 180.00, 150, 30, 'Warehouse A - Rack 2', $1),
        ('Sunflower Oil 5L', 'OIL-SUN-5L', 'Oils', 620.00, 80, 20, 'Warehouse B - Rack 1', $1),
        ('Sugar 1kg', 'SUG-WHT-1KG', 'Essentials', 45.00, 500, 100, 'Warehouse A - Rack 3', $1),
        ('Wheat Flour 10kg', 'FLR-WHT-10KG', 'Grains', 380.00, 120, 40, 'Warehouse A - Rack 1', $1),
        ('Mustard Oil 1L', 'OIL-MUS-1L', 'Oils', 210.00, 60, 15, 'Warehouse B - Rack 2', $1),
        ('Chana Dal 1kg', 'DAL-CHA-1KG', 'Pulses', 160.00, 90, 25, 'Warehouse A - Rack 2', $1),
        ('Salt 1kg', 'SALT-IOD-1KG', 'Essentials', 25.00, 300, 80, 'Warehouse A - Rack 4', $1)
      RETURNING id, name, current_stock
    `, [warehouseId]);

    console.log('✅ Products seeded:', productsResult.rows.length, 'records');

    const productId1 = productsResult.rows[0].id;
    const productId2 = productsResult.rows[1].id;

    // Seed stock movements
    await client.query(`
      INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by) VALUES
        ($1, 200, 'IN', 'Initial stock entry', $3),
        ($1, 20, 'OUT', 'Sales order fulfillment', $3),
        ($1, 20, 'IN', 'Restocked from supplier', $3),
        ($2, 150, 'IN', 'Initial stock entry', $3),
        ($2, 10, 'OUT', 'Sample distribution', $3)
    `, [productId1, productId2, warehouseId]);

    console.log('✅ Stock movements seeded');

    // Seed a sample challan
    const challanResult = await client.query(`
      INSERT INTO sales_challans (challan_number, customer_id, total_quantity, total_amount, status, created_by)
      VALUES ('CH-20260810-0001', $1, 15, 8850.00, 'Draft', $2)
      RETURNING id
    `, [customerId1, salesId]);

    const challanId = challanResult.rows[0].id;

    await client.query(`
      INSERT INTO challan_items (challan_id, product_id, product_name_snapshot, product_sku_snapshot, product_price_snapshot, quantity, line_total) VALUES
        ($1, $2, 'Basmati Rice 5kg', 'RICE-BAS-5KG', 450.00, 10, 4500.00),
        ($1, $3, 'Toor Dal 1kg', 'DAL-TOOR-1KG', 180.00, 5, 900.00)
    `, [challanId, productId1, productId2]);

    console.log('✅ Sample challan seeded');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Test Login Credentials:');
    console.log('   Admin:     admin@erp.com     / password123');
    console.log('   Sales:     sales@erp.com     / password123');
    console.log('   Warehouse: warehouse@erp.com / password123');
    console.log('   Accounts:  accounts@erp.com  / password123');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
