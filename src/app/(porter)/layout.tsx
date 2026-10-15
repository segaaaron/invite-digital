import type { ReactNode } from 'react'
import { display, panelMono, panelSans } from '@/shared/design/fonts'
import { VIEWPORT } from '@/shared/config/viewport'
import '../globals.css'
import { ValidacionDeFormularios } from '@/shared/design/ui/ValidacionDeFormularios'
import { IdiomaProvider } from '@/shared/i18n/idioma-navegador'
import { idiomaDeLaPeticion } from '@/shared/i18n/idioma-servidor'

export const viewport = VIEWPORT

// La puerta del portero: sin panel, sin idioma que negociar y fuera de los buscadores.
export const metadata = { title: 'Puerta · Luxury Atelier', robots: { index: false, follow: false } }

export default async function PorterLayout({ children }: { children: ReactNode }) {
  const locale = await idiomaDeLaPeticion()
  return (
    <html lang={locale} className={`${display.variable} ${panelSans.variable} ${panelMono.variable}`} suppressHydrationWarning>
      <body><IdiomaProvider locale={locale}>
        <ValidacionDeFormularios />
        <div className="panel-sin-mono min-h-dvh bg-shell-deep">{children}</div>
      </IdiomaProvider></body>
    </html>
  )
}
