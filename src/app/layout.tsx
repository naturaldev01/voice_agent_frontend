import type { Metadata } from 'next'
import { Sora } from 'next/font/google'
import './globals.css'

const sora = Sora({ 
  subsets: ['latin'],
  variable: '--font-sora',
})

export const metadata: Metadata = {
  title: 'Natural Clinic - AI Voice Agent',
  description: 'Speak with our AI assistant about medical treatments',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={sora.variable}>
      <body className="antialiased">{children}</body>
    </html>
  )
}

