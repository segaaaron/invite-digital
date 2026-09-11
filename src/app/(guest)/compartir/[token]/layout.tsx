import type { ReactNode } from 'react'
import { display, sans } from '@/shared/design/fonts'
import { SIN_ZOOM } from '@/shared/config/viewport'
import '../../../globals.css'

export const viewport = SIN_ZOOM

export const metadata = { robots: { index: false, follow: false } }

// Raíz de su rama. El panel del cliente es del atelier boliviano: siempre en español,
// aunque el evento se sirva en inglés a los invitados.
export default function ClientShareLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
