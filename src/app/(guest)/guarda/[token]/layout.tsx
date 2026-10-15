import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { display, sans } from '@/shared/design/fonts'
import { VIEWPORT } from '@/shared/config/viewport'
import { leerSaveTheDate } from './datos'
import '../../../globals.css'
import { ValidacionDeFormularios } from '@/shared/design/ui/ValidacionDeFormularios'
import { IdiomaProvider } from '@/shared/i18n/idioma-navegador'

export const viewport = VIEWPORT
export const dynamic = 'force-dynamic'

/** La raíz de `/guarda/<enlace>`: el idioma, el del evento. Enlace desconocido o quitado: 404. */
export default async function SaveTheDateLayout({ children, params }: { children: ReactNode; params: Promise<{ token: string }> }) {
  const datos = await leerSaveTheDate((await params).token)
  if (datos === null) notFound()
  return (
    <html className={`${sans.variable} ${display.variable}`} lang={datos.event.locale}>
      <body className="bg-ink antialiased"><IdiomaProvider locale={datos.event.locale}>
        <ValidacionDeFormularios />{children}</IdiomaProvider></body>
    </html>
  )
}
