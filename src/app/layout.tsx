import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fumble - Clean Your Crypto Wallet',
  description: 'Swipe. Clean. Ascend. Remove trash tokens from your wallet.',
  manifest: '/manifest.webmanifest',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: '#F9C400',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Fumble',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-primary">
          {children}
        </div>
      </body>
    </html>
  )
}