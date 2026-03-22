/**
 * Typed client-side fetch wrapper for POST /api/shorten.
 * Used by the homepage form (Stage 3) to shorten URLs.
 * Returns ShortenResponse { url: string } on success, throws on 4xx/5xx.
 */
import type { ShortenResponse } from '@/types';

export async function postShorten(url: string, key: string): Promise<ShortenResponse> {
  const response = await fetch('/api/shorten', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, key }),
  });

  const data = (await response.json()) as ShortenResponse | { error: string };

  if (!response.ok) {
    throw new Error('error' in data ? data.error : 'Failed to shorten URL');
  }

  return data as ShortenResponse;
}
