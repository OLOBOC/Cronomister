import type { Metadata, Viewport } from 'next';
import './globals.css';
import { APP_CONFIG } from '@/config/appConfig';

export const metadata: Metadata = {
  title: `${APP_CONFIG.NAME} · ${APP_CONFIG.CLUB_NAME}`,
  description: `${APP_CONFIG.SUBTITLE} para entrenadores y delegados de fútbol base en Mareo.`,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_CONFIG.NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#c01c1c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="antialiased selection:bg-[var(--red)] selection:text-white">
        {children}
      </body>
    </html>
  );
}
