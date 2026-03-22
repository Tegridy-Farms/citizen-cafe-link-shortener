/**
 * Shared TypeScript types used across server and client code.
 */

/** Mirrors the `links` table row returned from the DB. */
export interface LinkRecord {
  id: number;
  shortcode: string;
  original_url: string;
  created_at: Date;
}

/** Success response shape from POST /api/shorten. */
export interface ShortenResponse {
  url: string;
}

/** Error response shape from POST /api/shorten on 4xx/5xx. */
export interface ErrorResponse {
  error: string;
}
