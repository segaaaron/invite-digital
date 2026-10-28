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
import { PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { ScanIcon } from '@/shared/design/ui/icons'
import { AccionDeLaIsla } from '@/shared/design/ui/panel/AccionDeLaIsla'
import { isErr } from '@/shared/result'
import { tr } from '@/shared/i18n/idioma-servidor'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Día D', 'D-Day') }
}
export const dynamic = 'force-dynamic'

export default async function DiaDPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = await tr()
  const actor = await requireSession()
  const { slug } = await params
  const event = await events.getFor(actor, slug, { section: 'planner' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }
  if (isErr(await plans.requireFeature(event.value.id, 'plannerTotal'))) {
    return <FeatureLocked eventSlug={event.value.slug} mejorar={await mejorarPara(actor, event.value.slug)} reason="El Día D en el teléfono viene con Imperial." title={t('Día D', 'D-Day')} />
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

  const proveedores = await planner.dia.listVendors(event.value.id)
  const minutosDe = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return (h ?? 0) * 60 + (m ?? 0)
  }
  const ordenados = [...momentos].sort((a, b) => minutosDe(a.startsAt) - minutosDe(b.startsAt))
  const desde = momentoSigue === null ? -1 : ordenados.findIndex((m) => m.id === momentoSigue.id)
  const enDia = event.value.eventDate === hoy
  const porLlegar = new Set(proveedoresPorLlegar(proveedores).map((p) => p.id))
  const dia = {
    hora,
    ahora: momentoAhora ? { title: momentoAhora.title, startsAt: momentoAhora.startsAt, cue: momentoAhora.cue, owner: momentoAhora.owner } : null,
    sigue: momentoSigue ? { title: momentoSigue.title, startsAt: momentoSigue.startsAt, enMinutos: (minutosDe(momentoSigue.startsAt) - minutosDe(hora) + 1440) % 1440 } : null,
    loQueSigue: (desde === -1 ? [] : ordenados.slice(desde, desde + 4)).map((m) => ({ id: m.id, startsAt: m.startsAt, title: m.title })),
    ingreso: `/dashboard/events/${event.value.slug}/check-in`,
    llegadas: estadoPuerta
      ? { grupos: estadoPuerta.tally.arrivedGroups, esperados: estadoPuerta.tally.expectedGroups, personas: estadoPuerta.tally.headsInside, personasEsperadas: estadoPuerta.tally.expectedHeads }
      : null,
    recientes:
      estadoPuerta === null
        ? []
        : [...estadoPuerta.arrivals]
            .sort((a, b) => b.arrivedAt.getTime() - a.arrivedAt.getTime())
            .slice(0, 5)
            .map((a) => ({
              id: a.guestGroupId,
              nombre: estadoPuerta.groups.find((g) => g.id === a.guestGroupId)?.label ?? t('Invitación', 'Invitation'),
              cuantos: a.arrivedCount,
              hora: horaEnBolivia(a.arrivedAt),
            })),
    // Con trato (no los que cotizan): sin ninguno, «llegaron todos» era mentira.
    conProveedores: proveedores.some((p) => p.status !== 'cotizando'),
    conMesas: salon !== null && !isErr(salon) && salon.value.tables.length > 0,
    proveedores: proveedores
      .filter((p) => p.status !== 'cotizando')
      .sort((a, b) => (a.arrivalTime ?? '99:99').localeCompare(b.arrivalTime ?? '99:99'))
      .map((p) => {
        const tarde = enDia && porLlegar.has(p.id) && p.arrivalTime !== null ? minutosDe(hora) - minutosDe(p.arrivalTime) : 0
        return {
          id: p.id,
          nombre: p.company ?? p.service,
          service: p.service,
          arrivalTime: p.arrivalTime,
          llegoA: p.arrivedAt === null ? null : horaEnBolivia(p.arrivedAt),
          retraso: tarde > 0 ? tarde : null,
          confirmado: p.status === 'confirmado',
          telHref: p.whatsapp ? `tel:${p.whatsapp}` : null,
        }
      }),
    pagos: pagosDelDia(await planner.listBudget(event.value.id), hoy).map((g) => ({ id: g.id, concepto: g.concepto, importe: formatAmount(g.amountCents, DEFAULT_CURRENCY) })),
    mesas,
  }

  return (
    <>
      {enDia ? (
        <>
          <p className="mb-2 max-[767px]:hidden">
            <Pill tone="ok">
              <span aria-hidden className="size-1.5 rounded-full bg-current" /> {t('En vivo', 'Live')}
            </Pill>
          </p>
          <AccionDeLaIsla>
            <Pill tone="ok">
              <span aria-hidden className="size-1.5 rounded-full bg-current" /> {t('En vivo', 'Live')}
            </Pill>
          </AccionDeLaIsla>
        </>
      ) : null}
      <PanelHeader
        actions={
          <span className="max-[767px]:hidden">
            <PanelButton href={dia.ingreso}>
              <ScanIcon className="size-4" /> {t('Ingreso al evento', 'Event check-in')}
            </PanelButton>
          </span>
        }
        meta={enDia ? undefined : t('El día de la fiesta, en vivo: qué pasa ahora, qué sigue, quién llegó y qué proveedor falta.', 'The day of the party, live: what’s happening now, what’s next, who arrived and which vendor is missing.')}
        title={t('Día D', 'D-Day')}
      />
      <DayOfBoard dia={dia} evento={{ eventId: event.value.id, eventSlug: event.value.slug }} />
    </>
  )
}
