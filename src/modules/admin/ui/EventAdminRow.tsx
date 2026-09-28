'use client'

import Image from '@/shared/design/ui/ImagenConCarga'
import Link from 'next/link'
import { EtiquetaDeFiesta, MenuDeAcciones, Semaforo, opcionDeMenu, type FiestaDeLista, type TonoDeSalud } from '@/shared/design/ui/panel/lista'
import { Pill } from '@/shared/design/ui/panel/PanelKit'
import { WhatsAppIcon, EyeIcon } from '@/shared/design/ui/icons'
import { enlaceWhatsapp } from '@/shared/whatsapp'
import { ETAPAS, type Etapa } from '../domain/cartera'
import { EntrarComoCliente } from './EntrarComoCliente'
import type { Anfitrion } from './SoporteDeBoda'

const DIA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', timeZone: 'UTC' })
const MES = new Intl.DateTimeFormat('es-BO', { month: 'short', timeZone: 'UTC' })
const ANIO = new Intl.DateTimeFormat('es-BO', { year: 'numeric', timeZone: 'UTC' })

export type EventAdminView = {
  readonly id: string
  readonly slug: string
  readonly title: string
  readonly eventDate: string
  readonly ownerEmail: string | null
  readonly planNombre: string | null
  /** La portada del diseño, o `null` si es un tema antiguo sin portada en el catálogo. */
  readonly portada: string | null
  /** El nombre del modelo: «Botánica», «Mascarada». Un retirado lo dice. */
  readonly modelo: string
  readonly fiesta: FiestaDeLista
  readonly grupos: number
  readonly enviados: number
  readonly respondidos: number
  readonly etapa: Etapa
  /** «en 12 días», «hoy», «hace 3 meses». Lo compone la página con la fecha de Bolivia. */
  readonly cuando: string
  readonly salud: { readonly tono: TonoDeSalud; readonly texto: string; readonly mas: number }
  /** Los anfitriones, para darles soporte: entrar como ellos o escribirles. */
  readonly anfitriones: readonly Anfitrion[]
}


/**
 * **Una fila de la cartera**: la portada y la fecha para reconocerla, la fiesta, la etapa y **su
 * salud con la razón en palabras**, quién es el cliente y cómo van las confirmaciones. La fila
 * entera abre la ficha; lo demás —ver la invitación, entrar como el cliente, escribirle— va en
 * «⋯». Eran tres botones por fila y veinte botones negros por pantalla.
 */
export function EventAdminRow({ event }: { event: EventAdminView }) {
  const etapa = ETAPAS.find((e) => e.clave === event.etapa) ?? ETAPAS[0]
  const cliente = event.anfitriones[0]
  const conTelefono = event.anfitriones.find((a) => (a.phone ?? '') !== '')
  const whatsapp = conTelefono?.phone ? enlaceWhatsapp(conTelefono.phone, `Hola, te escribimos de Luxury Atelier por ${event.title}.`) : null
  const fecha = new Date(`${event.eventDate}T00:00:00Z`)
  const ficha = `/panel/eventos/${event.slug}/configuracion`
  // Quien respondió abrió su invitación aunque la visita no se contara (otro navegador, sin JS).
  const ratio = event.grupos === 0 ? 0 : event.respondidos / event.grupos

  return (
    <li className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 rounded-[18px] border border-line-panel bg-white px-3 py-3 shadow-card transition-[box-shadow,border-color] hover:border-ink/25 hover:shadow-float @min-[760px]:grid-cols-[auto_minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)_40px] @min-[760px]:px-4">
      {/* La portada con la fecha encima: por el título no se reconoce una invitación, por su portada sí. */}
      <span className="relative block h-[78px] w-[58px] shrink-0 overflow-hidden rounded-[12px] bg-bg-sunken ring-1 ring-line-panel">
        {event.portada === null ? (
          <span aria-hidden className="absolute inset-0 grid place-items-center bg-linear-to-br from-bg-top to-bg-sunken font-display text-[26px] text-ink-mute/70 italic">
            {event.title.slice(0, 1)}
          </span>
        ) : (
          <Image alt="" className="object-cover object-top" fill sizes="58px" src={event.portada} />
        )}
        <span className="absolute inset-x-1 bottom-1 flex flex-col items-center rounded-[8px] bg-white/95 py-0.5 shadow-card">
          <span className="font-display text-[16px] leading-none text-ink [font-variant-numeric:lining-nums]">{DIA.format(fecha)}</span>
          <span className="font-mono text-[8.5px] tracking-[0.14em] text-ink-mute uppercase">{MES.format(fecha).replace('.', '')}</span>
        </span>
      </span>

      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-2">
          {/* El enlace cubre la fila entera (`after:`): toda la fila abre la ficha. */}
          <Link className="truncate font-display text-[19px] leading-tight text-ink after:absolute after:inset-0 after:rounded-[18px] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ink" href={ficha}>
            {event.title}
          </Link>
          <EtiquetaDeFiesta fiesta={event.fiesta} />
          <Pill tone={etapa.tono}>{etapa.etiqueta}</Pill>
        </span>
        <span className="truncate text-[12px] text-ink-mute first-letter:uppercase">
          {event.cuando} · {ANIO.format(fecha)} · {event.modelo} · plan {event.planNombre ?? 'sin asignar'}
        </span>
        <Semaforo tono={event.salud.tono}>
          {event.salud.texto}
          {event.salud.mas > 0 ? ` · y ${event.salud.mas} más` : ''}
        </Semaforo>
      </span>

      <span className="col-span-3 flex min-w-0 flex-col gap-0.5 @min-[760px]:col-span-1">
        <span className="font-mono text-[9.5px] tracking-[0.18em] text-ink-mute uppercase">Cliente</span>
        <span className="truncate text-[13px] text-ink" title={event.anfitriones.map((a) => a.email).join(', ')}>
          {cliente === undefined ? <span className="text-ink-mute">Sin acceso · lo llevas tú</span> : cliente.email}
          {event.anfitriones.length > 1 ? <span className="text-ink-mute"> y {event.anfitriones.length - 1} más</span> : null}
        </span>
        <span className="truncate text-[11.5px] text-ink-mute">{event.ownerEmail === null ? 'Sin responsable' : `Lo lleva ${event.ownerEmail}`}</span>
      </span>

      <span className="col-span-2 flex min-w-0 flex-col gap-1.5 @min-[760px]:col-span-1">
        {event.grupos === 0 ? (
          <>
            <span className="font-mono text-[9.5px] tracking-[0.18em] text-ink-mute uppercase">Confirmaciones</span>
            <span className="text-[12.5px] text-ink-mute">Sin invitaciones todavía</span>
          </>
        ) : (
          <>
            <span className="flex items-baseline justify-between">
              <span className="font-mono text-[9.5px] tracking-[0.18em] text-ink-mute uppercase">Confirmaciones</span>
              <span className="font-display text-[16px] whitespace-nowrap text-ink [font-variant-numeric:lining-nums]">{Math.round(ratio * 100)} %</span>
            </span>
            <span
              aria-label={`${event.enviados} de ${event.grupos} invitaciones enviadas, ${event.respondidos} respondieron`}
              className="relative h-1.5 overflow-hidden rounded-full bg-bg-sunken"
              role="img"
            >
              <span className="absolute inset-y-0 left-0 rounded-full bg-gold/35" style={{ width: `${(event.enviados / event.grupos) * 100}%` }} />
              <span className="absolute inset-y-0 left-0 rounded-full bg-sage" style={{ width: `${ratio * 100}%` }} />
            </span>
            <span className="font-mono text-[10px] text-ink-mute [font-variant-numeric:lining-nums]">
              {event.respondidos} de {event.grupos} respondieron · {event.enviados} enviadas
            </span>
          </>
        )}
      </span>

      {/* «⋯» encima del enlace de la fila (`relative z-10`): lo que no es abrir la ficha. */}
      <span className="relative z-10 col-start-3 row-start-1 self-start justify-self-end @min-[760px]:col-start-5 @min-[760px]:row-start-auto @min-[760px]:self-center">
        <MenuDeAcciones etiqueta={`Más acciones de ${event.title}`}>
          <Link className={opcionDeMenu()} href={`/panel/eventos/${event.slug}/vista-previa`}>
            <EyeIcon className="size-4" /> Ver la invitación
          </Link>
          {whatsapp === null ? null : (
            <a className={opcionDeMenu()} href={whatsapp} rel="noopener noreferrer" target="_blank">
              <WhatsAppIcon className="size-4" /> Escribir al cliente
            </a>
          )}
          <EntrarComoCliente anfitriones={event.anfitriones} claseDelBoton={opcionDeMenu()} eventId={event.id} />
        </MenuDeAcciones>
      </span>
    </li>
  )
}
