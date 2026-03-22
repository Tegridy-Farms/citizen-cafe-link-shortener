/**
 * Zod schemas for API request/response validation.
 * Implements R-003: all POST /api/shorten bodies are validated here before touching the DB.
 */
import { z } from 'zod';

/**
 * Validates the body sent to POST /api/shorten.
 * - url: must be a valid http or https URL (not empty, not ftp, not relative)
 * - key: must be a non-empty string (compared server-side against SHORTEN_API_KEY)
 */
export const ShortenRequestSchema = z.object({
  url: z
    .string()
    .min(1, 'URL is required')
    .url('Must be a valid URL')
    .refine(
      (val) => val.startsWith('http://') || val.startsWith('https://'),
      'URL must start with http:// or https://'
    ),
  key: z.string().min(1, 'API key is required'),
});

/**
 * Shape returned by POST /api/shorten on success (200 or 201).
 */
export const ShortenResponseSchema = z.object({
  url: z.string().url(),
});

export type ShortenRequest = z.infer<typeof ShortenRequestSchema>;
export type ShortenResponse = z.infer<typeof ShortenResponseSchema>;
