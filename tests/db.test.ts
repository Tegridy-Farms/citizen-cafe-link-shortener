/**
 * TDD tests for src/lib/db.ts
 * Covers acceptance criterion #4 — imports sql directly from @vercel/postgres and uses DATABASE_URL.
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
      sql: jest.fn(),
    }));
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) delete process.env[key];
    }
    Object.assign(process.env, savedEnv);
    jest.dontMock('@vercel/postgres');
  });

  it('exports a sql function', () => {
    jest.doMock('../src/lib/env', () => ({
      getEnv: jest.fn(() => REQUIRED_ENV),
    }));
    const db = require('../src/lib/db') as { sql: unknown };
    expect(typeof db.sql).toBe('function');
  });

  it('uses the sql function imported from @vercel/postgres', async () => {
    const mockSql = jest.fn().mockResolvedValueOnce({ rows: [{ id: 1 }] });
    jest.doMock('@vercel/postgres', () => ({
      sql: mockSql,
    }));
    jest.doMock('../src/lib/env', () => ({
      getEnv: jest.fn(() => REQUIRED_ENV),
    }));

    const db = require('../src/lib/db') as {
      sql: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
    };

    // Call sql function
    await db.sql`SELECT 1`;

    // Verify the imported sql function was called
    expect(mockSql).toHaveBeenCalled();
  });

  it('does not use createPool or (pool as any).sql pattern', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const content = fs.readFileSync(
      path.join(__dirname, '../src/lib/db.ts'),
      'utf-8'
    );
    expect(content).not.toMatch(/createPool/);
    expect(content).not.toMatch(/\(pool as any\)\.sql/);
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

  it('verifies DATABASE_URL is set on initialization', () => {
    const getEnvMock = jest.fn(() => ({
      ...REQUIRED_ENV,
      DATABASE_URL: '', // Empty DATABASE_URL
    }));
    jest.doMock('../src/lib/env', () => ({
      getEnv: getEnvMock,
    }));

    const db = require('../src/lib/db') as {
      sql: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
    };

    // Should throw when DATABASE_URL is not set
    expect(() => {
      db.sql`SELECT 1`;
    }).toThrow('DATABASE_URL is not set');
  });
});
