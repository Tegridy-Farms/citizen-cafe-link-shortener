/**
 * Single database client module.
 * Re-exports the sql tagged template from @vercel/postgres.
 * DATABASE_URL is the only canonical env var for DB access — no alternate keys.
 * All route handlers and server components must import sql from here.
 * 
 * The @vercel/postgres sql function reads DATABASE_URL at query execution 
 * time from process.env. This env var is confirmed present in all Vercel environments.
 */
import { sql } from '@vercel/postgres';
export { sql };
