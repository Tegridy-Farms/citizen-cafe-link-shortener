/**
 * Single database client module.
 * Constructs the @vercel/postgres pool explicitly from DATABASE_URL.
 * DATABASE_URL is the only canonical env var for DB access — no alternate keys.
 * All route handlers and server components must import sql/pool from here.
 */
import { createPool } from '@vercel/postgres';
import { env } from './env';

export const pool = createPool({ connectionString: env.DATABASE_URL });

/**
 * Parameterised SQL tagged template — the only way to query the DB in this app.
 * Usage: await sql`SELECT * FROM links WHERE shortcode = ${code}`
 */
export const sql = pool.sql.bind(pool);
