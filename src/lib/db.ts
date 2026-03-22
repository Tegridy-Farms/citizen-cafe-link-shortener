/**
 * Single database client module.
 * Constructs the @vercel/postgres pool with explicit DATABASE_URL connection string.
 * DATABASE_URL is the only canonical env var for DB access — no alternate keys.
 * All route handlers and server components must import sql from here.
 */
import { createPool } from '@vercel/postgres';

const pool = createPool({
  connectionString: process.env.DATABASE_URL,
});

export const sql = pool.sql.bind(pool);
