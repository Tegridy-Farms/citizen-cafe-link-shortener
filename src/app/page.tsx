import type { Metadata } from 'next';
import { PageShell } from '@/components/PageShell';
import { BrandHeader } from '@/components/BrandHeader';
import { ShortenForm } from '@/components/ShortenForm';

export const metadata: Metadata = {
  title: 'Citizen Cafe TLV — Link Shortener',
};

export default function HomePage() {
  return (
    <PageShell variant="centered">
      <BrandHeader variant="full" />
      <ShortenForm />
    </PageShell>
  );
}
