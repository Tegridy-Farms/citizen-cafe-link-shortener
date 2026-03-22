/**
 * TDD tests for src/lib/db.ts
 * Covers acceptance criterion #4 — constructs pool with DATABASE_URL only.
 */

const REQUIRED_ENV = {
  DATABASE_URL: 'postgres://test:pass@localhost/testdb',
  SHORTEN_API_KEY: 'test-api-key',
  APP_BASE_URL: 'http://localhost:3000',
};

describe('src/lib/db.ts', () => {
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    savedEnv = { ...process.env };
    Object.assign(process.env, REQUIRED_ENV);
    jest.resetModules();
    // Register mock after resetModules so the fresh require picks it up
    jest.doMock('@vercel/postgres', () => ({
      createPool: jest.fn().mockReturnValue({
        sql: jest.fn(),
        query: jest.fn(),
      }),
    }));
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) delete process.env[key];
    }
    Object.assign(process.env, savedEnv);
    jest.dontMock('@vercel/postgres');
  });

  it('calls createPool with the DATABASE_URL connection string on first sql call', async () => {
    jest.doMock('../src/lib/env', () => ({
      getEnv: jest.fn(() => REQUIRED_ENV),
    }));
    const db = require('../src/lib/db') as { sql: unknown };
    const { createPool } = require('@vercel/postgres') as { createPool: jest.Mock };

    // First sql call should trigger pool creation
    const sql = db.sql as (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
    await sql`SELECT 1`;

    expect(createPool).toHaveBeenCalledWith(
      expect.objectContaining({ connectionString: REQUIRED_ENV.DATABASE_URL })
    );
  });

  it('exports a sql function', () => {
    const db = require('../src/lib/db') as { sql: unknown };
    expect(typeof db.sql).toBe('function');
  });

  it('does not eagerly create the pool on module import', () => {
    jest.dontMock('@vercel/postgres');
    jest.resetModules();
    jest.doMock('@vercel/postgres', () => ({
      createPool: jest.fn().mockReturnValue({
        sql: jest.fn(),
        query: jest.fn(),
      }),
    }));
    Object.assign(process.env, REQUIRED_ENV);

    require('../src/lib/db');
    const { createPool } = require('@vercel/postgres') as { createPool: jest.Mock };

    // createPool should NOT have been called yet (lazy initialization)
    expect(createPool).not.toHaveBeenCalled();
  });

  it('does not reference POSTGRES_URL in source', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const content = fs.readFileSync(
      path.join(__dirname, '../src/lib/db.ts'),
      'utf-8'
    );
    expect(content).not.toMatch(/POSTGRES_URL/);
  });
});
