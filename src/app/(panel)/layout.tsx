import type { ReactNode } from 'react'
import { display, sans } from '@/shared/design/fonts'
import '../globals.css'

// El panel no negocia idioma: lo usa el atelier y está en español.
export const metadata = { title: 'Panel · InvitePremium', robots: { index: false, follow: false } }

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>
        <main className="min-h-dvh bg-bg-top">{children}</main>
      </body>
    </html>
  )
}
