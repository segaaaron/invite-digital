import { notFound } from 'next/navigation'
import { mejorarPara } from '@/app/(panel)/panel/_carcasa/mejorar'
import { checkin, events, guests, plans, porters, venue } from '@/app/composition/container'
import { listaDeLlegadas } from '@/modules/checkin/domain/lista-de-llegadas'
import { ControlDeIngreso } from '@/modules/checkin/ui/ControlDeIngreso'
import { requireSession } from '@/app/_acciones/sesion'
import { FeatureLocked } from '@/modules/plans/ui/FeatureLocked'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { isErr } from '@/shared/result'
import { hora } from '@/shared/format/fecha'
import { EnVivo } from '@/shared/design/ui/panel/EnVivo'

export const metadata = { title: 'Ingreso al evento' }

// Las llegadas entran mientras el atelier mira esta pantalla: no se cachea.
export const dynamic = 'force-dynamic'

/**
 * El ingreso al evento: buscar a quien llega y registrarlo, con el contador arriba y el escáner
 * a un botón.
 *
 * **Aquí no hay cámara.** El escáner vive solo en el modo puerta, a pantalla completa,
 * que es como se usa de verdad: un celular o una tablet en la mano de quien recibe. Un
 * vídeo encendido dentro del panel de escritorio no sirve a nadie y falla en cuanto la
 * máquina no tiene cámara, que es lo que pasaba al entrar aquí desde la barra.
 */
export default async function CheckinPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const { slug } = await params

    // La única sección que abre al personal de puerta. Todo lo demás hereda `full`.
  const event = await events.getFor(actor, slug, { section: 'checkin' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const permitido = await plans.requireFeature(event.value.id, 'checkin')
  if (isErr(permitido)) {
    return <FeatureLocked eventSlug={event.value.slug} mejorar={await mejorarPara(actor, event.value.slug)} reason={permitido.error.detail} title="Check-in" />
  }

  const estado = await checkin.state(event.value.id)
  if (isErr(estado)) throw new Error(estado.error.detail)
  const { groups, arrivals, personas } = estado.value

  // La mesa de cada invitación, si el plan trae el salón: en la puerta se pregunta.
  const mesaDe = new Map<string, string>()
  const salon = isErr(await plans.requireFeature(event.value.id, 'seating')) ? null : await venue.seating(event.value.id).catch(() => null)
  if (salon !== null && !isErr(salon)) for (const mesa of salon.value.tables) for (const g of mesa.groups) mesaDe.set(g.id, mesa.label)

  // Quién recibe en la puerta, a la vista: su nombre, su puerta y cuántos registró.
  const recepcion =
    actor.role === 'puerta'
      ? null
      : await Promise.all([porters.list(event.value.id), porters.activity(event.value.id)]).then(([lista, actividad]) => ({
          gestionarHref: `/panel/eventos/${event.value.slug}/equipo`,
          personas: lista.map((p) => ({
            id: p.id,
            nombre: p.name,
            puerta: p.gate,
            registradas: (actividad as Record<string, { registradas: number } | undefined>)[p.id]?.registradas ?? 0,
          })),
        }))

  // El código corto del pase de cada invitación: la puerta lo escribe si el QR no se lee.
  const codigos = await guests.codigos(event.value.id)
  const filas = listaDeLlegadas(groups, arrivals, personas).map((f) => ({ ...f, hora: f.hora === null ? null : hora(f.hora), mesa: mesaDe.get(f.invitacionId) ?? null, codigo: codigos.get(f.invitacionId) ?? null }))

  return (
    <>
      <PanelHeader kicker="Día del evento" meta="Escanea el QR del pase o escribe su código. Registrar sin pase queda para cuando no trae ninguno." title="Ingreso al evento" />
      <EnVivo modo="auto" tipos={['ingreso']} url={`/panel/eventos/${event.value.slug}/en-vivo`} />
      <ControlDeIngreso
        escanerHref={`/panel/eventos/${event.value.slug}/puerta`}
        eventId={event.value.id}
        eventSlug={event.value.slug}
        filas={filas}
        recepcion={recepcion}
      />
    </>
  )
}
