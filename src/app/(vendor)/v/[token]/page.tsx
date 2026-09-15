import { notFound } from 'next/navigation'
import { events, planner, plans } from '@/app/composition/container'
import { isErr } from '@/shared/result'

export const dynamic = 'force-dynamic'

/**
 * La parte del día de un proveedor, con su enlace de solo lectura. Su hora de llegada, el
 * montaje, sus momentos y quién está a cargo de cada uno. **Nada más**: ni invitados, ni
 * dinero, ni otros proveedores. Un enlace desconocido, quitado o de un plan que ya no lo
 * trae responde 404, sin decir cuál de las tres.
 */
export default async function VendorPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const vista = await planner.dia.viewAsVendor(token)
  if (vista === null) notFound()
  if (isErr(await plans.requireFeature(vista.eventId, 'plannerTotal'))) notFound()
  const evento = await events.getByIdUnscoped(vista.eventId)
  if (isErr(evento)) notFound()

  const { proveedor, momentos } = vista
  return (
    <main className="mx-auto flex max-w-[560px] flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">{proveedor.service}</p>
        <h1 className="font-display text-[30px] leading-tight font-light text-ink">{evento.value.title}</h1>
        <p className="text-[14px] text-ink-soft">
          {evento.value.eventDate}
          {evento.value.venue ? ` · ${evento.value.venue}` : ''}
        </p>
      </header>

      <section className="flex flex-col gap-2 rounded-[18px] border border-line bg-bg-raised p-5">
        <p className="text-[15px] text-ink">{proveedor.arrivalTime ? `Llegas a las ${proveedor.arrivalTime}` : 'Hora de llegada por confirmar'}</p>
        {proveedor.setupNotes ? <p className="text-[14px] leading-[1.6] whitespace-pre-line text-ink-soft">{proveedor.setupNotes}</p> : null}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-[22px] font-light text-ink">Tus momentos</h2>
        {momentos.length === 0 ? (
          <p className="text-[14px] text-ink-mute">Todavía no te asignaron momentos del cronograma.</p>
        ) : (
          <ol className="flex flex-col">
            {momentos.map((m) => (
              <li className="flex gap-4 border-b border-line py-3 last:border-none" key={m.id}>
                <span className="w-14 font-mono text-[15px] text-ink [font-variant-numeric:tabular-nums]">{m.startsAt}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[15px] text-ink">{m.title}</span>
                  <span className="text-[12px] text-ink-mute">
                    {[`${m.durationMin} min`, m.place, m.cue ? `♪ ${m.cue}` : null, m.owner ? `a cargo de ${m.owner}` : null].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  )
}
