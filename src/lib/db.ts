/**
 * Single database client module.
 * Constructs the @vercel/postgres pool lazily (on first use) from DATABASE_URL.
 * DATABASE_URL is the only canonical env var for DB access — no alternate keys.
 * All route handlers and server components must import sql/pool from here.
 */
import { createPool, type Pool } from '@vercel/postgres';
import { getEnv } from './env';

let pool: Pool | null = null;
let sqlFn: ((strings: TemplateStringsArray, ...values: unknown[]) => any) | null = null;

function getPoolAndSql() {
  if (!pool) {
    const env = getEnv();
    pool = createPool({ connectionString: env.DATABASE_URL });
    sqlFn = (pool as any).sql.bind(pool);
  }
  return { pool, sqlFn };
}

/**
 * Parameterised SQL tagged template — the only way to query the DB in this app.
 * Usage: await sql`SELECT * FROM links WHERE shortcode = ${code}`
 */
export function sql<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) {
  const { sqlFn: fn } = getPoolAndSql();
  return fn!(strings, ...values) as any;
}
