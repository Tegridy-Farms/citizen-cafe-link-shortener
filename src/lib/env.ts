/**
 * Centralised environment variable reader — lazy validation.
 * Validates only on first call to getEnv(), not at module-load time.
 * This allows next build to succeed even when Vercel runtime env vars are not yet injected.
 * All process.env reads in the application flow through this module.
 */

export type Env = {
  DATABASE_URL: string;
  SHORTEN_API_KEY: string;
  APP_BASE_URL: string;
};

const REQUIRED_VARS: (keyof Env)[] = ['DATABASE_URL', 'SHORTEN_API_KEY', 'APP_BASE_URL'];

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  // Validate all required vars on first call
  for (const varName of REQUIRED_VARS) {
    if (!process.env[varName]) {
      throw new Error(
        `Missing required environment variable: ${varName}. ` +
          `Set it in .env.local (development) or as a Vercel/GitHub Actions secret (CI/production).`
      );
    }
  }

  cachedEnv = {
    DATABASE_URL: process.env.DATABASE_URL as string,
    SHORTEN_API_KEY: process.env.SHORTEN_API_KEY as string,
    APP_BASE_URL: process.env.APP_BASE_URL as string,
  };

  return cachedEnv;
}
