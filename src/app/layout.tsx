import type { ReactNode } from 'react'
import { display, sans } from '@/shared/design/fonts'
import './globals.css'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
