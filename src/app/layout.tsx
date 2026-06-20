import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Мафія — Ведучий',
  description: 'Система ведення гри в Мафію',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  )
}
