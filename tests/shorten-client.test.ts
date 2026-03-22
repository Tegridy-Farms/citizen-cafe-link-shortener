/**
 * Unit tests for src/lib/api/shorten.ts
 * Covers the typed fetch wrapper used by the Stage 3 homepage form.
 */

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { postShorten } from '../src/lib/api/shorten';

function mockResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}

describe('postShorten', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls POST /api/shorten with correct headers and body', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ url: 'http://localhost:3000/abc123' }, 201));

    await postShorten('https://example.com', 'my-key');

    expect(mockFetch).toHaveBeenCalledWith('/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com', key: 'my-key' }),
    });
  });

  it('returns ShortenResponse on 201', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ url: 'http://localhost:3000/newcode1' }, 201));

    const result = await postShorten('https://example.com', 'key');
    expect(result).toEqual({ url: 'http://localhost:3000/newcode1' });
  });

  it('returns ShortenResponse on 200 (dedup)', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ url: 'http://localhost:3000/exist123' }, 200));

    const result = await postShorten('https://example.com', 'key');
    expect(result).toEqual({ url: 'http://localhost:3000/exist123' });
  });

  it('throws with error message on 401', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ error: 'Unauthorized' }, 401));

    await expect(postShorten('https://example.com', 'bad-key')).rejects.toThrow('Unauthorized');
  });

  it('throws with error message on 400', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({ error: 'Invalid URL' }, 400));

    await expect(postShorten('not-a-url', 'key')).rejects.toThrow('Invalid URL');
  });

  it('throws fallback message when error field is absent', async () => {
    mockFetch.mockReturnValueOnce(mockResponse({}, 500));

    await expect(postShorten('https://example.com', 'key')).rejects.toThrow(
      'Failed to shorten URL'
    );
  });
});
