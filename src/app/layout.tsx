import type { Metadata, Viewport } from 'next';
import './globals.css';

const brand = process.env.NEXT_PUBLIC_BRAND_NAME || 'Happy';

export const metadata: Metadata = {
  title: `ส่งคลิป — ${brand}`,
  description: `ระบบรับผลงานนายหน้า ${brand} — ส่งคลิปและเช็กสถานะได้ที่เดียว`,
};

export const viewport: Viewport = {
  themeColor: '#603b31', // [BRAND] Brown
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Kanit:wght@200;300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
