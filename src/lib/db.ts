/**
 * Single database client module.
 * Constructs the @vercel/postgres sql client from DATABASE_URL.
 * DATABASE_URL is the only canonical env var for DB access — no alternate keys.
 * All route handlers and server components must import sql from here.
 */
import { sql as vercelSql } from '@vercel/postgres';
import { getEnv } from './env';

let initialized = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sqlFn: any = null;

function initializeSQL() {
  if (!initialized) {
    const env = getEnv();
    // Verify DATABASE_URL exists — @vercel/postgres will use it via environment
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    // Use the sql function directly from @vercel/postgres
    sqlFn = vercelSql;
    initialized = true;
  }
  return sqlFn;
}

/**
 * Parameterised SQL tagged template — the only way to query the DB in this app.
 * Usage: await sql`SELECT * FROM links WHERE shortcode = ${code}`
 */
export function sql<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) {
  const fn = initializeSQL();
  return fn(strings, ...values) as any;
}
