import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { SupabaseProvider } from '@/lib/supabase-provider'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Job Tracker - Track Your Job Applications',
  description: 'Automatically track and manage your job applications across all major job sites. Get insights, analytics, and never lose track of your job search progress.',
  keywords: ['job tracker', 'job applications', 'job search', 'career', 'employment', 'linkedin', 'indeed'],
  authors: [{ name: 'Job Tracker Team' }],
  creator: 'Job Tracker',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://job-tracker-user-portal-omega.vercel.app',
    title: 'Job Tracker - Track Your Job Applications',
    description: 'Automatically track and manage your job applications across all major job sites.',
    siteName: 'Job Tracker',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Job Tracker - Track Your Job Applications',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Job Tracker - Track Your Job Applications',
    description: 'Automatically track and manage your job applications across all major job sites.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${inter.className} min-h-screen bg-gray-50 dark:bg-gray-900 antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SupabaseProvider>
            <div className="flex min-h-screen flex-col">
              {children}
            </div>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--toast-bg)',
                  color: 'var(--toast-color)',
                  border: '1px solid var(--toast-border)',
                },
                success: {
                  style: {
                    background: '#ecfdf5',
                    color: '#065f46',
                    border: '1px solid #10b981',
                  },
                },
                error: {
                  style: {
                    background: '#fef2f2',
                    color: '#991b1b',
                    border: '1px solid #ef4444',
                  },
                },
              }}
            />
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}