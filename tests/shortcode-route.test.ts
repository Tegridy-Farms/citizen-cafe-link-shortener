/**
 * TDD tests for src/app/[shortcode]/page.tsx
 * Covers acceptance criteria for Stage 5 — 404/302 handling and notFound() propagation.
 */

const REQUIRED_ENV = {
  DATABASE_URL: 'postgres://test:pass@localhost/testdb',
  SHORTEN_API_KEY: 'test-api-key',
  APP_BASE_URL: 'http://localhost:3000',
};

describe('src/app/[shortcode]/page.tsx', () => {
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
    jest.dontMock('@vercel/postgres');
    jest.dontMock('next/navigation');
  });

  // AC#5: page.tsx does not have try/catch that swallows notFound()
  it('page source does not contain try/catch around sql call', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const content = fs.readFileSync(
      path.join(__dirname, '../src/app/[shortcode]/page.tsx'),
      'utf-8'
    );
    // The page should not have try/catch that could swallow notFound()
    expect(content).not.toMatch(/try\s*\{[\s\S]*?sql[\s\S]*?\}\s*catch/);
  });

  // AC#4: db.ts uses direct sql import, not (pool as any).sql
  it('db.ts uses direct sql import from @vercel/postgres', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const content = fs.readFileSync(
      path.join(__dirname, '../src/lib/db.ts'),
      'utf-8'
    );
    // Should NOT have the unsafe (pool as any).sql pattern
    expect(content).not.toMatch(/\(pool as any\)\.sql/);
    expect(content).not.toMatch(/\.sql\.bind\(pool\)/);
    // Should import sql directly from @vercel/postgres
    expect(content).toMatch(/from ['"]@vercel\/postgres['"]/);
  });
});

describe('src/app/[shortcode]/page.tsx — integration', () => {
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
    jest.dontMock('@/lib/db');
    jest.dontMock('next/navigation');
  });

  // AC#6: notFound() called when DB returns no rows
  it('calls notFound() when shortcode is not found in DB', async () => {
    const notFoundMock = jest.fn(() => {
      throw new Error('notFound called');
    });
    const redirectMock = jest.fn(() => {
      throw new Error('redirect called');
    });

    jest.doMock('next/navigation', () => ({
      notFound: notFoundMock,
      redirect: redirectMock,
    }));

    // Mock @/lib/db to return empty rows
    jest.doMock('@/lib/db', () => ({
      sql: jest.fn().mockResolvedValue({ rows: [] }),
    }));

    // Re-require the page module after mocking
    const { default: ShortcodePage } = require('../src/app/[shortcode]/page');

    // Should throw from notFound()
    await expect(ShortcodePage({ params: { shortcode: 'NONEXISTENT' } })).rejects.toThrow('notFound called');

    expect(notFoundMock).toHaveBeenCalled();
  });

  // AC#6: redirect() called with original_url when DB returns a row
  it('calls redirect() with original_url when shortcode is found', async () => {
    const notFoundMock = jest.fn(() => {
      throw new Error('notFound called');
    });
    const redirectMock = jest.fn(() => {
      throw new Error('redirect called');
    });

    jest.doMock('next/navigation', () => ({
      notFound: notFoundMock,
      redirect: redirectMock,
    }));

    // Mock @/lib/db to return a row
    jest.doMock('@/lib/db', () => ({
      sql: jest.fn().mockResolvedValue({
        rows: [{ original_url: 'https://example.com/target' }],
      }),
    }));

    const { default: ShortcodePage } = require('../src/app/[shortcode]/page');

    // Should throw from redirect()
    await expect(ShortcodePage({ params: { shortcode: 'abc123' } })).rejects.toThrow('redirect called');

    expect(redirectMock).toHaveBeenCalledWith('https://example.com/target');
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  // AC#6: DB errors propagate (not silently swallowed)
  it('propagates DB errors without catching them', async () => {
    const dbError = new Error('Connection failed');

    jest.doMock('@/lib/db', () => ({
      sql: jest.fn().mockRejectedValue(dbError),
    }));

    const { default: ShortcodePage } = require('../src/app/[shortcode]/page');
    await expect(ShortcodePage({ params: { shortcode: 'abc123' } })).rejects.toThrow('Connection failed');
  });
});
