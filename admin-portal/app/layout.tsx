import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { SupabaseProvider } from '@/lib/supabase-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { AdminAuthProvider } from '@/lib/admin-auth-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Job Tracker Admin - System Analytics & Management',
  description: 'Administrative dashboard for Job Tracker system. Monitor users, applications, and system analytics.',
  keywords: ['admin', 'dashboard', 'analytics', 'job tracker', 'management'],
  authors: [{ name: 'Job Tracker Admin Team' }],
  creator: 'Job Tracker',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://job-tracker-admin-portal.vercel.app',
    title: 'Job Tracker Admin Portal',
    description: 'Administrative dashboard for Job Tracker system management.',
    siteName: 'Job Tracker Admin',
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
        <link rel="icon" href="/favicon-admin.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-admin.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-admin-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-admin-16x16.png" />
        <link rel="manifest" href="/site-admin.webmanifest" />
        <meta name="theme-color" content="#dc2626" />
        <meta name="msapplication-TileColor" content="#dc2626" />
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
            <AdminAuthProvider>
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
            </AdminAuthProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}