/**
 * TDD tests for src/lib/db.ts
 * Covers acceptance criterion #1 — imports sql directly from @vercel/postgres.
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
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) delete process.env[key];
    }
    Object.assign(process.env, savedEnv);
  });

  it('exports a sql function', () => {
    const db = require('../src/lib/db') as { sql: unknown };
    expect(typeof db.sql).toBe('function');
  });

  it('imports sql directly from @vercel/postgres', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const content = fs.readFileSync(
      path.join(__dirname, '../src/lib/db.ts'),
      'utf-8'
    );
    // Should import sql directly from @vercel/postgres
    expect(content).toMatch(/import\s*\{\s*sql\s*\}\s*from\s*['"]@vercel\/postgres['"]/);
    // Should re-export sql
    expect(content).toMatch(/export\s*\{\s*sql\s*\}/);
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
    expect(content).not.toMatch(/\.sql\.bind\(pool\)/);
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

  it('does not have initializeSQL or getPoolAndSql functions', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const content = fs.readFileSync(
      path.join(__dirname, '../src/lib/db.ts'),
      'utf-8'
    );
    expect(content).not.toMatch(/initializeSQL/);
    expect(content).not.toMatch(/getPoolAndSql/);
  });
});
