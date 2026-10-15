import { CalendarIcon } from '@/shared/design/ui/icons'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { Pill } from '@/shared/design/ui/panel/PanelKit'
import Link from 'next/link'
import { yaSeCelebro } from '../domain/celebrado'
import type { Event } from '../domain/event'
import { fiestaDeTema } from '../domain/fiesta'
import { portadaParaCompartir } from './themes/portada-para-compartir'
import { tr } from '@/shared/i18n/idioma-servidor'
import { traducir } from '@/shared/i18n/en-ingles'
import { INTL } from '@/shared/i18n/t'

const FIESTA = { boda: 'Boda', xv: 'XV años', cumple: 'Cumpleaños' } as const
const formatos = (intl: string) => ({
  dia: new Intl.DateTimeFormat(intl, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }),
  diaYAnio: new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
})
const FORMATOS = { es: formatos(INTL.es), en: formatos(INTL.en) }

/** Cómo va cada evento, contado por la página: confirmados de cuántas personas. */
export type AvanceDelEvento = { readonly vienen: number; readonly personas: number }

/**
 * «Mis eventos» (E32): cada evento con la portada de su invitación, la fiesta y el día, en qué está y cómo va. Los
 * celebrados se ven, dichos, y se abren para mirar.
 */
export async function EventList({ events, avance = {} }: { events: readonly Event[]; avance?: Readonly<Record<string, AvanceDelEvento>> }) {
  const t = await tr()
  const { dia: DIA, diaYAnio: DIA_Y_ANIO } = FORMATOS[t('es', 'en') === 'es' ? 'es' : 'en']
  const ahora = new Date()
  if (events.length === 0) {
    return <EmptyState description={t('Crea la primera boda o los primeros quince: su invitación, sus invitados y su planner viven dentro.', 'Create the first wedding or quinceañera: its invitation, guests and planner live inside.')} icon={<CalendarIcon />} title={t('Aún no hay eventos', 'No events yet')} />
  }
  const hoy = Date.parse(`${ahora.toISOString().slice(0, 10)}T00:00:00Z`)
  const algunoCelebrado = events.some((e) => yaSeCelebro(e.eventDate, ahora))

  return (
    <div className="flex flex-col gap-6">
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6 max-[767px]:grid-cols-1 max-[767px]:gap-3">
        {events.map((event) => {
          const fecha = new Date(`${event.eventDate}T00:00:00Z`)
          const celebrado = yaSeCelebro(event.eventDate, ahora)
          const dias = Math.round((fecha.getTime() - hoy) / 86_400_000)
          const cuenta = avance[event.id]
          const portada = portadaParaCompartir(event.themeKey)
          const estado = celebrado
            ? { texto: t('Celebrado', 'Held'), tono: 'neutro' as const }
            : event.status === 'draft'
              ? { texto: t('Preparando', 'Preparing'), tono: 'vip' as const }
              : { texto: dias === 0 ? t('Hoy', 'Today') : dias === 1 ? t('Mañana', 'Tomorrow') : t(`En ${dias} días`, `In ${dias} days`), tono: 'maybe' as const }
          const progreso = cuenta === undefined || cuenta.personas === 0 ? (celebrado ? 1 : event.status === 'draft' ? 0.25 : 0) : cuenta.vienen / cuenta.personas
          const linea = celebrado
            ? t(`Celebrado${cuenta && cuenta.vienen > 0 ? `. ${cuenta.vienen} personas fueron` : ''}`, `Held${cuenta && cuenta.vienen > 0 ? `. ${cuenta.vienen} people attended` : ''}`)
            : event.status === 'draft'
              ? t('Escribiendo la invitación', 'Writing the invitation')
              : cuenta && cuenta.personas > 0
                ? t(`${cuenta.vienen} de ${cuenta.personas} confirmaron`, `${cuenta.vienen} of ${cuenta.personas} confirmed`)
                : t('Invitación lista, sin invitados', 'Invitation ready, no guests')
          return (
            <li key={event.id}>
              {/* Escritorio: la portada grande encima (E32). Celular: una fila con su miniatura, en su tarjeta (M32). */}
              <Link
                className="group grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-ink no-underline max-[767px]:rounded-[16px] max-[767px]:border max-[767px]:border-line-panel max-[767px]:bg-bg-raised max-[767px]:p-3.5 min-[768px]:flex min-[768px]:flex-col"
                href={`/panel/eventos/${event.slug}`}
              >
                <span className="row-span-5 block w-[84px] self-start overflow-hidden rounded-[10px] border border-line-panel bg-bg-sunken transition-colors group-hover:border-gold max-[767px]:aspect-[3/4] min-[768px]:mb-2 min-[768px]:aspect-[9/16] min-[768px]:w-auto min-[768px]:rounded-[16px]">
                  {portada ? (
                    // La portada del diseño, decorativa: el nombre del evento va debajo, en texto.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="size-full object-cover" loading="lazy" src={portada} />
                  ) : null}
                </span>
                <span className="font-display text-[26px] leading-tight font-medium max-[767px]:text-[21px]">{event.title}</span>
                <span className="text-[14.5px] text-ink-mute max-[767px]:text-[13.5px]">
                  {traducir(FIESTA[fiestaDeTema(event.themeKey)], t)}, {fecha.getUTCFullYear() === ahora.getUTCFullYear() ? DIA.format(fecha) : DIA_Y_ANIO.format(fecha)}
                </span>
                <span className="min-[768px]:mt-1">
                  <Pill tone={estado.tono}>{estado.texto}</Pill>
                </span>
                <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-line-panel max-[767px]:hidden min-[768px]:mt-2">
                  <span className="block h-full rounded-full bg-shell-deep" style={{ width: `${Math.min(1, progreso) * 100}%` }} />
                </span>
                <span className="text-[13.5px] text-ink-mute">{linea}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      {algunoCelebrado ? <p className="text-[14px] text-ink-mute">{t('Los celebrados se pueden mirar, pero ya no se editan.', 'Held events can be viewed, but no longer edited.')}</p> : null}
    </div>
  )
}
