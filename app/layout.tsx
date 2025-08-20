import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthSync from './AuthSync'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Restaurant Platform',
  description: 'AI-powered restaurant ordering and chat platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthSync />
        {children}
      </body>
    </html>
  )
}
