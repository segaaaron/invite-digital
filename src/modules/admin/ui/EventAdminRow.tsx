'use client'

import Link from 'next/link'
import { MenuDeAcciones, Semaforo, opcionDeMenu, type FiestaDeLista, type TonoDeSalud } from '@/shared/design/ui/panel/lista'
import { Pill } from '@/shared/design/ui/panel/PanelKit'
import { WhatsAppIcon, EyeIcon } from '@/shared/design/ui/icons'
import { enlaceWhatsapp } from '@/shared/whatsapp'
import { ETAPAS, type Etapa } from '../domain/cartera'
import { EntrarComoCliente } from './EntrarComoCliente'
import type { Anfitrion } from './SoporteDeBoda'
import { COLUMNAS_DE_CARTERA } from './columnas-de-cartera'

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



const SEMANA = new Intl.DateTimeFormat('es-BO', { weekday: 'short', timeZone: 'UTC' })

/**
 * **Una fila de la cartera, como la tabla de la maqueta** (E03): la fecha en grande, el evento con su fiesta, diseño y
 * plan, quién es el cliente (y quién lo lleva), la etapa, el avance de las confirmaciones y «Abrir». Lo demás —ver la
 * invitación, escribir al cliente, entrar como él— va en «⋯». En el celular, una tarjeta.
 */
export function EventAdminRow({ event }: { event: EventAdminView }) {
  const etapa = ETAPAS.find((e) => e.clave === event.etapa) ?? ETAPAS[0]
  const cliente = event.anfitriones[0]
  const conTelefono = event.anfitriones.find((a) => (a.phone ?? '') !== '')
  const whatsapp = conTelefono?.phone ? enlaceWhatsapp(conTelefono.phone, `Hola, te escribimos de Luxury Atelier por ${event.title}.`) : null
  const fecha = new Date(`${event.eventDate}T00:00:00Z`)
  const ficha = `/panel/eventos/${event.slug}/configuracion`
  const ratio = event.grupos === 0 ? 0 : event.respondidos / event.grupos
  const fiesta = event.fiesta === 'xv' ? 'XV años' : event.fiesta === 'cumple' ? 'Cumpleaños' : 'Boda'
  const avance =
    event.grupos === 0
      ? event.etapa === 'borrador'
        ? 'Falta escribir la invitación'
        : 'Invitación lista, sin invitados'
      : event.etapa === 'repartiendo'
        ? `${event.enviados} de ${event.grupos} invitaciones enviadas`
        : `${event.respondidos} de ${event.grupos} confirmaron`

  return (
    <li className={`group relative grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-line-panel px-3.5 py-3.5 transition-colors hover:bg-fila ${COLUMNAS_DE_CARTERA} max-[859px]:px-0`}>
      <span className="text-center">
        <span className="block font-display text-[30px] leading-[0.95] font-medium">{DIA.format(fecha).padStart(2, '0')}</span>
        <span className="text-[12px] text-ink-mute">
          {MES.format(fecha).replace('.', '')}, {SEMANA.format(fecha).replace('.', '')}
        </span>
      </span>

      <span className="min-w-0">
        {/* El enlace cubre la fila entera (`after:`): toda la fila abre la ficha. */}
        <Link className="font-medium text-ink no-underline after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-gold" href={ficha}>
          {event.title}
        </Link>
        <span className="block truncate text-[13px] text-ink-mute max-[859px]:hidden">
          {fiesta} «{event.modelo}», plan {event.planNombre ?? 'sin asignar'} · {ANIO.format(fecha)}
        </span>
        {event.salud.tono === 'ok' ? null : (
          <span className="mt-0.5 block text-[12.5px] max-[859px]:hidden">
            <Semaforo tono={event.salud.tono}>
              {event.salud.texto}
              {event.salud.mas > 0 ? ` · y ${event.salud.mas} más` : ''}
            </Semaforo>
          </span>
        )}
      </span>

      <span className="min-w-0 text-[14.5px] max-[859px]:hidden">
        <span className="block truncate" title={event.anfitriones.map((a) => a.email).join(', ')}>
          {cliente === undefined ? <span className="text-ink-mute">Sin cliente</span> : cliente.email}
          {event.anfitriones.length > 1 ? <span className="text-ink-mute"> y {event.anfitriones.length - 1} más</span> : null}
        </span>
        <span className="block truncate text-[12px] text-ink-mute">{event.ownerEmail === null ? 'Sin responsable' : `Lo lleva ${event.ownerEmail}`}</span>
      </span>

      <span className="max-[859px]:col-start-3 max-[859px]:row-start-1 max-[859px]:self-start">
        <Pill tone={etapa.tono}>{etapa.etiqueta}</Pill>
      </span>

      <span className="flex min-w-0 flex-col gap-1.5 max-[859px]:col-span-2 max-[859px]:col-start-2 max-[859px]:-mt-1">
        {event.grupos === 0 ? null : (
          <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-line-panel">
            <span className="block h-full bg-shell-deep" style={{ width: `${(event.etapa === 'repartiendo' ? event.enviados / event.grupos : ratio) * 100}%` }} />
          </span>
        )}
        <span className="text-[12.5px] text-ink-mute">{avance}</span>
      </span>

      {/* Encima del enlace de la fila (`relative z-10`): abrir la ficha y lo demás en «⋯». */}
      <span className="relative z-10 flex items-center gap-1.5 justify-self-end max-[859px]:hidden">
        <Link className="hidden min-h-[38px] items-center rounded-[10px] border border-line-panel-strong bg-bg-raised px-3.5 text-[14px] font-medium text-ink no-underline hover:border-gold min-[860px]:inline-flex" href={ficha} tabIndex={-1}>
          Abrir
        </Link>
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
