import type { Metadata } from 'next';
import { Noto_Serif_SC } from 'next/font/google';
import '../index.css';

const notoSerifSC = Noto_Serif_SC({
  subsets: ['chinese-simplified'],
  weight: ['400', '700'],
  variable: '--font-hanzi',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Belajar Mandarin',
  description: 'Baca teks Mandarin dengan anotasi bahasa Indonesia',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={notoSerifSC.variable}>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
