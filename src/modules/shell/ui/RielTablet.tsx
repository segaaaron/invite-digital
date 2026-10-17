'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { esEntradaActiva, type NavItem, type NavSection } from './nav'
import { NAV_ICONS } from './nav-icons'
import { useNavegacion } from './navegacion'
import { ABRIR_BUSCADOR, ABRIR_MENU } from '@/shared/design/ui/panel/avisos-del-panel'
import { iniciales, SelloLA } from './PanelSidebar'
import { useT } from '@/shared/i18n/idioma-navegador'
import { traductor, type T } from '@/shared/i18n/t'

/** Cómo se llama cada entrada en el carril, donde caben dos palabras cortas (maqueta T17). */
const CORTOS: Readonly<Record<string, string>> = {
  'Mi invitación': 'Invitación',
  'Libro de firmas': 'Firmas',
  'Ingreso al evento': 'Ingreso',
  'Equipo y recepción': 'Equipo',
  'My invitation': 'Invitation',
  'Event check-in': 'Check-in',
  'Team and reception': 'Team',
}

/** El nombre de una sección que el carril junta en una sola entrada. */
const JUNTAS = new Set(['Organizar', 'Organize', 'Planner'])

type Entrada = { readonly item: NavItem; readonly label: string; readonly activa: boolean; readonly grupo: readonly NavItem[] | null }

/**
 * **Lo que va en el carril**. Fuera de un evento, todas las entradas (el admin tiene siete). Dentro de uno, como en la
 * maqueta: las de «Mi evento» una a una, las secciones de una o dos entradas también, y las largas (Organizar,
 * Ajustes) juntas en una sola —«Planear»— que abre su primera pantalla; sus hermanas van en pestañas arriba.
 */
export function entradasDelRiel(sections: readonly NavSection[], enEvento: boolean, ruta: string, t: T = traductor('es')): Entrada[] {
  return sections.flatMap((s, i): Entrada[] => {
    const juntar = enEvento && i > 0 && s.items.length > 2
    if (!juntar) return s.items.map((item) => ({ item, label: CORTOS[item.label] ?? item.label, activa: esEntradaActiva(item, ruta), grupo: null }))
    const primera = s.items[0]
    if (primera === undefined) return []
    return [{ item: primera, label: JUNTAS.has(s.label) ? t('Planear', 'Plan') : s.label, activa: s.items.some((item) => esEntradaActiva(item, ruta)), grupo: s.items }]
  })
}

const ENTRADA =
  'relative flex min-h-[52px] w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-center text-[12px] leading-tight font-medium no-underline transition-colors'

/**
 * **El carril de la tablet** (768–1279 px, maqueta «Esmeralda y Latón»): 92 px de esmeralda con el sello —o la
 * portada del evento—, el buscador si quien entra es admin, cada sección con su icono y su nombre corto, y abajo las
 * iniciales de quien entró, que abren el menú completo (Mi cuenta, cerrar sesión y todo lo demás).
 */
export function RielTablet() {
  const t = useT()
  const nav = useNavegacion()
  const ruta = usePathname()
  if (nav === null) return null
  const { sections, evento, user } = nav
  // Dentro de un evento, «Ajustes» (equipo, extras, configuración) no va en el carril: se llega por «Más» y, ya
  // dentro, sus hermanas van en pestañas arriba (maqueta T21 · T28).
  const entradas = entradasDelRiel(sections, evento !== null, ruta, t).filter((e) => !(evento !== null && e.grupo !== null && e.label === t('Ajustes', 'Settings')))

  return (
    <nav
      aria-label={t('Navegación principal', 'Main navigation')}
      className="fixed inset-y-0 left-0 z-40 hidden w-[92px] flex-col items-center gap-1 overflow-y-auto bg-shell-deep bg-[radial-gradient(160%_50%_at_0%_0%,var(--color-shell)_0%,var(--color-shell-deep)_60%)] px-2 pt-[max(env(safe-area-inset-top),14px)] pb-4 text-shell-soft min-[768px]:max-[1279px]:flex print:hidden"
    >
      {evento === null ? (
        <Link aria-label={t('Ir al inicio', 'Go home')} className="mb-3" href={entradas[0]?.item.href ?? '/panel'}>
          <SelloLA size={44} />
        </Link>
      ) : evento.portada ? (
        // Miniatura de la portada del diseño; el nombre del evento lo lleva como texto alternativo.
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={evento.title} className="mb-3 h-[60px] w-10 shrink-0 rounded-md object-cover shadow-[0_6px_14px_rgb(0_0_0/0.35)]" src={evento.portada} />
      ) : (
        <span className="mb-3 line-clamp-2 px-1 text-center font-display text-[13px] leading-tight text-gold-light">{evento.title}</span>
      )}
      {nav.conBuscador ? (
        <button className={`${ENTRADA} cursor-pointer text-shell-soft hover:bg-shell-ink/7 hover:text-shell-ink`} onClick={() => window.dispatchEvent(new Event(ABRIR_BUSCADOR))} type="button">
          <span aria-hidden className="grid size-5 place-items-center">
            {NAV_ICONS.buscar}
          </span>
          {t('Buscar', 'Search')}
        </button>
      ) : null}
      <ul className="flex w-full flex-col gap-1">
        {entradas.map(({ item, label, activa }) => (
          <li key={item.href}>
            <Link
              aria-current={activa ? 'page' : undefined}
              className={`${ENTRADA} ${activa ? 'bg-bg text-shell-deep' : 'text-shell-soft hover:bg-shell-ink/7 hover:text-shell-ink'}`}
              href={item.href}
            >
              <span aria-hidden className="grid size-5 place-items-center">
                {NAV_ICONS[item.icon]}
              </span>
              <span className="line-clamp-2">{label}</span>
              {item.count ? (
                <span className="absolute top-1 right-3.5 min-w-4.5 rounded-full bg-gold px-1 text-[12px] leading-4.5 font-semibold text-shell-deep">
                  {item.count}
                  {item.countLabel ? <span className="sr-only"> {item.countLabel}</span> : null}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      {evento === null ? (
        <button
          aria-haspopup="dialog"
          aria-label={t('Más: tu cuenta y todo el menú', 'More: your account and the full menu')}
          className="mt-auto grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-avatar text-[13px] font-semibold text-shell-deep"
          onClick={() => window.dispatchEvent(new Event(ABRIR_MENU))}
          type="button"
        >
          {iniciales(user)}
        </button>
      ) : (
        <button
          aria-haspopup="dialog"
          className={`${ENTRADA} mt-auto cursor-pointer text-shell-soft hover:bg-shell-ink/7 hover:text-shell-ink`}
          onClick={() => window.dispatchEvent(new Event(ABRIR_MENU))}
          type="button"
        >
          <svg aria-hidden className="size-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="1.7" />
            <circle cx="12" cy="12" r="1.7" />
            <circle cx="19" cy="12" r="1.7" />
          </svg>
          {t('Más', 'More')}
        </button>
      )}
    </nav>
  )
}

/**
 * **Las pestañas de la sección que el carril junta** (maqueta T21: «Tareas · Presupuesto · Proveedores…»), bajo la
 * barra de arriba y solo en tablet. En escritorio cada una está en la barra lateral; en el celular, en el menú.
 */
export function SubpestanasDeTablet() {
  const t = useT()
  const nav = useNavegacion()
  const ruta = usePathname()
  if (nav === null || nav.evento === null) return null
  const grupo = entradasDelRiel(nav.sections, true, ruta, t).find((e) => e.activa && e.grupo !== null)?.grupo
  if (!grupo) return null
  return (
    <nav aria-label={t('Pestañas de la sección', 'Section tabs')} className="hidden overflow-x-auto border-b border-line-panel px-8 [scrollbar-width:none] min-[768px]:max-[1279px]:block print:hidden">
      <ul className="flex min-w-max gap-7">
        {grupo.map((item) => {
          const activa = esEntradaActiva(item, ruta)
          return (
            <li key={item.href}>
              <Link
                aria-current={activa ? 'page' : undefined}
                className={`-mb-px flex h-12 min-w-11 items-center justify-center border-b-[1.5px] px-0.5 text-[15px] font-medium whitespace-nowrap no-underline transition-colors ${
                  activa ? 'border-gold text-shell-deep' : 'border-transparent text-ink-mute hover:text-shell-deep'
                }`}
                href={item.href}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
