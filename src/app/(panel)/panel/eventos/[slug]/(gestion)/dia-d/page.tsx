import { notFound } from 'next/navigation'
import { mejorarPara } from '@/app/(panel)/panel/_carcasa/mejorar'
import { checkin, events, planner, plans, venue } from '@/app/composition/container'
import { fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { requireSession } from '@/app/_acciones/sesion'
import { momentoActual } from '@/modules/planner'
import { horaEnBolivia, mesasConFaltantes, pagosDelDia, proveedoresPorLlegar } from '@/modules/planner/domain/dia-d'
import { DayOfBoard } from '@/modules/planner/ui/DayOfBoard'
import { FeatureLocked } from '@/modules/plans'
import { DEFAULT_CURRENCY, formatAmount } from '@/shared/money'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Día D' }
export const dynamic = 'force-dynamic'

export default async function DiaDPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const { slug } = await params
  const event = await events.getFor(actor, slug, { section: 'planner' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }
  if (isErr(await plans.requireFeature(event.value.id, 'plannerTotal'))) {
    return <FeatureLocked eventSlug={event.value.slug} mejorar={await mejorarPara(actor, event.value.slug)} reason="El Día D en el teléfono viene con Alta Costura." title="Día D" />
  }

  const ahora = new Date()
  const hoy = fechaEnBolivia(ahora)
  const hora = horaEnBolivia(ahora)
  const momentos = await planner.dia.listMoments(event.value.id)
  const actual = momentoActual(momentos, hora)
  const momentoAhora = momentos.find((m) => m.id === actual.ahora) ?? null
  const momentoSigue = momentos.find((m) => m.id === actual.sigue) ?? null

  // Las llegadas y las mesas solo si el plan trae la puerta y el salón.
  const puerta = isErr(await plans.requireFeature(event.value.id, 'checkin')) ? null : await checkin.state(event.value.id)
  const estadoPuerta = puerta === null || isErr(puerta) ? null : puerta.value
  const salon = isErr(await plans.requireFeature(event.value.id, 'seating')) ? null : await venue.seating(event.value.id)
  const mesas = salon === null || isErr(salon) || estadoPuerta === null ? null : mesasConFaltantes(salon.value.tables, new Set(estadoPuerta.arrivals.map((a) => a.guestGroupId)))

  const dia = {
    hora,
    ahora: momentoAhora ? { title: momentoAhora.title, startsAt: momentoAhora.startsAt, cue: momentoAhora.cue, owner: momentoAhora.owner } : null,
    sigue: momentoSigue ? { title: momentoSigue.title, startsAt: momentoSigue.startsAt } : null,
    llegadas: estadoPuerta ? { grupos: estadoPuerta.tally.arrivedGroups, esperados: estadoPuerta.tally.expectedGroups, personas: estadoPuerta.tally.headsInside } : null,
    porLlegar: proveedoresPorLlegar(await planner.dia.listVendors(event.value.id)).map((p) => ({ id: p.id, service: p.service, arrivalTime: p.arrivalTime, telHref: p.whatsapp ? `tel:${p.whatsapp}` : null })),
    pagos: pagosDelDia(await planner.listBudget(event.value.id), hoy).map((g) => ({ id: g.id, concepto: g.concepto, importe: formatAmount(g.amountCents, DEFAULT_CURRENCY) })),
    mesas,
  }

  return (
    <>
      <PanelHeader kicker="Planner" meta={event.value.eventDate === hoy ? 'Es hoy' : `El evento es el ${event.value.eventDate}`} title="Día D" />
      <DayOfBoard dia={dia} evento={{ eventId: event.value.id, eventSlug: event.value.slug }} />
    </>
  )
}
