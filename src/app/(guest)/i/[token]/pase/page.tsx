import Link from 'next/link'
import { notFound } from 'next/navigation'
import { checkin } from '@/app/composition/container'
import { PassQr } from '@/modules/checkin/ui/PassQr'
import { eventUnlocked } from '@/modules/events/actions'
import { EventPasswordGate } from '@/modules/events/ui/EventPasswordGate'
import { invitationUrl } from '@/modules/guests'
import { env } from '@/shared/config/env'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { isErr } from '@/shared/result'
import { resolveInvitation } from '../invitation'

export const dynamic = 'force-dynamic'

/** El pase no se indexa: es de una persona y de una noche. */
export const metadata = { robots: { index: false, follow: false } }

/**
 * El pase, y **solo** el pase.
 *
 * Existe porque la puerta pasa de noche, con gente detrás y el teléfono al 4 %: buscar el
 * mensaje de WhatsApp, abrir la invitación y desplazarse hasta el final es lo que forma
 * la fila. Esta pantalla se guarda en la pantalla de inicio y se abre de un toque.
 *
 * Fondo claro y fijo, sin tema oscuro: un QR con poco contraste no lo lee ningún escáner,
 * y el brillo del teléfono en un salón a media luz no da para más.
 */
export default async function PasePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitation = await resolveInvitation(token)

  if (isErr(invitation)) {
    if (invitation.error.kind === 'storage_failure') throw new Error(invitation.error.detail)
    notFound()
  }

  const { group, event } = invitation.value

  // La misma puerta que la invitación: quien no tiene la contraseña no averigua de qué
  // boda se trata por tener el enlace.
  if (!(await eventUnlocked(event.id))) return <EventPasswordGate token={token} />

  const dictionary = getDictionary(event.locale).invitation

  // La mesa, que es lo primero que se pregunta al entrar y lo que la puerta canta en voz
  // alta. Sale del manifiesto, que ya la trae; si la lectura falla, el pase sigue en pie
  // sin ella — no poder decir la mesa no puede impedir entrar.
  const manifiesto = await checkin.manifest(event.id).catch(() => null)
  const mesa =
    manifiesto === null || isErr(manifiesto)
      ? null
      : (manifiesto.value.groups.find((g) => g.id === group.id)?.tableLabel ?? null)

  const fecha = new Intl.DateTimeFormat(event.locale === 'en' ? 'en-GB' : 'es-BO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${event.eventDate}T00:00:00Z`))

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#fffdf9] px-6 py-12 text-[#2b2723]">
      <header className="flex flex-col items-center gap-1.5 text-center">
        <p className="font-mono text-[9px] tracking-[0.3em] uppercase opacity-55">{event.title}</p>
        <h1 className="font-display text-[30px] leading-tight font-light italic">{group.label}</h1>
        <p className="text-[12px] opacity-65">{fecha}</p>
      </header>

      <PassQr
        label={group.label}
        labels={{ title: dictionary.passTitle, hint: dictionary.passHint, alt: dictionary.passAlt }}
        url={invitationUrl(token, env.SITE_URL)}
      />

      {/* El dato que el invitado pregunta nada más entrar, y que la puerta también canta. */}
      <p className="rounded-[var(--radius-pill)] bg-[#efe7dc] px-5 py-2 font-mono text-[11px] tracking-[0.2em] uppercase">
        {mesa ?? dictionary.passNoTable}
      </p>

      <p className="max-w-[34ch] text-center text-[12px] leading-[1.7] opacity-65">{dictionary.passSaveHint}</p>

      <Link className="text-[12px] underline underline-offset-4 opacity-65" href={`/i/${token}`}>
        {dictionary.passBack}
      </Link>
    </main>
  )
}
