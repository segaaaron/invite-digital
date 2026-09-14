import type { ReactNode } from 'react'
import { display, panelMono, panelSans } from '@/shared/design/fonts'
import { VIEWPORT } from '@/shared/config/viewport'
import '../globals.css'

export const viewport = VIEWPORT

// La puerta del portero: sin panel, sin idioma que negociar y fuera de los buscadores.
export const metadata = { title: 'Puerta · Luxury Atelier', robots: { index: false, follow: false } }

export default function PorterLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${panelSans.variable} ${panelMono.variable}`} suppressHydrationWarning>
      <body>
        <div className="min-h-dvh bg-shell-deep">{children}</div>
      </body>
    </html>
  )
}
