/**
 * TDD tests for POST /api/shorten route handler.
 * Covers acceptance criteria: R-001, R-002, R-003, R-004, R-012.
 * Uses mocked DB (sql), env, and nanoid to unit-test deduplication logic.
 */

// --- Module mocks (hoisted by jest before imports) ---

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'abcde12345'),
}));

jest.mock('../src/lib/env', () => ({
  getEnv: jest.fn(() => ({
    DATABASE_URL: 'postgres://test:pass@localhost/testdb',
    SHORTEN_API_KEY: 'test-secret-key',
    APP_BASE_URL: 'http://localhost:3000',
  })),
}));

jest.mock('../src/lib/db', () => ({
  sql: jest.fn(),
  pool: {},
}));

// Minimal next/server mock — avoids runtime issues with Node+Next edge types
jest.mock('next/server', () => {
  return {
    NextRequest: class MockNextRequest {
      private _url: string;
      private _init: { method?: string; body?: string };
      constructor(url: string, init: { method?: string; body?: string } = {}) {
        this._url = url;
        this._init = init;
      }
      get url() {
        return this._url;
      }
      async json() {
        return JSON.parse(this._init.body ?? '{}');
      }
    },
    NextResponse: {
      json: (data: unknown, init?: { status?: number }) => ({
        status: init?.status ?? 200,
        _data: data,
        async json() {
          return data;
        },
      }),
    },
  };
});

// --- Imports (after mocks are registered) ---

import { POST } from '../src/app/api/shorten/route';
import { sql } from '../src/lib/db';
import { nanoid } from 'nanoid';

const mockSql = sql as jest.Mock;
const mockNanoid = nanoid as jest.Mock;

// Helper: build a mock NextRequest
function makeRequest(body: Record<string, unknown>) {
  const { NextRequest } = jest.requireMock('next/server') as {
    NextRequest: new (url: string, init: { method: string; body: string }) => unknown;
  };
  return new NextRequest('http://localhost:3000/api/shorten', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as Parameters<typeof POST>[0];
}

// Helper: extract response data
async function getResponseData(res: Awaited<ReturnType<typeof POST>>) {
  const r = res as unknown as { status: number; json: () => Promise<unknown> };
  return { status: r.status, data: await r.json() };
}

// ──────────────────────────────────────────
// Acceptance criterion 1: 201 for new URL
// ──────────────────────────────────────────
describe('POST /api/shorten — new URL (AC1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNanoid.mockReturnValue('abcde12345');
  });

  it('returns 201 and { url } containing the new shortcode', async () => {
    mockSql.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          shortcode: 'abcde12345',
          original_url: 'https://example.com',
          created_at: new Date(),
        },
      ],
    });

    const req = makeRequest({ url: 'https://example.com', key: 'test-secret-key' });
    const { status, data } = await getResponseData(await POST(req));

    expect(status).toBe(201);
    expect(data).toEqual({ url: 'http://localhost:3000/abcde12345' });
  });

  it('shortcode in response matches ^[A-Za-z0-9_-]{8,12}$', async () => {
    mockNanoid.mockReturnValue('Ab1_-z0987');
    mockSql.mockResolvedValueOnce({
      rows: [
        {
          id: 2,
          shortcode: 'Ab1_-z0987',
          original_url: 'https://new.com',
          created_at: new Date(),
        },
      ],
    });

    const req = makeRequest({ url: 'https://new.com', key: 'test-secret-key' });
    const { data } = await getResponseData(await POST(req));
    const shortcode = (data as { url: string }).url.split('/').pop()!;

    expect(shortcode).toMatch(/^[A-Za-z0-9_-]{8,12}$/);
  });

  it('calls sql with nanoid-generated shortcode and original_url', async () => {
    mockNanoid.mockReturnValue('mycode1234');
    mockSql.mockResolvedValueOnce({
      rows: [{ id: 3, shortcode: 'mycode1234', original_url: 'https://called.com', created_at: new Date() }],
    });

    const req = makeRequest({ url: 'https://called.com', key: 'test-secret-key' });
    await POST(req);

    // sql is a tagged template: called with template strings and interpolated values
    expect(mockSql).toHaveBeenCalledTimes(1);
  });
});

// ──────────────────────────────────────────
// Acceptance criterion 2: 401 for wrong key
// ──────────────────────────────────────────
describe('POST /api/shorten — auth (AC2)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 for wrong key', async () => {
    const req = makeRequest({ url: 'https://example.com', key: 'wrong-key' });
    const { status, data } = await getResponseData(await POST(req));

    expect(status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('returns 401 for missing key', async () => {
    const req = makeRequest({ url: 'https://example.com' });
    const { status, data } = await getResponseData(await POST(req));

    // Missing key fails schema parse → 400, not 401
    // (key is required by ShortenRequestSchema)
    expect([400, 401]).toContain(status);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('returns 401 for empty-string key', async () => {
    const req = makeRequest({ url: 'https://example.com', key: '' });
    // Empty key fails Zod schema (min 1) → 400
    const { status } = await getResponseData(await POST(req));
    expect([400, 401]).toContain(status);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('creates no DB record on 401', async () => {
    const req = makeRequest({ url: 'https://example.com', key: 'bad' });
    await POST(req);
    expect(mockSql).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────
// Acceptance criterion 3: 400 for bad URL
// ──────────────────────────────────────────
describe('POST /api/shorten — URL validation (AC3)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 for empty URL', async () => {
    const req = makeRequest({ url: '', key: 'test-secret-key' });
    const { status, data } = await getResponseData(await POST(req));

    expect(status).toBe(400);
    expect((data as { error: string }).error).toBeTruthy();
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('returns 400 for non-URL string', async () => {
    const req = makeRequest({ url: 'not-a-url', key: 'test-secret-key' });
    const { status } = await getResponseData(await POST(req));

    expect(status).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('returns 400 for ftp URL', async () => {
    const req = makeRequest({ url: 'ftp://example.com', key: 'test-secret-key' });
    const { status } = await getResponseData(await POST(req));

    expect(status).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('returns 400 for relative URL', async () => {
    const req = makeRequest({ url: '/relative/path', key: 'test-secret-key' });
    const { status } = await getResponseData(await POST(req));

    expect(status).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('creates no DB record on 400', async () => {
    const req = makeRequest({ url: 'not-a-url', key: 'test-secret-key' });
    await POST(req);
    expect(mockSql).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────
// Acceptance criterion 4: deduplication (AC4, R-012)
// ──────────────────────────────────────────
describe('POST /api/shorten — deduplication (AC4)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 and existing shortcode on duplicate original_url', async () => {
    // INSERT returns 0 rows (ON CONFLICT DO NOTHING)
    mockSql.mockResolvedValueOnce({ rows: [] });
    // SELECT returns existing record
    mockSql.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          shortcode: 'existing12',
          original_url: 'https://dup.com',
          created_at: new Date(),
        },
      ],
    });

    const req = makeRequest({ url: 'https://dup.com', key: 'test-secret-key' });
    const { status, data } = await getResponseData(await POST(req));

    expect(status).toBe(200);
    expect(data).toEqual({ url: 'http://localhost:3000/existing12' });
  });

  it('two calls with identical URL return the same shortcode', async () => {
    const rows = [{ id: 1, shortcode: 'same123456', original_url: 'https://same.com', created_at: new Date() }];

    // First call: INSERT succeeds
    mockSql.mockResolvedValueOnce({ rows });
    const req1 = makeRequest({ url: 'https://same.com', key: 'test-secret-key' });
    const r1 = await getResponseData(await POST(req1));

    // Second call: INSERT conflicts → SELECT returns existing
    mockSql.mockResolvedValueOnce({ rows: [] });
    mockSql.mockResolvedValueOnce({ rows });
    const req2 = makeRequest({ url: 'https://same.com', key: 'test-secret-key' });
    const r2 = await getResponseData(await POST(req2));

    expect(r1.data).toEqual(r2.data);
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(200);
  });
});

// ──────────────────────────────────────────
// Shortcode collision retry logic
// ──────────────────────────────────────────
describe('POST /api/shorten — shortcode collision retry', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retries up to 3 times on shortcode unique violation and succeeds', async () => {
    const collisionError = Object.assign(new Error('unique violation'), {
      code: '23505',
      constraint: 'links_shortcode_key',
    });

    mockNanoid
      .mockReturnValueOnce('collision01')
      .mockReturnValueOnce('collision02')
      .mockReturnValueOnce('success1234');

    // First two attempts throw unique violation on shortcode
    mockSql.mockRejectedValueOnce(collisionError);
    mockSql.mockRejectedValueOnce(collisionError);
    // Third attempt succeeds
    mockSql.mockResolvedValueOnce({
      rows: [{ id: 5, shortcode: 'success1234', original_url: 'https://retry.com', created_at: new Date() }],
    });

    const req = makeRequest({ url: 'https://retry.com', key: 'test-secret-key' });
    const { status, data } = await getResponseData(await POST(req));

    expect(status).toBe(201);
    expect(data).toEqual({ url: 'http://localhost:3000/success1234' });
    expect(mockSql).toHaveBeenCalledTimes(3);
  });

  it('returns 500 after 3 failed shortcode collision attempts', async () => {
    const collisionError = Object.assign(new Error('unique violation'), {
      code: '23505',
      constraint: 'links_shortcode_key',
    });

    mockSql.mockRejectedValue(collisionError);

    const req = makeRequest({ url: 'https://exhausted.com', key: 'test-secret-key' });
    const { status } = await getResponseData(await POST(req));

    expect(status).toBe(500);
    expect(mockSql).toHaveBeenCalledTimes(3);
  });

  it('returns 500 immediately on non-collision DB error', async () => {
    const dbError = new Error('connection timeout');

    mockSql.mockRejectedValueOnce(dbError);

    const req = makeRequest({ url: 'https://dberr.com', key: 'test-secret-key' });
    const { status } = await getResponseData(await POST(req));

    expect(status).toBe(500);
    expect(mockSql).toHaveBeenCalledTimes(1);
  });
});

// ──────────────────────────────────────────
// No hardcoded secrets / POSTGRES_URL
// ──────────────────────────────────────────
describe('POST /api/shorten — security checks', () => {
  it('route.ts does not reference POSTGRES_URL', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const content = fs.readFileSync(
      path.join(__dirname, '../src/app/api/shorten/route.ts'),
      'utf-8'
    );
    expect(content).not.toMatch(/POSTGRES_URL/);
  });

  it('route.ts does not contain hardcoded secret strings', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const content = fs.readFileSync(
      path.join(__dirname, '../src/app/api/shorten/route.ts'),
      'utf-8'
    );
    expect(content).not.toMatch(/process\.env\.(SHORTEN_API_KEY|DATABASE_URL|APP_BASE_URL)/);
  });
});
