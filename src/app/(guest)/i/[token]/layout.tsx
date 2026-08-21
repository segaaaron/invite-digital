import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { display, sans } from '@/shared/design/fonts'
import { isErr } from '@/shared/result'
import { resolveInvitation } from './invitation'
import '../../../globals.css'

export const metadata = { robots: { index: false, follow: false } }

// Esta es la raíz de su rama: el grupo (guest) no lleva layout propio a propósito. Un
// layout de grupo que emitiera <html> quedaría por fuera de este y el idioma del evento
// no llegaría al atributo lang.

export default async function InvitationLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const invitation = await resolveInvitation(token)

  // Token desconocido y token revocado responden lo mismo: 404. Distinguirlos
  // confirmaría al atacante que el token existe. La caída de la base sí se distingue:
  // la lanza para que el límite de error responda 503.
  if (isErr(invitation)) {
    if (invitation.error.kind === 'storage_failure') throw new Error(invitation.error.detail)
    notFound()
  }

  return (
    <html lang={invitation.value.event.locale} className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
