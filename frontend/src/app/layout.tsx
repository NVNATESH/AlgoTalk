import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { AuthHydrator } from '@/components/AuthHydrator';
import { PomodoroProvider } from '@/components/pomodoro/PomodoroProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'LearnHub — Collaborative Learning + Competitive Programming',
  description: 'AI-powered collaborative learning, group challenges, and cross-platform CP intelligence.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">
        <AuthHydrator />
        <PomodoroProvider />
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(26,26,38,0.9)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#e5e7eb',
            },
          }}
        />
      </body>
    </html>
  );
}
