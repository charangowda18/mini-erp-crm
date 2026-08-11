# Mini ERP + CRM Operations Portal

A modern full-stack ERP and CRM portal designed for wholesale and distribution workflows. Built using a robust, decoupled architecture with **Node.js (Express + TypeScript)** and a responsive **React (Vite)** dashboard.

This repository serves as a self-contained local workspace. Evaluators can run the complete app locally using either Docker Compose or direct manual setup.

---

## 🚀 Test Login Credentials

Use the following pre-seeded credentials to explore the different dashboard states and role-based permissions:

| Role | Email | Password | Allowed Operations |
|------|-------|----------|-------------------|
| **Admin** | `admin@erp.com` | `password123` | Full system access (View, CRUD, Confirm Challans, Cancel Challans) |
| **Sales** | `sales@erp.com` | `password123` | CRM customer management, creating and confirming sales challans |
| **Warehouse** | `warehouse@erp.com` | `password123` | Inventory catalog management, logging manual stock ledger movements |
| **Accounts** | `accounts@erp.com` | `password123` | Read-only access to all modules (No write operations allowed) |

---

## ⚡ Setup Instructions

### Option A: Running with Docker (Recommended & Quickest)
If you have Docker installed, you can spin up the complete infrastructure (PostgreSQL database + API Server + Client UI) in one command:
```bash
docker compose up --build
```
*Note: The PostgreSQL database will be automatically provisioned, migrated, and seeded with sample data.*

---

### Option B: Local Manual Setup (Dual-Terminal)
To run the services manually, open **two separate terminal tabs** and launch them concurrently:

#### Terminal 1: Express Backend API Server
1. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Create a `.env` file inside the `backend/` folder (reference `backend/.env.example`):
   ```env
   PORT=3000
   DATABASE_URL=your-postgres-connection-string
   JWT_SECRET=mini-erp-crm-jwt-secret-key-2024
   ```
3. Run database migrations and seed default mock values:
   ```bash
   npm run migrate
   npm run seed
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The local API will run at `http://localhost:3000`.*

#### Terminal 2: React Frontend Client
1. Navigate to the frontend directory and install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   *The local UI client will run at `http://localhost:5173`. Open this URL in your web browser.*

---

## 🌟 Highlighted Features (Case Study Requirements)
- **Role-Based Gating:** Strict UI-level page hiding and API-level endpoint validation guards.
- **Stock Ledger Audit Trail:** Complete log tracking for every stock change showing who modified it, when, and why.
- **ACID Transactional Integrity:** Confirming sales orders triggers row-level locking (`SELECT ... FOR UPDATE`) in a database transaction, guaranteeing stock cannot go negative.
- **Historical Snapshotting:** Freezes names, SKUs, and prices inside the challan items record upon confirmation.
- **Export PDF (Bonus Point):** Print-media styling to instantly generate high-quality invoice PDFs directly from the browser.
- **Docker Compose (Bonus Point):** Fully containerized stack support.

---

## 📄 Technical Reference
For comprehensive details on API routes, database schemas, architecture diagrams, and business logic rules, please refer to:
👉 **[project_documentation.md](file:///project_documentation.md)**
