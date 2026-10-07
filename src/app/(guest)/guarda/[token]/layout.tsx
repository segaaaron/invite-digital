import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { display, sans } from '@/shared/design/fonts'
import { VIEWPORT } from '@/shared/config/viewport'
import { leerSaveTheDate } from './datos'
import '../../../globals.css'
import { ValidacionDeFormularios } from '@/shared/design/ui/ValidacionDeFormularios'

export const viewport = VIEWPORT
export const dynamic = 'force-dynamic'

/** La raíz de `/guarda/<enlace>`: el idioma, el del evento. Enlace desconocido o quitado: 404. */
export default async function SaveTheDateLayout({ children, params }: { children: ReactNode; params: Promise<{ token: string }> }) {
  const datos = await leerSaveTheDate((await params).token)
  if (datos === null) notFound()
  return (
    <html className={`${sans.variable} ${display.variable}`} lang={datos.event.locale}>
      <body className="bg-ink antialiased">
        <ValidacionDeFormularios />{children}</body>
    </html>
  )
}
