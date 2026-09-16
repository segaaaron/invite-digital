import { notFound } from 'next/navigation'
import { events, plans, porters } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import { EquipoCard } from '@/modules/events/ui/EquipoCard'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { fecha, hora } from '@/shared/format/fecha'
import { formatoWhatsapp } from '@/shared/whatsapp'
import { isErr, isOk } from '@/shared/result'

export const metadata = { title: 'Equipo' }
export const dynamic = 'force-dynamic'

/**
 * Todo el equipo del evento en una pantalla: la planner y el personal de recepción. La abre quien
 * suma porteros —el anfitrión, su planner, el dueño—; sumar cuentas al panel solo el anfitrión
 * y el dueño (sección `equipo`). El co-anfitrión no suma a nadie: 404.
 */
export default async function EquipoPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const { slug } = await params

  const event = await events.getFor(actor, slug, { section: 'porteros' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }
  const sumaEquipo = isOk(await events.getFor(actor, slug, { section: 'equipo' }))

  const capacidad = await plans.allowanceFor(event.value.id)
  if (isErr(capacidad)) throw new Error(capacidad.error.detail)
  const conPuerta = isOk(await plans.requireFeature(event.value.id, 'checkin'))
  const [equipo, lista, actividad] = await Promise.all([
    events.team.list(event.value.id),
    conPuerta ? porters.list(event.value.id) : Promise.resolve([]),
    conPuerta ? porters.activity(event.value.id) : Promise.resolve({}),
  ])
  const papel = { cliente: 'anfitrion', coanfitrion: 'coanfitrion', planner: 'planner' } as const
  const miembros = equipo.flatMap((m) => (m.membership === 'puerta' ? [] : [{ userId: m.userId, email: m.email, nombre: m.fullName, telefono: m.phone === null ? null : formatoWhatsapp(m.phone), papel: papel[m.membership] }]))
  const total = miembros.length + lista.length

  return (
    <>
      <PanelHeader kicker="Tu evento" meta={`${total} persona${total === 1 ? '' : 's'} en el equipo`} title="Equipo" />
      <PanelCard title="Quién te ayuda">
        <EquipoCard
          eventId={event.value.id}
          eventSlug={event.value.slug}
          miembros={miembros}
          porteros={
            conPuerta
              ? {
                  limite: capacidad.value.maxDoorPorters,
                  lista: lista.map((p) => {
                    const suya = (actividad as Record<string, { registradas: number; ultima: Date } | undefined>)[p.id]
                    return {
                      id: p.id,
                      name: p.name,
                      gate: p.gate,
                      phone: p.phone === null ? null : formatoWhatsapp(p.phone),
                      createdAt: fecha(p.createdAt),
                      registradas: suya?.registradas ?? 0,
                      ultima: suya === undefined ? null : hora(suya.ultima),
                    }
                  }),
                }
              : null
          }
          sumaEquipo={sumaEquipo}
          topes={{ planners: capacidad.value.maxHiredPlanners }}
        />
      </PanelCard>
    </>
  )
}
