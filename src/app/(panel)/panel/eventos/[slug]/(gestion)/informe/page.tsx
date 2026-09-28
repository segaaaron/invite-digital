import { notFound } from 'next/navigation'
import { checkin, events, guestbook } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { BotonImprimir } from '@/shared/design/ui/panel/BotonImprimir'
import { TiraDeCifras } from '@/shared/design/ui/panel/lista'
import { BarRow } from '@/shared/design/ui/panel/PanelKit'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { diaDelEvento, fecha, hora } from '@/shared/format/fecha'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Informe del evento' }
export const dynamic = 'force-dynamic'

const HORA = new Intl.DateTimeFormat('es-BO', { timeZone: 'America/La_Paz', hour: '2-digit', hourCycle: 'h23' })

/**
 * **El informe del evento**: el recuerdo de la fiesta en una página —cuántos vinieron, cómo
 * llegaron hora a hora, y todo lo que los invitados escribieron en el libro de firmas—, con
 * «Guardar como PDF». Es del anfitrión y de su planner (sección `cliente`): lleva sus invitados.
 * El mejor momento para pedirle su opinión es cuando lo mira.
 */
export default async function InformePage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const { slug } = await params
  const event = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }
  const e = event.value
  const [puerta, firmas, medios] = await Promise.all([checkin.state(e.id), guestbook.list(e.id), events.media.list(e.id)])
  const tally = isErr(puerta) ? null : puerta.value.tally
  const llegadas = isErr(puerta) ? [] : puerta.value.arrivals
  const mensajes = isErr(firmas) ? [] : [...firmas.value].sort((a, b) => a.writtenAt.getTime() - b.writtenAt.getTime())
  const fotosDeInvitados = medios.filter((m) => m.uploadedByGroupId !== null && m.contentType.startsWith('image/')).length

  // Las llegadas por hora, en hora de Bolivia: cuándo se llenó el salón.
  const porHora = new Map<string, number>()
  for (const l of llegadas) {
    const h = HORA.format(l.arrivedAt)
    porHora.set(h, (porHora.get(h) ?? 0) + l.arrivedCount)
  }
  const horas = [...porHora.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const techo = Math.max(1, ...horas.map(([, n]) => n))
  const primera = llegadas.map((l) => l.arrivedAt).sort((a, b) => a.getTime() - b.getTime())[0]
  const asistencia = tally === null || tally.expectedHeads === 0 ? null : Math.round((tally.headsInside / tally.expectedHeads) * 100)

  return (
    <div className="mx-auto flex max-w-[980px] flex-col gap-4.5 print:max-w-none">
      <PanelHeader actions={<BotonImprimir>Guardar como PDF</BotonImprimir>} kicker="Informe del evento" meta={`${diaDelEvento(e.eventDate)} · ${themeFor(e.themeKey).label}`} title={e.title} />

      <TiraDeCifras
        cifras={[
          { label: 'Llegaron', value: tally === null ? '—' : tally.headsInside, detail: tally === null ? undefined : `De ${tally.expectedHeads} que confirmaron` },
          { label: 'Asistencia', value: asistencia === null ? '—' : `${asistencia} %`, detail: 'Sobre lo confirmado' },
          { label: 'Firmas', value: mensajes.length, detail: 'En el libro de la invitación' },
          { label: 'Fotos', value: fotosDeInvitados, detail: 'Subidas por los invitados' },
        ]}
      />

      <PanelCard title="Cómo llegaron">
        {horas.length === 0 ? (
          <EmptyState compact title="No se registraron llegadas en la puerta" />
        ) : (
          <>
            {primera === undefined ? null : <p className="-mt-2 mb-3 text-[12.5px] text-ink-mute">El primero entró a las {hora(primera)} del {fecha(primera)}.</p>}
            <div className="flex flex-col">
              {horas.map(([h, n]) => (
                <BarRow key={h} label={`${h}:00`} ratio={n / techo} value={String(n)} />
              ))}
            </div>
          </>
        )}
      </PanelCard>

      <PanelCard title="El libro de firmas">
        {mensajes.length === 0 ? (
          <EmptyState compact title="Nadie dejó un mensaje" />
        ) : (
          <ul className="columns-1 gap-4 min-[760px]:columns-2 print:columns-2">
            {mensajes.map((m) => (
              <li className="mb-4 break-inside-avoid rounded-[16px] border border-line-panel bg-white px-4 py-3.5" key={m.responseId}>
                <p className="font-display text-[17px] leading-snug text-ink italic">«{m.body}»</p>
                <p className="mt-2 text-[12px] text-ink-mute">— {m.responderName ?? m.groupLabel}</p>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  )
}
