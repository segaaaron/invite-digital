import { Suspense, type ReactNode } from 'react'
import { BarraDeCarga } from '@/shared/design/ui/BarraDeCarga'
import { display, panelMono, panelSans } from '@/shared/design/fonts'
import { VIEWPORT } from '@/shared/config/viewport'
import '../globals.css'
import { CapturaDeFallos } from '@/shared/design/ui/CapturaDeFallos'
import { PortadasQueEsperan } from '@/modules/events/ui/themes/kit/PortadasQueEsperan'

export const viewport = VIEWPORT

// El panel no negocia idioma: lo usa el atelier y está en español.
//
// Instalable: con el manifiesto el panel se añade a la pantalla de inicio y abre como app. En iPhone es
// la única forma de recibir notificaciones push (iOS 16.4+); en Android y computadoras, además, se ve mejor.
export const metadata = {
  title: 'Panel · Luxury Atelier',
  robots: { index: false, follow: false },
  manifest: '/panel.webmanifest',
  appleWebApp: { capable: true, title: 'Luxury Atelier', statusBarStyle: 'black-translucent' as const },
}

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${panelSans.variable} ${panelMono.variable}`} suppressHydrationWarning>
      <body>
        <CapturaDeFallos />
        <PortadasQueEsperan />
        {/* El `Suspense` envuelve solo la barra (lee `useSearchParams`), nunca las páginas: alrededor
            de ellas rompería sus `notFound()`. */}
        <Suspense fallback={null}>
          <BarraDeCarga />
        </Suspense>
        {/* `div`, no `main`: la carcasa del panel emite su propio `main` y dos anidados
            dejan la página con dos regiones principales, que es un error de HTML y hace
            ambiguo el salto al contenido para quien navega con lector de pantalla. */}
        <div className="panel-sin-mono min-h-dvh bg-bg-top">{children}</div>
      </body>
    </html>
  )
}
