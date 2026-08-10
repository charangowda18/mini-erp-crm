import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';

async function migrate() {
  const client = await pool.connect();
  try {
    const migrationPath = path.join(__dirname, 'migrations', '001_initial.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('🔄 Running migration...');
    await client.query(sql);
    console.log('✅ Migration completed successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
