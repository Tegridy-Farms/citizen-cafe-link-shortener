/**
 * Centralised environment variable reader.
 * Throws at module-load time if any required variable is absent or empty.
 * All process.env reads in the application flow through this module.
 */

const REQUIRED_VARS = ['DATABASE_URL', 'SHORTEN_API_KEY', 'APP_BASE_URL'] as const;

for (const varName of REQUIRED_VARS) {
  if (!process.env[varName]) {
    throw new Error(
      `Missing required environment variable: ${varName}. ` +
        `Set it in .env.local (development) or as a Vercel/GitHub Actions secret (CI/production).`
    );
  }
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL as string,
  SHORTEN_API_KEY: process.env.SHORTEN_API_KEY as string,
  APP_BASE_URL: process.env.APP_BASE_URL as string,
};
