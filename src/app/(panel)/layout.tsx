import { Suspense, type ReactNode } from 'react'
import { BarraDeCarga } from '@/shared/design/ui/BarraDeCarga'
import { display, panelDisplay, panelMono, panelSans } from '@/shared/design/fonts'
import { VIEWPORT } from '@/shared/config/viewport'
import '../globals.css'
import { CapturaDeFallos } from '@/shared/design/ui/CapturaDeFallos'
import { ValidacionDeFormularios } from '@/shared/design/ui/ValidacionDeFormularios'
import { PortadasQueEsperan } from '@/modules/events/ui/themes/kit/PortadasQueEsperan'
import { IdiomaProvider } from '@/shared/i18n/idioma-navegador'
import { idiomaDeLaPeticion } from '@/shared/i18n/idioma-servidor'

export const viewport = VIEWPORT

// El panel habla el idioma de quien lo usa (14 oct): el que eligió en Mi cuenta o el del aparato (`idiomaDeLaPeticion`).
//
// Instalable: con el manifiesto el panel se añade a la pantalla de inicio y abre como app. En iPhone es
// la única forma de recibir notificaciones push (iOS 16.4+); en Android y computadoras, además, se ve mejor.
export const metadata = {
  title: 'Panel · Luxury Atelier',
  robots: { index: false, follow: false },
  manifest: '/panel.webmanifest',
  appleWebApp: { capable: true, title: 'Luxury Atelier', statusBarStyle: 'black-translucent' as const },
}

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const locale = await idiomaDeLaPeticion()
  return (
    <html lang={locale} className={`${display.variable} ${panelDisplay.variable} ${panelSans.variable} ${panelMono.variable}`} suppressHydrationWarning>
      <body><IdiomaProvider locale={locale}>
        <CapturaDeFallos />
        <ValidacionDeFormularios />
        {/* El `Suspense` envuelve solo la barra (lee `useSearchParams`), nunca las páginas: alrededor
            de ellas rompería sus `notFound()`. */}
        <Suspense fallback={null}>
          <BarraDeCarga esqueleto />
        </Suspense>
        {/* `div`, no `main`: la carcasa del panel emite su propio `main` y dos anidados
            dejan la página con dos regiones principales, que es un error de HTML y hace
            ambiguo el salto al contenido para quien navega con lector de pantalla. */}
        <div className="panel-sin-mono min-h-dvh bg-bg-top">{children}</div>
        <PortadasQueEsperan />
      </IdiomaProvider></body>
    </html>
  )
}
