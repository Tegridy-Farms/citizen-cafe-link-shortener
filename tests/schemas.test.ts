/**
 * TDD tests for src/lib/schemas.ts
 * Covers acceptance criterion #5 (R-003 validation logic).
 */
import { ShortenRequestSchema, ShortenResponseSchema } from '../src/lib/schemas';

describe('ShortenRequestSchema', () => {
  it('accepts a valid https URL and key', () => {
    const result = ShortenRequestSchema.safeParse({
      url: 'https://example.com',
      key: 'abc',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid http URL and key', () => {
    const result = ShortenRequestSchema.safeParse({
      url: 'http://example.com/path?q=1',
      key: 'my-key',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-URL string', () => {
    const result = ShortenRequestSchema.safeParse({
      url: 'not-a-url',
      key: 'abc',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty URL', () => {
    const result = ShortenRequestSchema.safeParse({
      url: '',
      key: 'abc',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a URL without http/https scheme', () => {
    const result = ShortenRequestSchema.safeParse({
      url: 'ftp://example.com',
      key: 'abc',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing url field', () => {
    const result = ShortenRequestSchema.safeParse({ key: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects missing key field', () => {
    const result = ShortenRequestSchema.safeParse({ url: 'https://example.com' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty key', () => {
    const result = ShortenRequestSchema.safeParse({
      url: 'https://example.com',
      key: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('ShortenResponseSchema', () => {
  it('accepts a valid short URL response', () => {
    const result = ShortenResponseSchema.safeParse({
      url: 'https://short.example.com/abc123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing url field', () => {
    const result = ShortenResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

/**
 * Route-level contract stubs — verify the response shape { url: string }
 * that POST /api/shorten returns on success (R-001, R-004).
 */
describe('ShortenResponseSchema — route contract (AC1 shape)', () => {
  it('validates the 201 response shape returned by POST /api/shorten', () => {
    // The API MUST return { url: "<APP_BASE_URL>/<shortcode>" } — not a raw string
    const result = ShortenResponseSchema.safeParse({
      url: 'http://localhost:3000/abcde12345',
    });
    expect(result.success).toBe(true);
  });

  it('rejects { shortUrl: string } — wrong field name', () => {
    const result = ShortenResponseSchema.safeParse({ shortUrl: 'http://localhost:3000/abc' });
    expect(result.success).toBe(false);
  });

  it('rejects a raw string response — API must return object', () => {
    const result = ShortenResponseSchema.safeParse('http://localhost:3000/abc');
    expect(result.success).toBe(false);
  });

  it('rejects an array response', () => {
    const result = ShortenResponseSchema.safeParse(['http://localhost:3000/abc']);
    expect(result.success).toBe(false);
  });
});
