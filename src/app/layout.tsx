import type { Metadata } from 'next';
import { Assistant } from 'next/font/google';
import './globals.css';

const assistant = Assistant({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-assistant',
});

export const metadata: Metadata = {
  title: 'Citizen Cafe TLV — Link Shortener',
  description: 'Internal link shortener for Citizen Cafe Tel Aviv.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={assistant.variable}>
      <body className={`${assistant.className} antialiased`}>{children}</body>
    </html>
  );
}
