# Mini ERP + CRM Operations Portal

A full-stack ERP/CRM system for a wholesale/distribution company. Built with **Node.js**, **TypeScript**, **Express.js**, and **PostgreSQL**.

## 🚀 Live Links & Credentials

* **Live Frontend UI:** [https://synergiz-hub.lovable.app](https://synergiz-hub.lovable.app)
* **Live Backend API:** [https://mini-erp-crm-api-t9uv.onrender.com](https://mini-erp-crm-api-t9uv.onrender.com)
* **API Health Check:** [https://mini-erp-crm-api-t9uv.onrender.com/api/health](https://mini-erp-crm-api-t9uv.onrender.com/api/health)
* **Postman Collection:** Located in the repository at `/backend/postman/Mini_ERP_CRM.postman_collection.json`

### Test Credentials

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| **Admin** | `admin@erp.com` | `password123` | Full access (View, CRUD, Confirm, Cancel) |
| **Sales** | `sales@erp.com` | `password123` | CRUD Customers, Create/Confirm Challans |
| **Warehouse** | `warehouse@erp.com` | `password123` | CRUD Products, Log Stock Movements |
| **Accounts** | `accounts@erp.com` | `password123` | View only (No write actions) |

---

## Architecture

```
Client (React Frontend)
    │
    ▼
Express.js REST API (Node.js + TypeScript)
    │
    ├── JWT Authentication Middleware
    ├── Role-Based Access Control (Admin, Sales, Warehouse, Accounts)
    ├── Zod Input Validation
    ├── Global Error Handler
    │
    ▼
PostgreSQL Database (7 tables)
```

### Module Structure

```
backend/src/
├── config/         → Database connection, environment variables
├── middleware/      → Auth, role guard, validation, error handler
├── modules/
│   ├── auth/       → Login, JWT, user profile
│   ├── customers/  → Customer CRUD, search, follow-ups
│   ├── products/   → Product CRUD, stock movements, low-stock alerts
│   └── challans/   → Sales challan create/confirm/cancel with stock logic
├── db/
│   ├── migrations/ → SQL schema
│   └── seed.ts     → Test data
├── types/          → TypeScript types and enums
└── app.ts          → Express entry point
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express.js |
| Database | PostgreSQL |
| Auth | JWT (jsonwebtoken) |
| Validation | Zod |
| Password Hashing | bcryptjs |

## Setup Instructions

### ⚡ Quick Start: Running with Docker (Recommended)
If you have Docker installed, you can spin up the entire stack (PostgreSQL database + Express Backend + React Frontend) with a single command:
```bash
docker compose up --build
```
The database will be automatically provisioned, migrated, seeded, and running.

---

### 🖥️ Local Manual Setup (Dual-Terminal)
To run the services manually, you need to open **two separate terminal windows/tabs** and run them concurrently.

#### Terminal 1: Backend Setup & Run
1. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Create a `.env` file inside the `backend/` directory (see `.env.example` as a template):
   ```env
   PORT=3000
   DATABASE_URL=your-postgres-connection-string
   JWT_SECRET=mini-erp-crm-jwt-secret-key-2024
   ```
3. Run database migrations and seed default demo data:
   ```bash
   npm run migrate
   npm run seed
   ```
4. Start the backend API server:
   ```bash
   npm run dev
   ```
   *The API will run at `http://localhost:3000`.*

#### Terminal 2: Frontend Setup & Run
1. Navigate to the frontend directory and install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   *The client UI will run at `http://localhost:5173`. Open this URL in your browser to view the application.*


## Test Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@erp.com | password123 |
| Sales | sales@erp.com | password123 |
| Warehouse | warehouse@erp.com | password123 |
| Accounts | accounts@erp.com | password123 |

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Login, returns JWT | No |
| GET | `/api/auth/me` | Get current user | Yes |

### Customers

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/customers` | List (paginated, searchable) | All |
| GET | `/api/customers/:id` | Detail with follow-ups | All |
| POST | `/api/customers` | Create | Admin, Sales |
| PUT | `/api/customers/:id` | Update | Admin, Sales |
| GET | `/api/customers/:id/follow-ups` | Follow-up history | All |
| POST | `/api/customers/:id/follow-ups` | Add follow-up | Admin, Sales |

**Query params:** `?page=1&limit=10&search=keyword`

### Products

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/products` | List (paginated, filterable) | All |
| GET | `/api/products/:id` | Detail with movements | All |
| GET | `/api/products/low-stock` | Products below min stock | All |
| POST | `/api/products` | Create | Admin, Warehouse |
| PUT | `/api/products/:id` | Update | Admin, Warehouse |
| POST | `/api/products/:id/stock-movements` | Record IN/OUT | Admin, Warehouse |
| GET | `/api/products/:id/stock-movements` | Movement history | All |

**Query params:** `?page=1&limit=10&search=keyword&category=Grains`

### Sales Challans

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/challans` | List (paginated) | All |
| GET | `/api/challans/:id` | Detail with items | All |
| POST | `/api/challans` | Create (Draft/Confirmed) | Admin, Sales |
| PATCH | `/api/challans/:id/confirm` | Confirm draft | Admin, Sales |
| PATCH | `/api/challans/:id/cancel` | Cancel challan | Admin |

**Query params:** `?page=1&limit=10&status=Draft`

## Business Logic

### Sales Challan Flow

1. Sales user creates a challan by selecting a customer and adding products with quantities
2. Challan can be saved as **Draft** (no stock impact) or **Confirmed** (reduces stock)
3. Challan number is auto-generated: `CH-YYYYMMDD-XXXX`
4. On confirmation:
   - All product stocks are validated in a **database transaction**
   - If ANY product has insufficient stock, the entire operation is rejected
   - Stock is reduced and stock movement records are created
   - Product snapshots (name, SKU, price at time) are stored in challan items
5. A confirmed or draft challan can be **cancelled** by Admin only
6. Cancellation does NOT restore stock (assumption: separate stock-in should be done manually)

### Role Permissions

| Feature | Admin | Sales | Warehouse | Accounts |
|---------|-------|-------|-----------|----------|
| View all data | ✅ | ✅ | ✅ | ✅ |
| Manage customers | ✅ | ✅ | ❌ | ❌ |
| Manage products | ✅ | ❌ | ✅ | ❌ |
| Stock movements | ✅ | ❌ | ✅ | ❌ |
| Create challans | ✅ | ✅ | ❌ | ❌ |
| Confirm challans | ✅ | ✅ | ❌ | ❌ |
| Cancel challans | ✅ | ❌ | ❌ | ❌ |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Server port | No (default: 3000) |
| NODE_ENV | Environment | No (default: development) |
| DATABASE_URL | PostgreSQL connection string | Yes |
| JWT_SECRET | Secret key for JWT signing | Yes |
| JWT_EXPIRES_IN | JWT token expiry | No (default: 24h) |
| CORS_ORIGIN | Allowed CORS origin | No (default: http://localhost:5173) |

## Deployment

### Using Render (Free Tier)

1. Push code to GitHub
2. Create a new **Web Service** on Render
3. Connect your GitHub repo
4. Set build command: `npm install && npm run build`
5. Set start command: `npm start`
6. Add environment variables in Render dashboard
7. Create a **PostgreSQL** database on Render and use its connection string

### Using Railway

1. Push code to GitHub
2. Create a new project on Railway
3. Add a PostgreSQL plugin
4. Deploy from GitHub
5. Set environment variables
6. Railway auto-detects Node.js and handles the rest

### Local Production Build

```bash
npm run build
npm start
```

## 🌟 Bonus Features Implemented

The following extra features were successfully completed to showcase robust devops and advanced operations portal styling:

### 1. Docker Virtualization & Setup (Bonus Point Requirement)
A complete `docker-compose.yml` config is included to instantly run the PostgreSQL database and backend service in isolated containers:
```bash
docker compose up --build
```
This automatically handles binding, port exposure, and networking link connections.

### 2. Export Invoice as PDF (Bonus Point Requirement)
Inside the **Sales Challan Detail** view, clicking **Export PDF / Print** utilizes custom CSS print media rules:
- Formats the page as a clean corporate invoice.
- Hides dashboard headers, sidebar navigation, buttons, and alert toast popups automatically.
- Produces a print-ready document or high-quality PDF directly from the browser.

## Assumptions

1. Challan cancellation does not restore stock — a separate stock-in movement should be created
2. All authenticated users can view all data; write operations are role-restricted
3. Email is unique per user
4. SKU is unique per product
5. Stock cannot go negative
6. Password is hashed with bcrypt (10 rounds)
7. JWT tokens expire in 24 hours

## Known Limitations

1. No user registration endpoint — users are created via seed or direct DB insert
2. No password reset or change functionality
3. No file upload capability
4. No real-time notifications for low stock
5. No audit log beyond stock movements
