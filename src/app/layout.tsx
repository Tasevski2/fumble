import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Providers } from '@/components/providers/WagmiProvider'

const nippo = localFont({
  src: [
    {
      path: '../../public/fonts/Nippo-Extralight.otf',
      weight: '200',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Nippo-Light.otf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Nippo-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Nippo-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Nippo-Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-nippo',
  display: 'swap',
})

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
      <body className={`${nippo.variable} font-nippo`}>
        <Providers>
          <div className="min-h-screen bg-primary">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}