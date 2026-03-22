import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Citizen Cafe TLV — Link Shortener',
  description: 'Internal link shortener for Citizen Cafe Tel Aviv.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
