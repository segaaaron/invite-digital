'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ABRIR_MENU } from '@/shared/design/ui/panel/avisos-del-panel'
import { esEntradaActiva } from './nav'
import { NAV_ICONS } from './nav-icons'
import { useNavegacion } from './navegacion'

/** Cuántas secciones van a la vista; la quinta pestaña es «Menú», con todas. */
const A_LA_VISTA = 4

/** Las que más se usan, por rol: el admin trabaja con ventas y eventos; quien celebra, con su invitación y su lista. */
const PRIMERO: readonly string[] = ['Hoy', 'Ventas', 'Eventos', 'Clientes', 'Resumen', 'Mi invitación', 'Invitados', 'Mesas']

/**
 * **La barra de pestañas del celular** (13 oct, pedido del usuario: «el menú no es intuitivo»). La maqueta
 * escondía toda la navegación en la isla de arriba y nada decía que se tocaba ahí. Ahora, abajo y siempre a
 * la vista, las cuatro secciones que más usa quien entra (`PRIMERO`; si no tiene tantas, las siguientes de su menú) y «Menú», que
 * abre el menú guiado completo (`MenuMovil`). Es el patrón que cualquiera reconoce en un teléfono.
 *
 * Solo por debajo de 768 px. Mide 64 px más el borde seguro: lo que flota abajo (Luxury, «Añadir», avisos)
 * se pinta por encima con `bottom-[calc(76px+env(safe-area-inset-bottom))]`.
 */
export function BarraInferiorMovil() {
  const nav = useNavegacion()
  const ruta = usePathname()
  if (nav === null) return null
  const items = nav.sections.flatMap((s) => s.items)
  if (items.length === 0) return null
  // Primero las de uso diario que tenga quien entra; si no llegan a cuatro, las siguientes de su menú.
  const vista = [...items.filter((i) => PRIMERO.includes(i.label)).sort((a, b) => PRIMERO.indexOf(a.label) - PRIMERO.indexOf(b.label)), ...items.filter((i) => !PRIMERO.includes(i.label))].slice(0, A_LA_VISTA)
  const enOtra = !vista.some((item) => esEntradaActiva(item, ruta))
  const pestana = 'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 pt-1.5 pb-1 text-[11px] leading-tight font-medium no-underline'

  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line-panel bg-bg-raised/96 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-16px_rgb(12_36_32/0.3)] backdrop-blur-md min-[768px]:hidden print:hidden"
    >
      {vista.map((item) => {
        const activa = esEntradaActiva(item, ruta)
        return (
          <Link aria-current={activa ? 'page' : undefined} className={`${pestana} min-h-16 ${activa ? 'text-shell-deep' : 'text-ink-mute'}`} href={item.href} key={item.href}>
            <span aria-hidden className={`relative grid h-7 w-12 place-items-center rounded-full ${activa ? 'bg-pill-maybe' : ''}`}>
              {NAV_ICONS[item.icon]}
              {item.count ? <span className="absolute -top-0.5 right-1 size-2 rounded-full bg-gold-deep" /> : null}
            </span>
            <span className="w-full truncate text-center">{item.label}</span>
          </Link>
        )
      })}
      <button
        aria-haspopup="dialog"
        className={`${pestana} min-h-16 cursor-pointer ${enOtra ? 'text-shell-deep' : 'text-ink-mute'}`}
        onClick={() => window.dispatchEvent(new Event(ABRIR_MENU))}
        type="button"
      >
        <span aria-hidden className={`grid h-7 w-12 place-items-center rounded-full ${enOtra ? 'bg-pill-maybe' : ''}`}>
          <svg className="size-5.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" viewBox="0 0 24 24">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </span>
        <span>Menú</span>
      </button>
    </nav>
  )
}
