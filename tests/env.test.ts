/**
 * TDD tests for src/lib/env.ts
 * Covers lazy validation (getEnv singleton) — validates only on first call, not at module load.
 */

describe('src/lib/env.ts — lazy validation', () => {
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    savedEnv = { ...process.env };
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original env
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) delete process.env[key];
    }
    Object.assign(process.env, savedEnv);
  });

  // AC#2: Importing module does NOT throw when env vars are missing
  it('does not throw when imported with missing env vars (lazy validation)', () => {
    delete process.env.DATABASE_URL;
    delete process.env.SHORTEN_API_KEY;
    delete process.env.APP_BASE_URL;
    expect(() => require('../src/lib/env')).not.toThrow();
  });

  // AC#3: getEnv() returns correct values when all vars are present
  it('getEnv() returns all values when all env vars are set', () => {
    process.env.DATABASE_URL = 'postgres://test:pass@localhost/testdb';
    process.env.SHORTEN_API_KEY = 'test-api-key';
    process.env.APP_BASE_URL = 'http://localhost:3000';

    jest.resetModules();
    const { getEnv } = require('../src/lib/env');
    const env = getEnv();

    expect(env.DATABASE_URL).toBe('postgres://test:pass@localhost/testdb');
    expect(env.SHORTEN_API_KEY).toBe('test-api-key');
    expect(env.APP_BASE_URL).toBe('http://localhost:3000');
  });

  // AC#4: getEnv() throws when a required var is missing
  it('getEnv() throws when DATABASE_URL is missing', () => {
    process.env.SHORTEN_API_KEY = 'test-api-key';
    process.env.APP_BASE_URL = 'http://localhost:3000';
    delete process.env.DATABASE_URL;

    jest.resetModules();
    const { getEnv } = require('../src/lib/env');

    expect(() => getEnv()).toThrow(/DATABASE_URL/);
  });

  it('getEnv() throws when SHORTEN_API_KEY is missing', () => {
    process.env.DATABASE_URL = 'postgres://test:pass@localhost/testdb';
    process.env.APP_BASE_URL = 'http://localhost:3000';
    delete process.env.SHORTEN_API_KEY;

    jest.resetModules();
    const { getEnv } = require('../src/lib/env');

    expect(() => getEnv()).toThrow(/SHORTEN_API_KEY/);
  });

  it('getEnv() throws when APP_BASE_URL is missing', () => {
    process.env.DATABASE_URL = 'postgres://test:pass@localhost/testdb';
    process.env.SHORTEN_API_KEY = 'test-api-key';
    delete process.env.APP_BASE_URL;

    jest.resetModules();
    const { getEnv } = require('../src/lib/env');

    expect(() => getEnv()).toThrow(/APP_BASE_URL/);
  });

  it('getEnv() throws when a var is an empty string', () => {
    process.env.DATABASE_URL = '';
    process.env.SHORTEN_API_KEY = 'test-api-key';
    process.env.APP_BASE_URL = 'http://localhost:3000';

    jest.resetModules();
    const { getEnv } = require('../src/lib/env');

    expect(() => getEnv()).toThrow(/DATABASE_URL/);
  });

  // Caching: calling getEnv() multiple times returns same instance
  it('getEnv() caches result — subsequent calls return same object', () => {
    process.env.DATABASE_URL = 'postgres://test:pass@localhost/testdb';
    process.env.SHORTEN_API_KEY = 'test-api-key';
    process.env.APP_BASE_URL = 'http://localhost:3000';

    jest.resetModules();
    const { getEnv } = require('../src/lib/env');

    const env1 = getEnv();
    const env2 = getEnv();
    expect(env1).toBe(env2); // Same reference
  });
});
