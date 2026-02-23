import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Internal Lead Enrichment',
  description: 'Lead import, enrichment, and export pipeline',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
