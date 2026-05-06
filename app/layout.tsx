import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'X Clone',
  description: 'シンプルな X もどき',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-black text-white min-h-screen" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
