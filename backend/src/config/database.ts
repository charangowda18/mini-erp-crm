import { Pool } from 'pg';
import { env } from './env';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000, // Increased to 10s to gracefully handle Neon serverless cold starts
});

// Log idle errors without killing the Node process
pool.on('error', (err) => {
  console.error('Idle client database connection warning:', err.message);
});

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export const getClient = () => {
  return pool.connect();
};
