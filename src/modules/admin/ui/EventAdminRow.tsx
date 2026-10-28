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
import { traducir } from '@/shared/i18n/en-ingles'
import { useIdioma, useT } from '@/shared/i18n/idioma-navegador'
import type { Locale } from '@/shared/i18n/locales'
import { INTL } from '@/shared/i18n/t'


export type EventAdminView = {
  readonly id: string
  readonly slug: string
  readonly title: string
  readonly eventDate: string
  readonly ownerEmail: string | null
  readonly planNombre: string | null
  /** La portada del diseño, o `null` si es un tema antiguo sin portada en el catálogo. */
  readonly portada: string | null
  /** El nombre del modelo: «Botánica», «Mascarada». `null` si el diseño se retiró. */
  readonly modelo: string | null
  readonly fiesta: FiestaDeLista
  readonly grupos: number
  readonly enviados: number
  readonly respondidos: number
  /** Personas de sus invitaciones y cuántas respondieron: la misma unidad que el panel del cliente. */
  readonly personas: number
  readonly personasRespondieron: number
  readonly etapa: Etapa
  /** «en 12 días», «hoy», «hace 3 meses». Lo compone la página con la fecha de Bolivia. */
  readonly cuando: string
  readonly salud: { readonly tono: TonoDeSalud; readonly texto: string; readonly mas: number }
  /** Los anfitriones, para darles soporte: entrar como ellos o escribirles. */
  readonly anfitriones: readonly Anfitrion[]
}



const formatos = (locale: Locale) => ({
  DIA: new Intl.DateTimeFormat(INTL[locale], { day: 'numeric', timeZone: 'UTC' }),
  MES: new Intl.DateTimeFormat(INTL[locale], { month: 'short', timeZone: 'UTC' }),
  ANIO: new Intl.DateTimeFormat(INTL[locale], { year: 'numeric', timeZone: 'UTC' }),
  SEMANA: new Intl.DateTimeFormat(INTL[locale], { weekday: 'short', timeZone: 'UTC' }),
})

/**
 * **Una fila de la cartera, como la tabla de la maqueta** (E03): la fecha en grande, el evento con su fiesta, diseño y
 * plan, quién es el cliente (y quién lo lleva), la etapa, el avance de las confirmaciones y «Abrir». Lo demás —ver la
 * invitación, escribir al cliente, entrar como él— va en «⋯». En el celular, una tarjeta.
 */
export function EventAdminRow({ event }: { event: EventAdminView }) {
  const t = useT()
  const locale = useIdioma()
  const { DIA, MES, ANIO, SEMANA } = formatos(locale)
  const etapa = ETAPAS.find((e) => e.clave === event.etapa) ?? ETAPAS[0]
  const cliente = event.anfitriones[0]
  const conTelefono = event.anfitriones.find((a) => (a.phone ?? '') !== '')
  const whatsapp = conTelefono?.phone ? enlaceWhatsapp(conTelefono.phone, t(`Hola, te escribimos de Luxury Atelier por ${event.title}.`, `Hi, we are writing from Luxury Atelier about ${event.title}.`)) : null
  const fecha = new Date(`${event.eventDate}T00:00:00Z`)
  const ficha = `/dashboard/events/${event.slug}/setup`
  const ratio = event.personas === 0 ? 0 : event.personasRespondieron / event.personas
  const fiesta = event.fiesta === 'xv' ? t('XV años', 'Quinceañera') : event.fiesta === 'cumple' ? t('Cumpleaños', 'Birthday') : t('Boda', 'Wedding')
  const avance =
    event.grupos === 0
      ? event.etapa === 'borrador'
        ? t('Falta escribir la invitación', 'Invitation not written yet')
        : t('Invitación lista, sin invitados', 'Invitation ready, no guests')
      : event.personas === 0
        ? t('Sin personas cargadas', 'No people added')
        : t(`${event.personasRespondieron} de ${event.personas} personas respondieron`, `${event.personasRespondieron} of ${event.personas} people replied`)
  // Una sola medida en la barra (las respuestas); el reparto, si falta, dicho debajo.
  const faltaRepartir = event.grupos > 0 && event.enviados < event.grupos ? t(`${event.enviados} de ${event.grupos} ${event.grupos === 1 ? 'invitación enviada' : 'invitaciones enviadas'}`, `${event.enviados} of ${event.grupos} invitations sent`) : null

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
        <span className="block truncate text-[13px] text-ink-mute max-[859px]:hidden" title={`${fiesta} · ${event.modelo ?? ''} · ${event.planNombre ?? ''}`}>
          {fiesta} {event.modelo === null ? t('(diseño retirado)', '(withdrawn design)') : `«${event.modelo}»`}, {t('plan', 'plan')} {event.planNombre ?? t('sin asignar', 'unassigned')} · {ANIO.format(fecha)}
        </span>
        {event.salud.tono === 'ok' ? null : (
          <span className="mt-0.5 block text-[12.5px] max-[859px]:hidden">
            <Semaforo tono={event.salud.tono}>
              {traducir(event.salud.texto, t)}
              {event.salud.mas > 0 ? t(` · y ${event.salud.mas} más`, ` · and ${event.salud.mas} more`) : ''}
            </Semaforo>
          </span>
        )}
      </span>

      <span className="min-w-0 text-[14.5px] max-[859px]:hidden">
        <span className="block truncate" title={event.anfitriones.map((a) => a.email).join(', ')}>
          {cliente === undefined ? <span className="text-ink-mute">{t('Sin cliente', 'No client')}</span> : (cliente.nombre ?? cliente.email)}
          {event.anfitriones.length > 1 ? <span className="text-ink-mute">{t(` y ${event.anfitriones.length - 1} más`, ` and ${event.anfitriones.length - 1} more`)}</span> : null}
        </span>
        <span className="block truncate text-[12px] text-ink-mute" title={event.ownerEmail ?? undefined}>{event.ownerEmail === null ? t('Sin responsable', 'No one responsible') : t(`Lo lleva ${event.ownerEmail}`, `Run by ${event.ownerEmail}`)}</span>
      </span>

      <span className="max-[859px]:col-start-3 max-[859px]:row-start-1 max-[859px]:self-start">
        <Pill tone={etapa.tono}>{traducir(etapa.etiqueta, t)}</Pill>
      </span>

      <span className="flex min-w-0 flex-col gap-1.5 max-[859px]:col-span-2 max-[859px]:col-start-2 max-[859px]:-mt-1">
        {event.grupos === 0 ? null : (
          <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-line-panel">
            <span className="block h-full bg-shell-deep" style={{ width: `${ratio * 100}%` }} />
          </span>
        )}
        <span className="text-[12.5px] text-ink-mute">{avance}</span>
        {faltaRepartir === null ? null : <span className="text-[12.5px] text-ink-mute">{faltaRepartir}</span>}
      </span>

      {/* Encima del enlace de la fila (`relative z-10`): abrir la ficha y lo demás en «⋯». */}
      <span className="relative z-10 flex items-center gap-1.5 justify-self-end max-[859px]:hidden">
        <Link className="hidden min-h-[38px] items-center rounded-[10px] border border-line-panel-strong bg-bg-raised px-3.5 text-[14px] font-medium text-ink no-underline hover:border-gold min-[860px]:inline-flex" href={ficha} tabIndex={-1}>
          {t('Abrir', 'Open')}
        </Link>
        <MenuDeAcciones etiqueta={t(`Más acciones de ${event.title}`, `More actions for ${event.title}`)}>
          <Link className={opcionDeMenu()} href={`/dashboard/events/${event.slug}/preview`}>
            <EyeIcon className="size-4" /> {t('Ver la invitación', 'See the invitation')}
          </Link>
          {whatsapp === null ? null : (
            <a className={opcionDeMenu()} href={whatsapp} rel="noopener noreferrer" target="_blank">
              <WhatsAppIcon className="size-4" /> {t('Escribir al cliente', 'Message the client')}
            </a>
          )}
          <EntrarComoCliente anfitriones={event.anfitriones} claseDelBoton={opcionDeMenu()} eventId={event.id} />
        </MenuDeAcciones>
      </span>
    </li>
  )
}
