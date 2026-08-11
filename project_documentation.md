# Technical Project Documentation: Mini ERP + CRM

This document contains the core technical design specs, architecture details, database models, and API endpoints for the Mini ERP & CRM Operations Portal.

---

## 🏛️ System Architecture

```
                       ┌─────────────────────────┐
                       │  Vite React Client UI   │
                       └────────────┬────────────┘
                                    │
                         HTTPS JWT REST Requests
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │  Express API Server     │
                       │  (TypeScript Node.js)   │
                       └────────────┬────────────┘
                                    │
                           Auth / Role Middleware
                           Zod Schema Validation
                           ACID DB Transactions
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │   PostgreSQL Database   │
                       └─────────────────────────┘
```

The system uses a clean, decoupled design split into two modules:
*   **Express API Server (`/backend`):** A stateless REST API configured with a clean router layer, controller layer, validation middlewares, and repository queries.
*   **Vite React Application (`/frontend`):** A single-page client built with responsive dashboard layouts, role gating, form validations, and custom browser-native invoice exporting layouts.

---

## 🗄️ Database Design

The schema runs on PostgreSQL and consists of 6 tables. It features constraints and indexes to enforce data integrity:

```
                  ┌─────────────────┐
                  │      users      │
                  └────────┬────────┘
                           │ 1:N
         ┌─────────────────┼─────────────────┐
         │ 1:N             │ 1:N             │ 1:N
  ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
  │  customers  │   │  products   │   │  challans   │
  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
         │ 1:N             │ 1:N             │ 1:N
  ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
  │ follow_ups  │   │stock_movem. │   │challan_items│
  └─────────────┘   └─────────────┘   └─────────────┘
```

### Table Definitions & Constraints

1.  **`users`:** Stores system users. Role values: `Admin`, `Sales`, `Warehouse`, `Accounts`.
2.  **`customers`:** Manages CRM profiles. Customer types: `Retail`, `Wholesale`, `Distributor`. Status values: `Lead`, `Active`, `Inactive`.
3.  **`follow_ups`:** Tracks CRM log history. Linked to `customers` (foreign key cascades).
4.  **`products`:** Tracks catalog details. Includes unique SKU checks, unit prices, and alert minimum thresholds.
5.  **`stock_movements`:** Logs manual adjustments and challan confirmations. Linked to `products`. Movement types: `IN`, `OUT`.
6.  **`challans`:** Sales orders ledger. Status values: `Draft`, `Confirmed`, `Cancelled`.
7.  **`challan_items`:** Line items per order. **Saves snapshot data** (`product_name_snapshot`, `product_sku_snapshot`, `product_price_snapshot`) to ensure historical records remain unchanged even if the products catalog is updated later.

---

## ⚡ Core Business Logic & ACID Transactions

### 1. Sales Challan Stock Dispatch Flow
When a Challan is saved as **Confirmed**, the system must safely deduct inventory:
*   **Step 1:** The backend opens a SQL transaction (`BEGIN`).
*   **Step 2:** It performs a row-level write lock using `SELECT ... FOR UPDATE` on all products specified in the challan.
*   **Step 3:** The backend compares the requested quantity against the locked `current_stock`.
*   **Step 4:** If *any* product has insufficient stock, the transaction instantly rolls back (`ROLLBACK`) and returns a `400 Bad Request` payload, preventing stock quantities from going negative.
*   **Step 5:** If inventory is sufficient, the stock is deducted, stock movement records are written, product specs are snapshot, and the changes are committed (`COMMIT`).

---

## 🔌 API Endpoints Reference

### 🔐 Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | Log in user, returns JWT token | No |
| GET | `/api/auth/me` | Retrieve profile of authenticated user | Yes |

### 👥 Customer CRM

| Method | Endpoint | Description | Allowed Roles |
|--------|----------|-------------|---------------|
| GET | `/api/customers` | Query paginated list of customers (`?search=`) | All Roles |
| GET | `/api/customers/:id` | View detailed profile and follow-up timeline | All Roles |
| POST | `/api/customers` | Add a new lead/customer | Admin, Sales |
| PUT | `/api/customers/:id` | Update customer CRM fields | Admin, Sales |
| POST | `/api/customers/:id/follow-ups` | Log a new CRM timeline follow-up note | Admin, Sales |

### 📦 Products & Inventory

| Method | Endpoint | Description | Allowed Roles |
|--------|----------|-------------|---------------|
| GET | `/api/products` | Query paginated products list (`?search=`, `?category=`) | All Roles |
| GET | `/api/products/low-stock` | Retrieve products below their alert threshold | All Roles |
| GET | `/api/products/:id` | View product specs and stock ledger history | All Roles |
| POST | `/api/products` | Create a new product entry | Admin, Warehouse |
| PUT | `/api/products/:id` | Edit product pricing and specifications | Admin, Warehouse |
| POST | `/api/products/:id/stock-movements` | Log manual stock adjustment (IN/OUT) | Admin, Warehouse |

### 📄 Sales Challans

| Method | Endpoint | Description | Allowed Roles |
|--------|----------|-------------|---------------|
| GET | `/api/challans` | List all order documents | All Roles |
| GET | `/api/challans/:id` | View challan item details and snapshots | All Roles |
| POST | `/api/challans` | Create a new challan as Draft or Confirmed | Admin, Sales |
| PATCH | `/api/challans/:id/confirm` | Confirm draft challan (deducts stock) | Admin, Sales |
| PATCH | `/api/challans/:id/cancel` | Cancel an active challan | Admin |

---

## 🛠️ Assumptions & Limitations

### Business Assumptions
1.  **Challan Cancellations:** Cancelling a confirmed challan marks its status as `Cancelled` but does not automatically return the stock to inventory. Stock returns must be manually logged as an `IN` stock movement by the warehouse team.
2.  **Stateless Session:** Session management is completely client-side using stateless JWT. Access keys expire in 24 hours.
3.  **Unique Fields:** Emails are unique to users; SKUs are unique to products.

### Limitations
1.  **Self-Registration:** There is no registration endpoint; users must be provisioned via database seed files or direct administrator inserts.
2.  **File Uploads:** Product images use text-based URL paths instead of file storage uploads.
