import Link from 'next/link'
import { notFound } from 'next/navigation'
import { mejorarPara } from '@/app/(panel)/panel/_carcasa/mejorar'
import { checkin, events, plans } from '@/app/composition/container'
import { ManualCheckin } from '@/modules/checkin/ui/ManualCheckin'
import { ListaDeLlegadas } from '@/modules/checkin/ui/ListaDeLlegadas'
import { listaDeLlegadas } from '@/modules/checkin/domain/lista-de-llegadas'
import { DoorModeCard } from '@/modules/checkin/ui/DoorModeCard'
import { requireSession } from '@/app/_acciones/sesion'
import { FeatureLocked } from '@/modules/plans/ui/FeatureLocked'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { DonutChart, PanelCard } from '@/shared/design/ui/panel/cards'
import { isErr } from '@/shared/result'
import { hora } from '@/shared/format/fecha'

export const metadata = { title: 'Llegadas' }

// Las llegadas entran mientras el atelier mira esta pantalla: no se cachea.
export const dynamic = 'force-dynamic'

/**
 * La sección de check-in del panel, portada de `Dashboard.html`.
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

  // Quién está dentro y a quién se espera, persona por persona: lo que la recepción escanea se ve aquí.
  const filas = listaDeLlegadas(groups, arrivals, personas).map((f) => ({ ...f, hora: f.hora === null ? null : hora(f.hora) }))
  const dentro = filas.filter((f) => f.estado === 'dentro').length
  const porLlegar = filas.filter((f) => f.estado === 'por_llegar').length
  const noVienen = filas.filter((f) => f.estado === 'no_viene').length
  const esperados = dentro + porLlegar
  const porcentaje = esperados === 0 ? 0 : Math.round((dentro / esperados) * 100)

  return (
    <>
      <PanelHeader
        kicker="Día del evento"
        meta={`${dentro} dentro · ${porLlegar} por llegar${noVienen > 0 ? ` · ${noVienen} no vienen` : ''}`}
        title="Llegadas"
      />

      <DoorModeCard href={`/panel/eventos/${event.value.slug}/puerta`} />

      <p className="mb-5.5 text-[13px] text-ink-soft">
        ¿Recibe otra persona en la puerta?{' '}
        <Link className="text-ink underline underline-offset-4" href={`/panel/eventos/${event.value.slug}/equipo`}>
          Suma a tu personal de recepción
        </Link>{' '}
        con un enlace y un PIN, sin crear cuentas.
      </p>

      <div className="mb-5.5 grid items-start gap-4.5 min-[900px]:grid-cols-[1.6fr_1fr]">
        <PanelCard title="Invitados">
          <ListaDeLlegadas filas={filas} />
        </PanelCard>

        <div className="flex flex-col gap-4.5">
          <PanelCard title="Cómo va la llegada">
            <DonutChart
              big={`${porcentaje}%`}
              caption="LLEGARON"
              slices={[
                { label: 'Dentro', value: dentro, color: 'var(--color-sage)' },
                { label: 'Por llegar', value: porLlegar, color: 'var(--color-gold-light)' },
                { label: 'No vienen', value: noVienen, color: 'var(--color-line-panel-strong)' },
              ]}
            />
          </PanelCard>
          <PanelCard title="Buscar a mano">
          <div className="flex flex-col gap-4">
            <p className="text-[12px] leading-[1.7] text-ink-soft">
              Para quien llegue sin el pase, con el celular sin batería o con la pantalla rota. Busca por nombre o
              invitación y registra el ingreso directo, sin escanear nada.
            </p>
            <ManualCheckin
              arrivedIds={arrivals.map((a) => a.guestGroupId)}
              eventId={event.value.id}
              eventSlug={event.value.slug}
              groups={groups.map((g) => ({
                id: g.id,
                label: g.label,
                seats: g.seats,
                attending: g.attending,
                revoked: g.revoked,
              }))}
            />
            {/* La nota del lector de códigos que la maqueta pone bajo el buscador: en la
                recepción es habitual tener uno por USB, y nadie lo probaría si no se dice. */}
            <p className="text-[11px] leading-[1.6] text-ink-mute">
              Un lector de códigos por USB o Bluetooth también escribe aquí: termina con Enter y registra el ingreso
              directo.
            </p>
          </div>
          </PanelCard>
        </div>
      </div>
    </>
  )
}
