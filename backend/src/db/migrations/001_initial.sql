-- Mini ERP + CRM Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Sales', 'Warehouse', 'Accounts')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  gst_number VARCHAR(20),
  customer_type VARCHAR(20) NOT NULL CHECK (customer_type IN ('Retail', 'Wholesale', 'Distributor')),
  address TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Lead' CHECK (status IN ('Lead', 'Active', 'Inactive')),
  follow_up_date DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_mobile ON customers(mobile);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_business_name ON customers(business_name);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_customer_type ON customers(customer_type);

-- ============================================
-- CUSTOMER FOLLOW-UPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customer_follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  notes TEXT NOT NULL,
  next_follow_up_date DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_follow_ups_customer_id ON customer_follow_ups(customer_id);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  min_stock_alert INTEGER NOT NULL DEFAULT 0 CHECK (min_stock_alert >= 0),
  location_warehouse VARCHAR(255) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_name ON products(name);

-- ============================================
-- STOCK MOVEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_changed INTEGER NOT NULL,
  movement_type VARCHAR(5) NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
  reason VARCHAR(255) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);

-- ============================================
-- SALES CHALLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sales_challans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challan_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  total_quantity INTEGER NOT NULL DEFAULT 0,
  total_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Confirmed', 'Cancelled')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_challans_number ON sales_challans(challan_number);
CREATE INDEX idx_challans_customer_id ON sales_challans(customer_id);
CREATE INDEX idx_challans_status ON sales_challans(status);

-- ============================================
-- CHALLAN ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS challan_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challan_id UUID NOT NULL REFERENCES sales_challans(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name_snapshot VARCHAR(255) NOT NULL,
  product_sku_snapshot VARCHAR(100) NOT NULL,
  product_price_snapshot DECIMAL(12, 2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total DECIMAL(14, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_challan_items_challan_id ON challan_items(challan_id);
CREATE INDEX idx_challan_items_product_id ON challan_items(product_id);
