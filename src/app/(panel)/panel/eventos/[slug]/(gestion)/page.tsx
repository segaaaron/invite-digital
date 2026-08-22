import Link from 'next/link'
import { notFound } from 'next/navigation'
import { checkin, events, guestbook, guests, plans, rsvp, venue } from '@/app/composition/container'
import { unreadCount } from '@/modules/guestbook'
import { ArrivalStrip } from '@/modules/checkin/ui/ArrivalStrip'
import type { GuestGroupRowView } from '@/modules/guests/ui/GuestGroupTable'
import { requireSession } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { DonutChart, PanelCard, StatCard } from '@/modules/shell/ui/cards'
import { isErr } from '@/shared/result'

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession()
  const { slug } = await params

  const event = await events.getBySlug(slug)
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const groups = await guests.list(event.value.id)
  // La última respuesta de cada grupo, una consulta por grupo. Con listas de invitados
  // de decenas de filas no compensa una consulta agregada; si un evento crece a
  // centenares, `tallyRowsFor` ya trae la forma que haría falta.
  const filas: GuestGroupRowView[] = isErr(groups)
    ? []
    : await Promise.all(
        groups.value.map(async (group) => ({
          ...group,
          confirmed: (await rsvp.latestFor(group.id))?.attending ?? null,
        })),
      )

  const tally = await rsvp.tally(event.value.id)

  // Cuánta gente ha llegado. Solo se lee si el plan trae la puerta: sin ella no hay
  // llegadas que contar, y una tira de ceros haría creer que la recepción ya empezó.
  // La comprobación vive aquí, en la página: `checkin` no sabe nada de planes.
  const conPuerta = await plans.requireFeature(event.value.id, 'checkin')
  const puerta = isErr(conPuerta) ? null : await checkin.state(event.value.id)
  const llegadas = puerta === null || isErr(puerta) ? null : puerta.value.tally

  // Los cupos ya salen en las tarjetas de arriba: repetirlos aquí era ruido.
  const t = isErr(tally) ? null : tally.value
  const respondieron = filas.filter((f) => f.confirmed !== null).length
  const pendientes = filas.length - respondieron
  const noAsisten = filas.filter((f) => f.confirmed === 0).length

  // El salón, para el panel de distribución de mesas del resumen. Si el plan no lo trae,
  // no se pinta: enseñar mesas vacías haría creer que el salón está sin repartir.
  // Los mensajes sin leer, para la acción rápida.
  const libroResumen = await guestbook.list(event.value.id)
  const sinLeerResumen = isErr(libroResumen) ? 0 : unreadCount(libroResumen.value)

  const conSalon = await plans.requireFeature(event.value.id, 'seating')
  const salon = isErr(conSalon) ? null : await venue.seating(event.value.id)
  const mesas = salon === null || isErr(salon) ? null : salon.value

  const fecha = new Date(`${event.value.eventDate}T00:00:00`).toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <>
      <PanelHeader
        actions={
          <>
            <Link
              className="rounded-full border border-line px-4 py-2 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink uppercase"
              href={`/panel/eventos/${event.value.slug}/configuracion`}
            >
              Compartir enlace
            </Link>
            <Link
              className="rounded-full bg-gold px-4 py-2 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-white uppercase"
              href={`/panel/eventos/${event.value.slug}/invitados`}
            >
              + Invitar
            </Link>
          </>
        }
        kicker={`Panel · ${event.value.title}`}
        meta={fecha}
        title={`Bienvenida, ${event.value.title}`}
      />
      <div className="mb-5.5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard label="Invitados" value={filas.length} icon="✉" detail={`${t ? t.seatsInvited : 0} cupos repartidos`} />
        <StatCard
          label="Confirmados"
          value={t ? t.seatsConfirmed : 0}
          suffix={`/ ${t ? t.seatsInvited : 0}`}
          icon="✓"
          progress={t && t.seatsInvited > 0 ? t.seatsConfirmed / t.seatsInvited : 0}
        />
        <StatCard label="Pendientes" value={t ? t.groupsPending : pendientes} icon="◔" />
        <StatCard label="Personas dentro" value={llegadas ? llegadas.headsInside : '—'} icon="⛩" />
      </div>

      <div className="mb-5.5 grid gap-4.5 lg:grid-cols-[1.6fr_1fr]">
        <PanelCard title="Estado de los RSVP">
          <DonutChart
            big={filas.length === 0 ? '—' : `${Math.round((respondieron / filas.length) * 100)}%`}
            caption="RESPONDIERON"
            slices={[
              { label: 'Asistirán', value: respondieron - noAsisten, color: 'var(--color-sage)' },
              { label: 'No podrán', value: noAsisten, color: 'var(--color-danger)' },
              { label: 'Sin responder', value: pendientes, color: 'var(--color-gold-light)' },
            ]}
          />
        </PanelCard>
        <PanelCard title="Llegada">
          <ArrivalStrip tally={llegadas} />
        </PanelCard>
      </div>

      <div className="flex flex-col gap-4.5">
        <PanelCard
          action={
            <Link
              className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-gold-deep uppercase"
              href={`/panel/eventos/${event.value.slug}/invitados`}
            >
              Ver todos →
            </Link>
          }
          title="Invitados recientes"
        >
          {isErr(groups) ? (
            <p className="text-[13px] text-gold-deep" role="alert">
              No pudimos leer los invitados. La base no responde; vuelve a intentarlo en un momento.
            </p>
          ) : filas.length === 0 ? (
            <p className="text-[14px] text-ink-soft">
              Todavía no hay invitados. Se cargan en la sección Invitados de la barra.
            </p>
          ) : (
            <ul className="flex flex-col">
              {filas.slice(0, 5).map((fila) => (
                <li
                  key={fila.id}
                  className="flex flex-wrap items-center gap-3 border-b border-dotted border-line py-2.5 last:border-none"
                >
                  <span className="flex-1 text-[14px] text-ink">{fila.label}</span>
                  <span className="font-mono text-[12px] text-ink-soft">{`${fila.confirmed ?? '—'} / ${fila.seats}`}</span>
                  <span className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
                    {fila.revokedAt !== null ? 'Revocada' : fila.confirmed === null ? 'Pendiente' : 'Confirmada'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>


        <div className="grid gap-4.5 lg:grid-cols-2">
          <PanelCard
            action={
              <Link
                className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-gold-deep uppercase"
                href={`/panel/eventos/${event.value.slug}/mesas`}
              >
                Editar asignaciones →
              </Link>
            }
            title="Distribución de mesas"
          >
            {mesas === null ? (
              <p className="text-[13px] text-ink-mute">El plan de este evento no incluye el plano del salón.</p>
            ) : mesas.tables.length === 0 ? (
              <p className="text-[13px] text-ink-mute">Todavía no hay mesas. Se crean en la sección Mesas.</p>
            ) : (
              <>
                <ul className="flex flex-wrap gap-2.5">
                  {mesas.tables.map((mesa) => {
                    const sentados = mesa.taken
                    return (
                      <li
                        key={mesa.id}
                        className="flex size-20 flex-col items-center justify-center rounded-full border border-line bg-bg-top text-center"
                      >
                        <span className="font-mono text-[10px] text-ink-mute uppercase">{mesa.label}</span>
                        <span className="font-mono text-[13px] text-ink">
                          {sentados}/{sentados + mesa.free}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-4 flex justify-between font-mono text-[11px] text-ink-mute">
                  <span>{mesas.tables.length} mesas</span>
                  <span>{mesas.unseated.length} grupos sin mesa</span>
                </p>
              </>
            )}
          </PanelCard>

          <PanelCard title="Acciones rápidas">
            <div className="flex flex-col gap-2.5">
              {[
                { href: `/panel/eventos/${event.value.slug}/invitados`, t: 'Invitar a un grupo', d: 'Genera su enlace propio' },
                { href: `/panel/eventos/${event.value.slug}/configuracion`, t: 'Editar la invitación', d: 'Fecha, plantilla e idioma' },
                { href: `/panel/eventos/${event.value.slug}/mensajes`, t: 'Leer los mensajes', d: `${sinLeerResumen} sin leer` },
                { href: `/panel/eventos/${event.value.slug}/checkin`, t: 'Preparar la puerta', d: 'Escáner y lista de llegada' },
              ].map((accion) => (
                <Link
                  key={accion.href}
                  className="flex flex-col gap-0.5 rounded-2xl border border-line bg-bg-top/60 px-4 py-3 transition-colors hover:border-gold/50"
                  href={accion.href}
                >
                  <span className="text-[14px] text-ink">{accion.t}</span>
                  <span className="text-[11px] text-ink-mute">{accion.d}</span>
                </Link>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-linear-to-br from-sage to-[var(--color-sage-deep)] p-4 text-white">
              <p className="font-mono text-[9px] tracking-[0.3em] opacity-85 uppercase">Recordatorio</p>
              <p className="mt-1.5 font-display text-[20px] italic">Fecha límite de confirmación</p>
              <p className="mt-1.5 text-[12px] opacity-85">
                {new Date(`${event.value.rsvpDeadline}T00:00:00`).toLocaleDateString('es-BO', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </PanelCard>
        </div>
      </div>
    </>
  )
}
