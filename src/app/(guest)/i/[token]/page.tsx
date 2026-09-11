import { notFound } from 'next/navigation'
import { events as eventos, guestbook, plans, registry } from '@/app/composition/container'
import { PassQr } from '@/modules/checkin/ui/PassQr'
import { acceptsResponses } from '@/modules/events'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { GuestReply } from '@/modules/guestbook'
import { invitationUrl } from '@/modules/guests'
import { GuestRegistry } from '@/modules/registry/ui/GuestRegistry'
import { GuestbookForm } from '@/modules/rsvp/ui/GuestbookForm'
import { RsvpForm } from '@/modules/rsvp/ui/RsvpForm'
import { env } from '@/shared/config/env'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { isErr } from '@/shared/result'
import { resolveInvitation } from './invitation'
import { ViewBeacon } from '@/modules/analytics/ui/ViewBeacon'
import { eventUnlocked } from '@/modules/events/actions'
import { EventPasswordGate } from '@/modules/events/ui/EventPasswordGate'

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

  // Evento protegido con contraseña: sin desbloquear no se enseña nada, ni el título.
  // Quien no la tiene no debe averiguar de qué boda se trata por tener el enlace.
  if (!(await eventUnlocked(event.id))) {
    return <EventPasswordGate token={token} />
  }
  const dictionary = getDictionary(event.locale).invitation
  const registryDictionary = getDictionary(event.locale).registry
  const guestbookDictionary = getDictionary(event.locale).guestbook
  const temasDictionary = getDictionary(event.locale).themes

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
  const definicion = themeFor(event.themeKey)
  const { Component: Theme } = definicion
  const abierto = acceptsResponses(event, new Date().toISOString().slice(0, 10))

  // El contenido rico que pinta el diseño, ya fusionado con el de muestra del tema: lo que
  // el atelier no haya escrito se ve con lo que traía el diseño, en vez de dejar un hueco.
  const contenido = await eventos.contentFor(event.id, definicion.defaultContent)

  return (
    <>
      {/* Cuenta la visita. No pinta nada, y se queda **fuera** del tema: un diseño no tiene
          por qué saber que la analítica existe. */}
      <ViewBeacon kind="guest" token={token} />

      <Theme
        content={contenido}
        dictionary={dictionary}
        event={event}
        guestInfo={{ label: group.label, seats: group.seats }}
        themes={temasDictionary}
        slots={{
          // A quién va dirigida y cuántos lugares tiene. Es dato nuestro —sale del
          // grupo—, y va en su propia ranura porque varios diseños lo pintan en una
          // tarjeta arriba del todo, que es donde el invitado lo busca.
          guest: (
            <p className="text-[13px]">{`${group.label} · ${dictionary.seatsLabel}: ${group.seats}`}</p>
          ),
          rsvp: abierto ? (
            <RsvpForm
              dictionary={dictionary}
              previous={latest}
              seats={group.seats}
              token={token}
              variant={definicion.rsvp}
            />
          ) : (
            <p className="text-[14px] leading-[1.7]">{dictionary.closed}</p>
          ),
          registry: isErr(mesa) ? null : (
            <GuestRegistry
              currency={event.currency}
              dictionary={registryDictionary}
              funds={mesa.value.funds}
              gifts={mesa.value.gifts}
              groupId={group.id}
              open={mesaAbierta}
              token={token}
            />
          ),
          // El libro de firmas: en los diseños de boda es su propia sección con su campo y
          // su «FIRMAR LIBRO»; en los de XV, solo la respuesta de los anfitriones.
          guestbook: (
            <>
              {definicion.rsvp === 'botones' ? (
                <GuestbookForm dictionary={dictionary} previous={latest} seats={group.seats} token={token} />
              ) : null}
              <GuestReply dictionary={guestbookDictionary} reply={respuestaDelAtelier} />
            </>
          ),
          // El botón de «Comparte tus fotos». Lleva a su propia pantalla y no abre un campo
          // aquí: subir fotos es volver varias veces a lo largo del día, y hacerlo desde
          // media invitación obliga a desplazarse hasta el bloque cada vez.
          photos: (
            <a
              className="inline-block rounded-[var(--radius-pill)] bg-gold px-5 py-3 font-mono text-[9px] font-bold tracking-[0.15em] text-[var(--color-on-gold)] uppercase"
              href={`/i/${token}/fotos`}
            >
              {dictionary.photosPick}
            </a>
          ),
          pass: (
            <>
              <PassQr
                label={group.label}
                labels={{ title: dictionary.passTitle, hint: dictionary.passHint, alt: dictionary.passAlt }}
                url={invitationUrl(token, env.SITE_URL)}
              />
              {/* El pase, a solas y a un toque. En la puerta, de noche y con gente detrás,
                  nadie se desplaza hasta el final de la invitación. */}
              <p className="mt-5 text-center">
                <a
                  className="inline-block rounded-[var(--radius-pill)] border border-line px-6 py-3 font-mono text-[10px] tracking-[var(--tracking-luxe)] uppercase"
                  href={`/i/${token}/pase`}
                >
                  {dictionary.passOpen}
                </a>
              </p>
            </>
          ),
        }}
      />
    </>
  )
}
