import Link from 'next/link'
import { notFound } from 'next/navigation'
import { events, planner } from '@/app/composition/container'
import { diasEntre, fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { requireSession } from '@/modules/identity/session-cookie'
import { avanceDeTareas, estadoDeTarea, pagosQueVencen } from '@/modules/planner'
import { DEFAULT_CURRENCY, formatAmount } from '@/modules/registry'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { fecha } from '@/shared/format/fecha'
import { Pill } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Mesa del planner' }
export const dynamic = 'force-dynamic'

const dia = (iso: string) => fecha(new Date(`${iso}T12:00:00.000Z`))

/**
 * La mesa de una planner con varios eventos: todos donde la sumaron, por cercanía, y lo que
 * vence en todos en una sola lista. Solo ve los eventos donde un anfitrión la sumó; nunca el
 * pago ni el plan.
 */
export default async function MesaDelPlannerPage() {
  const actor = await requireSession()
  const ids = await events.staff.eventIdsOf(actor.userId, ['planner'])
  if (ids.length === 0) notFound()

  const hoy = fechaEnBolivia(new Date())
  const filas = []
  for (const id of ids) {
    const evento = await events.getByIdFor(actor, id, { section: 'cliente' })
    if (isErr(evento)) continue
    const tareas = await planner.listTasks(id)
    const partidas = await planner.listBudget(id)
    filas.push({
      evento: evento.value,
      avance: avanceDeTareas(tareas),
      tareas: tareas.map((t) => ({ t, estado: estadoDeTarea(t, hoy) })).filter(({ estado }) => estado === 'atrasada' || estado === 'semana'),
      pagos: pagosQueVencen(partidas, hoy),
    })
  }
  filas.sort((a, b) => (a.evento.eventDate < b.evento.eventDate ? -1 : 1))
  const proximos = filas.filter((f) => f.evento.eventDate >= hoy)
  const pasados = filas.filter((f) => f.evento.eventDate < hoy)
  const vencen = filas.flatMap((f) => [
    ...f.tareas.map(({ t, estado }) => ({ clave: `t-${t.id}`, evento: f.evento, texto: t.title, tipo: 'Tarea', vence: t.dueDate!, atrasada: estado === 'atrasada', href: `/panel/eventos/${f.evento.slug}/planner/tareas` })),
    ...f.pagos.map((g) => ({ clave: `g-${g.id}`, evento: f.evento, texto: `${g.concepto} · ${formatAmount(g.amountCents, DEFAULT_CURRENCY)}`, tipo: 'Pago', vence: g.dueDate!, atrasada: g.dueDate! < hoy, href: `/panel/eventos/${f.evento.slug}/planner/presupuesto` })),
  ]).sort((a, b) => (a.vence < b.vence ? -1 : 1))

  return (
    <>
      <PanelHeader kicker="Planner" meta={`${proximos.length} evento${proximos.length === 1 ? '' : 's'} por delante · ${vencen.length} cosa${vencen.length === 1 ? '' : 's'} que vencen`} title="Mesa del planner" />

      <div className="grid items-start gap-4.5 min-[900px]:grid-cols-[1fr_1.2fr]">
        <PanelCard title="Tus eventos">
          <ul className="flex flex-col">
            {[...proximos, ...pasados].map((f) => {
              const faltan = diasEntre(hoy, f.evento.eventDate)
              return (
                <li className="border-b border-line-panel last:border-none" key={f.evento.id}>
                  <Link className="flex items-center justify-between gap-3 py-3 hover:text-ink" href={`/panel/eventos/${f.evento.slug}`}>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[14px] text-ink">{f.evento.title}</span>
                      <span className="text-[11px] text-ink-mute">
                        {dia(f.evento.eventDate)} · {faltan > 1 ? `faltan ${faltan} días` : faltan === 1 ? 'mañana' : faltan === 0 ? 'es hoy' : 'celebrado'}
                      </span>
                    </span>
                    <span className="font-mono text-[11px] text-ink-soft [font-variant-numeric:tabular-nums]">{f.avance} %</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </PanelCard>

        <PanelCard title="Vence esta semana, en todos">
          {vencen.length === 0 ? (
            <p className="text-[13px] text-ink-mute">Nada vence esta semana.</p>
          ) : (
            <ul className="flex flex-col">
              {vencen.map((v) => (
                <li className="border-b border-line-panel last:border-none" key={v.clave}>
                  <Link className="flex flex-wrap items-center justify-between gap-3 py-2.5" href={v.href}>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-[13px] text-ink">{v.texto}</span>
                      <span className="text-[11px] text-ink-mute">
                        {v.tipo} · {v.evento.title} · vence {dia(v.vence)}
                      </span>
                    </span>
                    <Pill tone={v.atrasada ? 'no' : 'maybe'}>{v.atrasada ? 'Atrasada' : 'Esta semana'}</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>
      </div>
    </>
  )
}
