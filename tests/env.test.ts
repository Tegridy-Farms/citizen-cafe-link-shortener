/**
 * TDD tests for src/lib/env.ts
 * Covers acceptance criterion #3 — throws at module-load time if required vars are missing.
 */

describe('src/lib/env.ts', () => {
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    savedEnv = { ...process.env };
    jest.resetModules();
    // Set all required vars to valid defaults before each test
    process.env.DATABASE_URL = 'postgres://test:pass@localhost/testdb';
    process.env.SHORTEN_API_KEY = 'test-api-key';
    process.env.APP_BASE_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    // Restore original env
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) delete process.env[key];
    }
    Object.assign(process.env, savedEnv);
  });

  it('throws a descriptive error when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    expect(() => require('../src/lib/env')).toThrow(/DATABASE_URL/);
  });

  it('throws a descriptive error when SHORTEN_API_KEY is missing', () => {
    delete process.env.SHORTEN_API_KEY;
    expect(() => require('../src/lib/env')).toThrow(/SHORTEN_API_KEY/);
  });

  it('throws a descriptive error when APP_BASE_URL is missing', () => {
    delete process.env.APP_BASE_URL;
    expect(() => require('../src/lib/env')).toThrow(/APP_BASE_URL/);
  });

  it('throws when DATABASE_URL is an empty string', () => {
    process.env.DATABASE_URL = '';
    expect(() => require('../src/lib/env')).toThrow(/DATABASE_URL/);
  });

  it('exports env object with all values when all vars are present', () => {
    const mod = require('../src/lib/env') as { env: Record<string, string> };
    expect(mod.env.DATABASE_URL).toBe('postgres://test:pass@localhost/testdb');
    expect(mod.env.SHORTEN_API_KEY).toBe('test-api-key');
    expect(mod.env.APP_BASE_URL).toBe('http://localhost:3000');
  });
});
