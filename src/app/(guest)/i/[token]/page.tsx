import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { events as eventos, guestbook, plans, registry, rsvp } from '@/app/composition/container'
import { PassQr } from '@/modules/checkin/ui/PassQr'
import { acceptsResponses } from '@/modules/events'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { tarjetaDeInvitacion } from '@/modules/events/domain/tarjeta-de-invitacion'
import { GuestReply } from '@/modules/guestbook'
import { invitationUrl } from '@/modules/guests'
import { GuestRegistry } from '@/modules/registry/ui/GuestRegistry'
import { GuestbookForm } from '@/modules/rsvp/ui/GuestbookForm'
import { concedePase } from '@/modules/rsvp'
import { RsvpForm } from '@/modules/rsvp/ui/RsvpForm'
import { RsvpPareja } from '@/modules/rsvp/ui/RsvpPareja'
import { env } from '@/shared/config/env'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { isErr } from '@/shared/result'
import { resolveInvitation } from './invitation'
import { ViewBeacon } from '@/modules/analytics/ui/ViewBeacon'
import { classifyDevice } from '@/modules/analytics'
import { headers } from 'next/headers'
import { eventUnlocked } from '@/app/_acciones/events/actions'
import { EventPasswordGate } from '@/modules/events/ui/EventPasswordGate'

// El estado del RSVP cambia con cada respuesta: esta página no se cachea.
export const dynamic = 'force-dynamic'

/**
 * La vista previa al pegar el enlace en WhatsApp: título, saludo e imagen de la invitación.
 * Sin esto se veía un enlace pelado. Con contraseña no dice de quién es la fiesta.
 */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const invitation = await resolveInvitation(token)
  if (isErr(invitation)) return {}
  const { event, group } = invitation.value
  const protegida = (await eventos.passwordHashOf(event.id)) !== null
  const contenido = protegida ? {} : await eventos.contenidoParaInvitados(event.id, {})
  const tarjeta = tarjetaDeInvitacion({ evento: event, contenido, invitado: group.label, protegida })
  const sitio = env.SITE_URL.replace(/\/+$/, '')
  return {
    title: tarjeta.titulo,
    description: tarjeta.descripcion,
    openGraph: {
      type: 'website',
      title: tarjeta.titulo,
      description: tarjeta.descripcion,
      url: `${sitio}/i/${token}`,
      images: [{ url: `${sitio}/i/${token}/imagen`, secureUrl: `${sitio}/i/${token}/imagen`, width: 1200, height: 630, type: 'image/jpeg', alt: tarjeta.titulo }],
    },
    twitter: { card: 'summary_large_image', title: tarjeta.titulo, description: tarjeta.descripcion, images: [`${sitio}/i/${token}/imagen`] },
  }
}

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitation = await resolveInvitation(token)

  if (isErr(invitation)) {
    if (invitation.error.kind === 'storage_failure') throw new Error(invitation.error.detail)
    notFound()
  }

  const { group, event, latest } = invitation.value
  // En celular, a pantalla completa; en tablet, laptop o escritorio, dentro de un teléfono.
  const enMarco = classifyDevice((await headers()).get('user-agent') ?? '') !== 'mobile'

  // Evento protegido con contraseña: sin desbloquear no se enseña nada, ni el título.
  // Quien no la tiene no debe averiguar de qué boda se trata por tener el enlace.
  if (!(await eventUnlocked(event.id))) {
    return <EventPasswordGate token={token} />
  }
  // Las personas del grupo: deciden si se confirma por nombre o con un sí y un no.
  const personas = await rsvp.peopleOfGroup(group.id)
  // Igual que en la pantalla de confirmación: reabrir devuelve el formulario una sola vez.
  const reabierto = latest === null ? null : await rsvp.reopenedAtFor(group.id)
  const sinResponder = latest === null || (reabierto !== null && reabierto.getTime() > latest.respondedAt.getTime())
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
  const contenido = await eventos.contenidoParaInvitados(event.id, definicion.defaultContent)
  // «Comparte tus fotos» solo si el plan lo trae: un botón que lleva a un rechazo no se ofrece.
  const capacidadDelPlan = await plans.allowanceFor(event.id)
  const fotosDeInvitados = !isErr(capacidadDelPlan) && capacidadDelPlan.value.guestPhotos

  // El pase de entrada: el QR y el botón de abrirlo a solas, en su ranura.
  const pase = (
    <>
      <PassQr
        label={group.label}
        codigo={group.passCode ?? null}
        labels={{ title: dictionary.passTitle, hint: dictionary.passHint, alt: dictionary.passAlt, code: dictionary.passCode }}
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
  )

  return (
    <>
      {/* Cuenta la visita. No pinta nada, y se queda **fuera** del tema: un diseño no tiene
          por qué saber que la analítica existe. */}
      <ViewBeacon kind="guest" token={token} />

      {/* En tablet, laptop o escritorio, dentro de un teléfono centrado: los diseños están dibujados
          para esa pantalla. En el celular, a pantalla completa. Lo decide el aparato. */}
      <div className={enMarco ? 'invitacion-escenario' : undefined}>
        <div className={enMarco ? 'invitacion-marco' : undefined}>
          <Theme
            content={contenido}
            // Con la respuesta dada, el bloque deja de pedir que confirme: da las gracias y no
            // recuerda el plazo, que encima de «Confirmación enviada» se contradecía.
            dictionary={sinResponder ? dictionary : { ...dictionary, title: latest.attending > 0 ? dictionary.titleConfirmed : dictionary.titleDeclined }}
            respondida={!sinResponder}
            {...(sinResponder ? {} : { asistira: latest.attending > 0 })}
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
              // Con dos o más personas cargadas, confirmar es decir **quién** viene, y eso se hace
              // en su propia pantalla: marcar seis nombres dentro de una invitación de seis mil
              // píxeles obliga a subir y bajar buscando el formulario.
              rsvp: abierto ? (
                personas.length === 2 && sinResponder ? (
                  // Una pareja viene junta o no viene: dos nombres que marcar son un paso de más.
                  <RsvpPareja confirmarHref={`/i/${token}/confirmar`} dictionary={dictionary} paseHref={`/i/${token}/pase`} token={token} />
                ) : personas.length > 2 && sinResponder ? (
                  <div className="flex flex-col items-center gap-3 py-2 text-center">
                    <p className="text-[14px] leading-[1.7]">{dictionary.whoIsComing}</p>
                    <Link
                      className="rounded-[var(--radius-pill)] bg-[var(--color-cta)] px-6 py-3 font-mono text-[11px] tracking-[0.28em] text-[var(--color-on-cta)] uppercase"
                      href={`/i/${token}/confirmar`}
                    >
                      {dictionary.confirmAttendance}
                    </Link>
                  </div>
                ) : (
                <RsvpForm
                  dictionary={dictionary}
                  guestName={group.label}
                  previous={sinResponder ? null : latest}
                  seats={group.seats}
                  token={token}
                  variant={definicion.rsvp}
                />
                )
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
                  {definicion.rsvp !== undefined && definicion.rsvp !== 'campos' ? (
                    <GuestbookForm dictionary={dictionary} guestName={group.label} previous={latest} seats={group.seats} token={token} />
                  ) : null}
                  <GuestReply dictionary={guestbookDictionary} reply={respuestaDelAtelier} />
                </>
              ),
              // El botón de «Comparte tus fotos». Lleva a su propia pantalla y no abre un campo
              // aquí: subir fotos es volver varias veces a lo largo del día, y hacerlo desde
              // media invitación obliga a desplazarse hasta el bloque cada vez.
              photos: !fotosDeInvitados ? undefined : (
                <a
                  className="inline-block rounded-[var(--radius-pill)] bg-gold px-5 py-3 font-mono text-[9px] font-bold tracking-[0.15em] text-[var(--color-on-gold)] uppercase"
                  href={`/i/${token}/fotos`}
                >
                  {dictionary.photosPick}
                </a>
              ),
              // El pase llega **al confirmar que asiste**: antes se enseñaba a todos, también a
              // quien no había contestado o dijo que no.
              pass: concedePase(latest) ? (
                pase
              ) : (
                <p className="text-center text-[13.5px] leading-[1.7]">{latest === null ? dictionary.passPending : dictionary.passDeclined}</p>
              ),
            }}
          />
        </div>
      </div>
    </>
  )
}
