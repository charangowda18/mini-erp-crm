import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './modules/auth/auth.routes';
import customersRoutes from './modules/customers/customers.routes';
import productsRoutes from './modules/products/products.routes';
import challansRoutes from './modules/challans/challans.routes';

const app = express();

// Middleware
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/challans', challansRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = parseInt(env.PORT);
app.listen(PORT, () => {
  console.log(`\n🚀 Mini ERP + CRM Backend Server`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   CORS Origin: ${env.CORS_ORIGIN}\n`);
});

export default app;
