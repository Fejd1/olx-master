// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Layout from '@/components/shared/Layout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OLX Monitor - Znajdź najlepsze okazje',
  description: 'Monitoruj i analizuj okazje na platformie OLX',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className={inter.className}>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
