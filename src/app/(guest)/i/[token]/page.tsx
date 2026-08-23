import { notFound } from 'next/navigation'
import { guestbook, plans, registry } from '@/app/composition/container'
import { PassQr } from '@/modules/checkin/ui/PassQr'
import { acceptsResponses } from '@/modules/events'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { GuestReply } from '@/modules/guestbook'
import { invitationUrl } from '@/modules/guests'
import { GuestRegistry } from '@/modules/registry/ui/GuestRegistry'
import { RsvpForm } from '@/modules/rsvp/ui/RsvpForm'
import { env } from '@/shared/config/env'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { isErr } from '@/shared/result'
import { resolveInvitation } from './invitation'
import { ViewBeacon } from '@/modules/analytics/ui/ViewBeacon'

// El estado del RSVP cambia con cada respuesta: esta página no se cachea.
export const dynamic = 'force-dynamic'

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitation = await resolveInvitation(token)

  if (isErr(invitation)) {
    if (invitation.error.kind === 'storage_failure') throw new Error(invitation.error.detail)
    notFound()
  }

  const { group, event, latest } = invitation.value
  const dictionary = getDictionary(event.locale).invitation
  const registryDictionary = getDictionary(event.locale).registry
  const guestbookDictionary = getDictionary(event.locale).guestbook

  // La mesa de regalos es opcional: si la lectura falla, la invitación sigue en pie sin
  // ella. Que la base de regalos no responda no puede impedir confirmar la asistencia.
  const mesa = await registry.list(event.id)
  // Si la mesa de regalos sigue incluida en el plan. Se resuelve aquí y entra en el
  // componente como argumento: `registry` no importa `plans`.
  //
  // Cerrada, la lista se congela pero se sigue viendo: ocultarla haría que quien ya
  // reservó la cafetera creyera que no reservó nada y la comprase dos veces.
  const mesaAbierta = !isErr(await plans.requireFeature(event.id, 'registry'))
  // La respuesta de los anfitriones a lo que este grupo escribió. Nunca falla hacia
  // arriba: sin respuesta y con la base caída se ven igual —sin nada—, y la invitación
  // se abre en los dos casos.
  const respuestaDelAtelier = await guestbook.replyForGroup(group.id)
  const { Component: Theme } = themeFor(event.themeKey)
  const abierto = acceptsResponses(event, new Date().toISOString().slice(0, 10))

  return (
    <Theme event={event}>
      {/* Cuenta la visita. No pinta nada y no estorba a quien vino a ver la invitación. */}
      <ViewBeacon kind="guest" token={token} />
      <p className="text-[13px] text-ink-soft">{`${group.label} · ${dictionary.seatsLabel}: ${group.seats}`}</p>

      {abierto ? (
        <>
          <h2 className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">{dictionary.title}</h2>
          <RsvpForm dictionary={dictionary} previous={latest} seats={group.seats} token={token} />
        </>
      ) : (
        <p className="text-[14px] leading-[1.7] text-ink-soft">{dictionary.closed}</p>
      )}

      {isErr(mesa) ? null : (
        <GuestRegistry
          currency={event.currency}
          dictionary={registryDictionary}
          funds={mesa.value.funds}
          gifts={mesa.value.gifts}
          groupId={group.id}
          open={mesaAbierta}
          token={token}
        />
      )}

      <GuestReply dictionary={guestbookDictionary} reply={respuestaDelAtelier} />

      <PassQr
        url={invitationUrl(token, env.SITE_URL)}
        label={group.label}
        labels={{ title: dictionary.passTitle, hint: dictionary.passHint, alt: dictionary.passAlt }}
      />
    </Theme>
  )
}
