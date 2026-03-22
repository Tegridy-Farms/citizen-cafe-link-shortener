/**
 * Single database client module.
 * Constructs the @vercel/postgres pool lazily (on first use) from DATABASE_URL.
 * DATABASE_URL is the only canonical env var for DB access — no alternate keys.
 * All route handlers and server components must import sql/pool from here.
 */
import { createPool, type Pool, type QueryExecResult } from '@vercel/postgres';
import { getEnv } from './env';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const env = getEnv();
    pool = createPool({ connectionString: env.DATABASE_URL });
  }
  return pool;
}

/**
 * Parameterised SQL tagged template — the only way to query the DB in this app.
 * Usage: await sql`SELECT * FROM links WHERE shortcode = ${code}`
 */
export function sql(strings: TemplateStringsArray, ...values: unknown[]): Promise<QueryExecResult<Record<string, unknown>>> {
  const pool = getPool();
  return pool.sql(strings, ...values);
}
