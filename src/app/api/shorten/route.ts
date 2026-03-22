/**
 * POST /api/shorten — URL shortening route handler.
 *
 * Auth note: The API key is read from the JSON request body only (not from the
 * Authorization header). Per PRD open question 1, Make/Integromat sends the key
 * in the body field "key". If header auth is needed in the future, extend this
 * handler to check both locations; do NOT pre-implement header auth.
 */
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { sql } from '@/lib/db';
import { env } from '@/lib/env';
import { ShortenRequestSchema } from '@/lib/schemas';
import type { LinkRecord } from '@/types';

const MAX_SHORTCODE_ATTEMPTS = 3;

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = ShortenRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const { url: originalUrl, key } = parsed.data;

  // 2. Authenticate — body-only key check (see auth note above)
  if (key !== env.SHORTEN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3. Deduplication insert with shortcode-collision retry (up to 3 attempts)
  for (let attempt = 0; attempt < MAX_SHORTCODE_ATTEMPTS; attempt++) {
    const shortcode = nanoid(10);

    try {
      const result = await sql<LinkRecord>`
        INSERT INTO links (shortcode, original_url)
        VALUES (${shortcode}, ${originalUrl})
        ON CONFLICT (original_url) DO NOTHING
        RETURNING *
      `;

      if (result.rows.length > 0) {
        // 4a. New record inserted → 201
        return NextResponse.json(
          { url: `${env.APP_BASE_URL}/${result.rows[0].shortcode}` },
          { status: 201 }
        );
      }

      // 4b. original_url already exists (ON CONFLICT fired) → fetch existing → 200
      const existing = await sql<LinkRecord>`
        SELECT * FROM links WHERE original_url = ${originalUrl}
      `;
      return NextResponse.json(
        { url: `${env.APP_BASE_URL}/${existing.rows[0].shortcode}` },
        { status: 200 }
      );
    } catch (error) {
      // Retry only on shortcode unique-constraint violation (postgres code 23505)
      const pgErr = error as { code?: string; constraint?: string };
      if (pgErr.code === '23505') {
        // If the conflict is on original_url, it should have been handled by
        // ON CONFLICT above; any 23505 here must be a shortcode collision.
        if (attempt < MAX_SHORTCODE_ATTEMPTS - 1) {
          continue;
        }
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
