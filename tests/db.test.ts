/**
 * TDD tests for src/lib/db.ts
 * Covers acceptance criteria — createPool with DATABASE_URL and pool.sql.bind(pool).
 */

const REQUIRED_ENV = {
  DATABASE_URL: 'postgres://test:pass@localhost/testdb',
  SHORTEN_API_KEY: 'test-api-key',
  APP_BASE_URL: 'http://localhost:3000',
};

describe('src/lib/db.ts', () => {
  let savedEnv: NodeJS.ProcessEnv;
  let mockSql: jest.Mock;
  let mockCreatePool: jest.Mock;

  beforeEach(() => {
    savedEnv = { ...process.env };
    Object.assign(process.env, REQUIRED_ENV);
    jest.resetModules();

    // Create mock sql function
    mockSql = jest.fn();

    // Create mock createPool that returns a pool with sql method
    mockCreatePool = jest.fn().mockReturnValue({
      sql: mockSql,
    });

    // Register mock before requiring the module
    jest.doMock('@vercel/postgres', () => ({
      createPool: mockCreatePool,
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
    const db = require('../src/lib/db') as { sql: unknown };
    expect(typeof db.sql).toBe('function');
  });

  it('uses createPool with connectionString set to process.env.DATABASE_URL', () => {
    // Require the module to trigger pool creation
    require('../src/lib/db');

    expect(mockCreatePool).toHaveBeenCalledWith({
      connectionString: process.env.DATABASE_URL,
    });
  });

  it('exports pool.sql bound to pool', () => {
    const db = require('../src/lib/db') as { sql: (...args: unknown[]) => unknown };

    // Call the exported sql function
    const strings = ['SELECT 1'] as unknown as TemplateStringsArray;
    db.sql(strings);

    // Verify the mock sql was called
    expect(mockSql).toHaveBeenCalled();
  });

  it('does not use bare sql import from @vercel/postgres', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const content = fs.readFileSync(
      path.join(__dirname, '../src/lib/db.ts'),
      'utf-8'
    );
    // Should NOT have bare import { sql } from '@vercel/postgres'
    expect(content).not.toMatch(/import\s*\{\s*sql\s*\}\s*from\s*['"]@vercel\/postgres['"]/);
    // Should NOT have bare export { sql }
    expect(content).not.toMatch(/export\s*\{\s*sql\s*\}/);
  });

  it('does not use (pool as any).sql pattern', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const content = fs.readFileSync(
      path.join(__dirname, '../src/lib/db.ts'),
      'utf-8'
    );
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

  it('uses pool.sql.bind(pool) pattern', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const content = fs.readFileSync(
      path.join(__dirname, '../src/lib/db.ts'),
      'utf-8'
    );
    expect(content).toMatch(/pool\.sql\.bind\(pool\)/);
  });
});
