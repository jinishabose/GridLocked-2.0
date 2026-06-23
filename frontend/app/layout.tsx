import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { DataLoader } from '@/components/providers/DataLoader';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';

export const metadata: Metadata = {
  title: 'GridLocked — Traffic Command & Intelligence Platform',
  description: 'Production-grade event-driven congestion forecasting, resource deployment, diversion planning, and predictive traffic intelligence for GridLock 2.0 developed by Code Crumbles.',
  keywords: 'traffic intelligence, congestion forecasting, Code Crumbles, event management, GridLock 2.0',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ThemeProvider>
          <DataLoader>
            <div className="app-layout" id="app-root">
              <Sidebar />
              <TopHeader />
              <main className="app-main">
                {children}
              </main>
            </div>
          </DataLoader>
        </ThemeProvider>
        {/* Scan-line CRT effect for command center aesthetic */}
        <div className="scan-overlay" aria-hidden="true" />
      </body>
    </html>
  );
}
