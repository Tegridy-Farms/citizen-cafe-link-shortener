import type { Metadata } from 'next';
import { PageShell } from '@/components/PageShell';
import { BrandHeader } from '@/components/BrandHeader';
import { NotFoundPage } from '@/components/NotFoundPage';

export const metadata: Metadata = {
  title: 'Link Not Found — Citizen Cafe TLV',
};

export default function NotFound() {
  return (
    <PageShell variant="error">
      <BrandHeader variant="minimal" />
      <NotFoundPage />
    </PageShell>
  );
}
