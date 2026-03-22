/**
 * RSC redirect page — GET /<shortcode>
 * Looks up the shortcode in the DB and issues a 302 redirect to the original URL.
 * If the shortcode does not exist, calls notFound() to render the 404 boundary (R-006).
 */
import { redirect, notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import type { LinkRecord } from '@/types';

interface Props {
  params: { shortcode: string };
}

export default async function ShortcodePage({ params }: Props) {
  const { shortcode } = params;

  const result = await sql<Pick<LinkRecord, 'original_url'>>`
    SELECT original_url FROM links WHERE shortcode = ${shortcode}
  `;

  if (result.rows.length === 0) {
    notFound();
  }

  redirect(result.rows[0].original_url);
}
