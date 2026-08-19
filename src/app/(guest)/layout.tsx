import type { ReactNode } from 'react'
import { display, sans } from '@/shared/design/fonts'
import '../globals.css'

export const metadata = { robots: { index: false, follow: false } }

// `lang` se fija aquí en español porque la mayoría de los eventos son bolivianos; la
// página del evento lo corrige cuando `events.locale` dice otra cosa.
export default function GuestLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
