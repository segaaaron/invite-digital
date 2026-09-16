'use client'

import Image from 'next/image'
import Link from 'next/link'
import { LABEL_CLASS, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { ETAPAS, type Etapa } from '../domain/cartera'
import { EntrarComoCliente } from './EntrarComoCliente'
import type { Anfitrion } from './SoporteDeBoda'

const DIA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', timeZone: 'UTC' })
const MES = new Intl.DateTimeFormat('es-BO', { month: 'short', year: '2-digit', timeZone: 'UTC' })

export type EventAdminView = {
  readonly id: string
  readonly slug: string
  readonly title: string
  readonly eventDate: string
  readonly ownerEmail: string | null
  readonly ownerId: string | null
  readonly planSlug: string | null
  readonly planNombre: string | null
  /** La portada del diseño, o `null` si es un tema antiguo sin portada en el catálogo. */
  readonly portada: string | null
  /** El nombre del modelo: «Botánica», «Mascarada». */
  readonly modelo: string
  readonly grupos: number
  readonly enviados: number
  readonly respondidos: number
  readonly etapa: Etapa
  /** «en 12 días», «hoy», «hace 3 meses». Lo compone la página con la fecha de Bolivia. */
  readonly cuando: string
  /** Los anfitriones, para darles soporte: entrar como ellos o restablecer su acceso. */
  readonly anfitriones: readonly Anfitrion[]
}

/**
 * Una fila de la cartera del admin: de quién es, cómo va y sus tres destinos. **Nada se cambia
 * aquí**: responsable, plan, acceso del cliente y borrar viven una sola vez, en la ficha del
 * evento («Editar datos»). Estuvieron repetidos en un «Gestionar» plegado en cada fila.
 */
export function EventAdminRow({ event }: { event: EventAdminView }) {
  const etapa = ETAPAS.find((e) => e.clave === event.etapa) ?? ETAPAS[0]
  const fecha = new Date(`${event.eventDate}T00:00:00Z`)

  return (
    <li className="flex flex-col overflow-hidden rounded-[18px] border border-line-panel bg-white shadow-card transition-shadow hover:shadow-float">
      <div className="flex flex-col min-[700px]:flex-row">
        {/* La portada del diseño: por el título no se reconoce una invitación, por su
            portada sí. Lleva a la vista previa de ese evento. */}
        <Link
          aria-label={`Ver la invitación de ${event.title}`}
          className="relative block aspect-[16/9] shrink-0 overflow-hidden bg-bg-sunken min-[700px]:aspect-auto min-[700px]:w-[168px]"
          href={`/panel/eventos/${event.slug}/vista-previa`}
        >
          {event.portada === null ? (
            <span aria-hidden className="absolute inset-0 bg-linear-to-br from-shell to-shell-deep" />
          ) : (
            <Image alt="" className="object-cover object-top transition-transform duration-300 hover:scale-[1.04] motion-reduce:transition-none" fill sizes="(max-width: 700px) 100vw, 168px" src={event.portada} />
          )}
          <span className="absolute top-2.5 left-2.5 flex flex-col items-center rounded-xl bg-white/95 px-2.5 py-1 shadow-card">
            <span className="font-display text-[22px] leading-none text-ink [font-variant-numeric:lining-nums]">{DIA.format(fecha)}</span>
            <span className="font-mono text-[8px] tracking-[0.2em] text-ink-mute uppercase">{MES.format(fecha).replace('.', '')}</span>
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-3.5 p-4 min-[700px]:p-5">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <span className="flex min-w-0 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2.5">
                <Link className="font-display text-[22px] leading-tight text-ink underline-offset-4 hover:underline" href={`/panel/eventos/${event.slug}/configuracion`}>
                  {event.title}
                </Link>
                <Pill tone={etapa.tono}>{etapa.etiqueta}</Pill>
              </span>
              <span className="text-[12px] text-ink-soft first-letter:uppercase">
                {event.cuando} · {event.modelo} · plan {event.planNombre ?? 'sin plan'}
              </span>
            </span>
            <span className="flex flex-wrap gap-2">
              {/* Tres destinos distintos, cada uno dice cuál: la ficha que edita el admin, la
                  invitación tal como la recibe el invitado y el panel del cliente. «Abrir» y
                  «Ver» no decían qué se abría ni qué se veía. */}
              <EntrarComoCliente anfitriones={event.anfitriones} eventId={event.id} variant="primary" />
              <PanelButton href={`/panel/eventos/${event.slug}/configuracion`}>Editar datos</PanelButton>
              <PanelButton href={`/panel/eventos/${event.slug}/vista-previa`}>Ver invitación</PanelButton>
            </span>
          </div>

          <div className="grid gap-3 min-[560px]:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            {/* Lo primero es **de quién es la boda**: el cliente que entra a su panel. Quien la
                lleva (el atelier o el admin) va debajo, más pequeño: es un dato de gestión. */}
            <span className="flex min-w-0 items-center gap-2.5">
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-bg-sunken font-display text-[14px] text-ink-soft uppercase">
                {(event.anfitriones[0]?.email ?? '?').slice(0, 1)}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className={LABEL_CLASS}>Cliente</span>
                {event.anfitriones.length === 0 ? (
                  <span className="text-[13px] text-ink-mute">Sin acceso de cliente todavía</span>
                ) : (
                  <span className="truncate text-[13px] text-ink" title={event.anfitriones.map((a) => a.email).join(', ')}>
                    {event.anfitriones[0]?.email}
                    {event.anfitriones.length > 1 ? <span className="text-ink-mute"> y {event.anfitriones.length - 1} más</span> : null}
                  </span>
                )}
                <span className="truncate text-[11.5px] text-ink-mute">
                  {event.ownerEmail === null ? <Pill tone="no">Sin responsable</Pill> : <>Lo lleva {event.ownerEmail}</>}
                </span>
              </span>
            </span>

            {event.grupos === 0 ? (
              <span className="flex flex-col justify-center">
                <span className={LABEL_CLASS}>Invitados</span>
                <span className="text-[13px] text-ink-mute">Todavía sin invitaciones</span>
              </span>
            ) : (
              <span className="flex flex-col gap-1.5">
                <span className="flex items-baseline justify-between">
                  <span className={LABEL_CLASS}>Confirmaciones</span>
                  <span className="font-display text-[16px] text-ink [font-variant-numeric:lining-nums]">
                    {Math.round((event.respondidos / event.grupos) * 100)}%
                  </span>
                </span>
                <span
                  aria-label={`${event.enviados} de ${event.grupos} enlaces repartidos, ${event.respondidos} respondieron`}
                  className="relative h-2 overflow-hidden rounded-full bg-bg-sunken"
                  role="img"
                >
                  <span className="absolute inset-y-0 left-0 rounded-full bg-gold/35" style={{ width: `${(event.enviados / event.grupos) * 100}%` }} />
                  <span className="absolute inset-y-0 left-0 rounded-full bg-sage" style={{ width: `${(event.respondidos / event.grupos) * 100}%` }} />
                </span>
                <span className="flex justify-between font-mono text-[10px] text-ink-soft [font-variant-numeric:lining-nums]">
                  <span>{event.grupos} invitaciones</span>
                  <span>{event.enviados} enviados</span>
                  <span>{event.respondidos} respondieron</span>
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}
