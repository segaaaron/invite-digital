import Link from 'next/link'
import { notFound } from 'next/navigation'
import { rsvp } from '@/app/composition/container'
import { eventUnlocked } from '@/app/_acciones/events/actions'
import { EventPasswordGate } from '@/modules/events/ui/EventPasswordGate'
import { RsvpPorPersona } from '@/modules/rsvp/ui/RsvpPorPersona'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { isErr } from '@/shared/result'
import { resolveInvitation } from '../invitation'

export const dynamic = 'force-dynamic'

/** La confirmación de una familia no se indexa, como el pase: es de un grupo y de una noche. */
export const metadata = { robots: { index: false, follow: false } }

/**
 * Confirmar **nombre por nombre**, en su propia pantalla.
 *
 * Marcar seis nombres dentro de una invitación de seis mil píxeles obliga a subir y bajar
 * buscando el formulario. Aparte se ve todo de una vez, y es coherente con lo que ya existe:
 * `/i/<token>/pase` y `/i/<token>/fotos`.
 *
 * Solo tiene sentido con **dos o más personas cargadas**: con una, o sin ninguna, la
 * invitación resuelve con su sí y su no, y esta pantalla redirige allí en vez de pedir lo
 * mismo dos veces.
 *
 * Lleva la misma puerta de contraseña que la invitación: un extremo que enseña los nombres de
 * una familia no puede rodearla.
 */
export default async function ConfirmarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitation = await resolveInvitation(token)

  if (isErr(invitation)) {
    if (invitation.error.kind === 'storage_failure') throw new Error(invitation.error.detail)
    notFound()
  }

  const { group, event, latest } = invitation.value
  if (!(await eventUnlocked(event.id))) return <EventPasswordGate token={token} />

  const dictionary = getDictionary(event.locale).invitation
  const personas = await rsvp.peopleOfGroup(group.id)
  // Reabierta por el atelier después de lo contestado: vuelve a haber formulario, una vez.
  const reabierto = latest === null ? null : await rsvp.reopenedAtFor(group.id)
  const puedeResponder = latest === null || (reabierto !== null && reabierto.getTime() > latest.respondedAt.getTime())
  // Con menos de dos nombres no hay nada que repartir: la invitación ya pregunta sí o no.
  if (personas.length < 2) notFound()

  const volver = `/i/${token}`

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col gap-7 px-6 py-12 text-ink">
      <header className="flex flex-col gap-1.5">
        <p className="font-mono text-[9px] tracking-[0.3em] text-ink-soft uppercase">{event.title}</p>
        <h1 className="font-display text-[30px] leading-tight font-light">{group.label}</h1>
        <p className="text-[13px] text-ink-soft">{dictionary.seatsLabel}: {group.seats}</p>
      </header>

      {/* Ya contestaron: se ve lo dicho, no el formulario. Se confirma una sola vez. */}
      {puedeResponder ? (
        <RsvpPorPersona
          dictionary={dictionary}
          personas={personas.map((persona) => ({ id: persona.id, fullName: persona.fullName }))}
          seats={group.seats}
          token={token}
          volverHref={volver}
        />
      ) : (
        <section className="flex flex-col items-center gap-3 py-8 text-center" role="status">
          <p className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-gold-deep uppercase">{dictionary.confirmedHeading}</p>
          <p className="text-[26px] leading-tight font-light" style={{ fontFamily: 'var(--font-script, var(--font-display))' }}>
            {latest.attending === 0
              ? dictionary.confirmedNobody
              : dictionary.confirmedCount.replace('{n}', String(latest.attending)).replace('{total}', String(group.seats))}
          </p>
          <p className="max-w-[40ch] text-[13.5px] leading-[1.7] text-ink-soft">{dictionary.confirmedLocked}</p>
          <Link className="text-[11px] tracking-[var(--tracking-luxe)] text-gold-deep uppercase underline-offset-4 hover:underline" href={volver}>
            {dictionary.backToInvitation}
          </Link>
        </section>
      )}
    </main>
  )
}
