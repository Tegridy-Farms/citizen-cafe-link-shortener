/**
 * Client-side URL validation used by ShortenForm before calling the API.
 * Mirrors the server-side Zod schema constraint: URL must start with http:// or https://.
 */
export function isValidHttpUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}
