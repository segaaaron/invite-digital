import Link from 'next/link'
import { notFound } from 'next/navigation'
import { events, registry } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import { DEFAULT_CURRENCY } from '@/modules/registry'
import { FundCard } from '@/modules/registry/ui/FundCard'
import { FundForm } from '@/modules/registry/ui/FundForm'
import { GiftForm } from '@/modules/registry/ui/GiftForm'
import { GiftList } from '@/modules/registry/ui/GiftList'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Regalos' }

// Los invitados reservan mientras el atelier mira la lista: esta página no se cachea.
export const dynamic = 'force-dynamic'

export default async function RegalosPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession()
  const { slug } = await params

  const event = await events.getBySlug(slug)
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const mesa = await registry.list(event.value.id)
  if (isErr(mesa)) throw new Error(mesa.error.detail)

  const { gifts, funds, tally } = mesa.value

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-8 p-10">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <h1 className="font-display text-[26px] font-light text-ink">Regalos · {event.value.title}</h1>
        <Link className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute" href={`/panel/eventos/${event.value.slug}`}>
          Volver al evento
        </Link>
      </header>

      <p aria-label="Resumen de la mesa" className="font-mono text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
        {tally.total} en la lista · {tally.available} sin reservar · {tally.reserved} reservados · {tally.purchased} comprados
      </p>

      <section className="flex flex-col gap-5">
        <h2 className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">Añadir un regalo</h2>
        <GiftForm eventId={event.value.id} eventSlug={event.value.slug} />
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">Lista de regalos</h2>
        <GiftList currency={DEFAULT_CURRENCY} eventId={event.value.id} eventSlug={event.value.slug} gifts={gifts} />
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">Fondos en efectivo</h2>
        <FundForm eventId={event.value.id} eventSlug={event.value.slug} />
        {funds.length === 0 ? (
          <p className="text-[13px] text-ink-mute">
            Todavía no hay fondos abiertos. Un fondo recauda por transferencia o en un sobre; lo que llega lo registras tú.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {funds.map((view) => (
              <FundCard
                key={view.fund.id}
                currency={DEFAULT_CURRENCY}
                eventId={event.value.id}
                eventSlug={event.value.slug}
                view={view}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
