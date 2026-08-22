import { notFound } from 'next/navigation'
import { events, venue } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Plan del banquete' }

export const dynamic = 'force-dynamic'

/**
 * Papel para el banquete: mesa por mesa, con sus grupos y sus comensales confirmados,
 * ordenado por etiqueta. Sin un solo control — nadie va a pulsar nada sobre una hoja
 * impresa, y un botón que sale en la impresión es tinta desperdiciada.
 */
export default async function PlanImprimiblePage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession()
  const { slug } = await params

  const event = await events.getBySlug(slug)
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const seating = await venue.seating(event.value.id)
  if (isErr(seating)) throw new Error(seating.error.detail)

  const { tables, unseated, totalConfirmed } = seating.value
  const comensalesDe = (grupos: (typeof tables)[number]['groups']) =>
    grupos.reduce((sum, g) => sum + (g.confirmed ?? 0), 0)

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-8 p-10">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-[28px] font-light text-ink">{event.value.title}</h1>
        <p className="font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
          Plan del banquete · {totalConfirmed} comensales confirmados
        </p>
      </header>

      {tables.map((table) => (
        <section key={table.id} className="flex flex-col gap-2 border-t border-line pt-4">
          <h2 className="flex items-baseline justify-between font-display text-[20px] font-light text-ink">
            <span>{table.label}</span>
            <span className="font-mono text-[12px] text-ink-soft">
              {comensalesDe(table.groups)} comensales · {table.taken} / {table.capacity} sitios
            </span>
          </h2>
          {table.groups.length === 0 ? (
            <p className="text-[13px] text-ink-mute">Sin asignar.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {table.groups.map((group) => (
                <li key={group.id} className="flex items-baseline justify-between text-[14px] text-ink-soft">
                  <span>{group.label}</span>
                  <span className="font-mono text-[12px] text-ink-mute">
                    {group.confirmed ?? '—'} / {group.seats}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {unseated.length === 0 ? null : (
        <section className="flex flex-col gap-2 border-t border-line pt-4">
          <h2 className="font-display text-[20px] font-light text-danger">Sin mesa</h2>
          <ul className="flex flex-col gap-1">
            {unseated.map((group) => (
              <li key={group.id} className="flex items-baseline justify-between text-[14px] text-ink-soft">
                <span>{group.label}</span>
                <span className="font-mono text-[12px] text-ink-mute">
                  {group.confirmed ?? '—'} / {group.seats}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
