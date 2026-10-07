import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { events, guests } from '@/app/composition/container'
import { display, sans } from '@/shared/design/fonts'
import { VIEWPORT } from '@/shared/config/viewport'
import { isErr } from '@/shared/result'
import '../../../globals.css'
import { ValidacionDeFormularios } from '@/shared/design/ui/ValidacionDeFormularios'

export const viewport = VIEWPORT
export const metadata = { robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/**
 * La raíz de `/abierta/<enlace>`: el idioma es el del evento. Enlace desconocido o quitado: 404,
 * sin decir de qué evento era.
 */
export default async function EnlaceGeneralLayout({ children, params }: { children: ReactNode; params: Promise<{ token: string }> }) {
  const eventId = await guests.general.resolver((await params).token)
  if (eventId === null) notFound()
  const evento = await events.getByIdUnscoped(eventId)
  if (isErr(evento)) notFound()
  return (
    <html className={`${sans.variable} ${display.variable}`} lang={evento.value.locale}>
      <body className="bg-bg antialiased">
        <ValidacionDeFormularios />{children}</body>
    </html>
  )
}
