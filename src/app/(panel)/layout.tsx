import type { ReactNode } from 'react'
import { display, panelMono, panelSans } from '@/shared/design/fonts'
import { SIN_ZOOM } from '@/shared/config/viewport'
import '../globals.css'

export const viewport = SIN_ZOOM

// El panel no negocia idioma: lo usa el atelier y está en español.
export const metadata = { title: 'Panel · InvitePremium', robots: { index: false, follow: false } }

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${panelSans.variable} ${panelMono.variable}`} suppressHydrationWarning>
      <body>
        {/* `div`, no `main`: la carcasa del panel emite su propio `main` y dos anidados
            dejan la página con dos regiones principales, que es un error de HTML y hace
            ambiguo el salto al contenido para quien navega con lector de pantalla. */}
        <div className="min-h-dvh bg-bg-top">{children}</div>
      </body>
    </html>
  )
}
