import { notFound } from 'next/navigation'
import { events, planner, plans } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import { momentosParaVer } from '@/modules/planner/ui/cronograma-vista'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Cronograma para imprimir' }
export const dynamic = 'force-dynamic'

/**
 * El cronograma en una hoja, con los teléfonos de los proveedores arriba: es lo que se pega
 * detrás de la puerta de la cocina. Sin controles: en papel no se pulsa nada.
 */
export default async function CronogramaImprimiblePage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const { slug } = await params
  const event = await events.getFor(actor, slug, { section: 'planner' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }
  if (isErr(await plans.requireFeature(event.value.id, 'plannerCompleto'))) notFound()

  const proveedores = await planner.dia.listVendors(event.value.id)
  const momentos = momentosParaVer(await planner.dia.listMoments(event.value.id))

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-6 p-10">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-[28px] font-light text-ink">{event.value.title}</h1>
        <p className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">Cronograma del día · {event.value.eventDate}</p>
      </header>
      {proveedores.length === 0 ? null : (
        <section className="grid grid-cols-2 gap-x-6 gap-y-1 border-y border-line py-3 text-[13px]">
          {proveedores.map((p) => (
            <p className="flex justify-between gap-3" key={p.id}>
              <span className="text-ink">{p.service}{p.contactName ? ` · ${p.contactName}` : ''}</span>
              <span className="font-mono text-ink-soft">{p.whatsapp ?? '—'}{p.arrivalTime ? ` · ${p.arrivalTime}` : ''}</span>
            </p>
          ))}
        </section>
      )}
      <table className="w-full border-collapse text-left text-[14px]">
        <tbody>
          {momentos.map((m) => (
            <tr className="border-b border-line align-top" key={m.id}>
              <td className="w-20 py-2 font-mono text-ink">{m.startsAt}</td>
              <td className="py-2 text-ink">
                {m.title}
                <span className="block text-[12px] text-ink-mute">
                  {[`${m.durationMin} min`, m.place, m.owner, m.cue ? `♪ ${m.cue}` : null, ...m.vendorIds.map((v) => proveedores.find((p) => p.id === v)?.service)].filter(Boolean).join(' · ')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
