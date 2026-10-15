import type { ReactNode } from 'react'
import { display, panelMono, panelSans } from '@/shared/design/fonts'
import { VIEWPORT } from '@/shared/config/viewport'
import '../globals.css'
import { ValidacionDeFormularios } from '@/shared/design/ui/ValidacionDeFormularios'
import { IdiomaProvider } from '@/shared/i18n/idioma-navegador'
import { idiomaDeLaPeticion, tr } from '@/shared/i18n/idioma-servidor'

export const viewport = VIEWPORT

// Lo que ve un proveedor con su enlace: sin panel, sin cuenta y fuera de los buscadores.
export async function generateMetadata() {
  const t = await tr()
  return { title: t('Tu parte del día · Luxury Atelier', 'Your part of the day · Luxury Atelier'), robots: { index: false, follow: false } }
}

export default async function VendorLayout({ children }: { children: ReactNode }) {
  const locale = await idiomaDeLaPeticion()
  return (
    <html lang={locale} className={`${display.variable} ${panelSans.variable} ${panelMono.variable}`} suppressHydrationWarning>
      <body><IdiomaProvider locale={locale}>
        <ValidacionDeFormularios />
        <div className="panel-sin-mono min-h-dvh bg-bg px-4 py-8">{children}</div>
      </IdiomaProvider></body>
    </html>
  )
}
