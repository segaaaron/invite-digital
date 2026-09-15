import type { ReactNode } from 'react'
import { display, panelMono, panelSans } from '@/shared/design/fonts'
import { VIEWPORT } from '@/shared/config/viewport'
import '../globals.css'

export const viewport = VIEWPORT

// Lo que ve un proveedor con su enlace: sin panel, sin cuenta y fuera de los buscadores.
export const metadata = { title: 'Tu parte del día · Luxury Atelier', robots: { index: false, follow: false } }

export default function VendorLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${panelSans.variable} ${panelMono.variable}`} suppressHydrationWarning>
      <body>
        <div className="min-h-dvh bg-bg px-4 py-8">{children}</div>
      </body>
    </html>
  )
}
