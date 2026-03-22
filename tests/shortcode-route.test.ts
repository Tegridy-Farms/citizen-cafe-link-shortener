/**
 * TDD tests for src/app/[shortcode]/page.tsx
 * Covers acceptance criteria for Stage 5 — 404/302 handling and notFound() propagation.
 */

// --- Module mocks (hoisted by jest before imports) ---

const mockSql = jest.fn();

// Mock notFound to throw a special error (like Next.js does internally)
class NotFoundError extends Error {
  constructor() {
    super('NEXT_NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

const mockNotFound = jest.fn(() => {
  throw new NotFoundError();
});

const mockRedirect = jest.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT to ${url}`);
});

jest.mock('next/navigation', () => ({
  notFound: (...args: unknown[]) => mockNotFound(...args),
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

// Mock @vercel/postgres at the lowest level — this is what db.ts imports
jest.mock('@vercel/postgres', () => ({
  sql: (...args: unknown[]) => mockSql(...args),
  createPool: jest.fn(() => ({
    sql: (...args: unknown[]) => mockSql(...args),
  })),
}));

// --- Test setup ---

const REQUIRED_ENV = {
  DATABASE_URL: 'postgres://test:pass@localhost/testdb',
  SHORTEN_API_KEY: 'test-api-key',
  APP_BASE_URL: 'http://localhost:3000',
};

describe('src/app/[shortcode]/page.tsx — source checks', () => {
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

describe('src/app/[shortcode]/page.tsx — behavior', () => {
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    savedEnv = { ...process.env };
    Object.assign(process.env, REQUIRED_ENV);
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) delete process.env[key];
    }
    Object.assign(process.env, savedEnv);
  });

  // AC#6: notFound() called when DB returns no rows
  it('calls notFound() when shortcode is not found in DB', async () => {
    mockSql.mockResolvedValue({ rows: [] });

    const { default: ShortcodePage } = require('../src/app/[shortcode]/page');
    
    // Should throw the NotFoundError when shortcode not found
    await expect(ShortcodePage({ params: { shortcode: 'NONEXISTENT' } })).rejects.toThrow(NotFoundError);
    expect(mockNotFound).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  // AC#6: redirect() called with original_url when DB returns a row
  it('calls redirect() with original_url when shortcode is found', async () => {
    mockSql.mockResolvedValue({
      rows: [{ original_url: 'https://example.com/target' }],
    });

    const { default: ShortcodePage } = require('../src/app/[shortcode]/page');
    
    // Should throw the redirect error when found
    await expect(ShortcodePage({ params: { shortcode: 'abc123' } })).rejects.toThrow('NEXT_REDIRECT to https://example.com/target');
    expect(mockRedirect).toHaveBeenCalledWith('https://example.com/target');
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  // AC#6: DB errors propagate (not silently swallowed)
  it('propagates DB errors without catching them', async () => {
    const dbError = new Error('Connection failed');
    mockSql.mockRejectedValue(dbError);

    const { default: ShortcodePage } = require('../src/app/[shortcode]/page');
    await expect(ShortcodePage({ params: { shortcode: 'abc123' } })).rejects.toThrow('Connection failed');
  });
});
