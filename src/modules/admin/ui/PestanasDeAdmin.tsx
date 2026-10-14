'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
import { ArrowLeftIcon } from '@/shared/design/ui/icons'

/** `corta`: lo que dice en un teléfono, donde la fila no cabe entera. */
type Pestana = { readonly href: string; readonly label: string; readonly corta?: string }

/** Una entrada del admin con sus pantallas hermanas. */
type Seccion = { readonly nombre: string; readonly pestanas: readonly Pestana[] }

/**
 * **Las secciones del admin y sus pestañas, como en la maqueta «Esmeralda y Latón»** (12 de octubre): Catálogo
 * (Modelos · Planes · Extras) y Ajustes (Registro de fallos · Equipo · Cobros · Asistente Luxury · La web · Mensajes
 * y agenda · Auditoría). Las demás entradas son una sola pantalla; Eventos guarda su calendario como hermana, sin
 * pestañas (se llega desde Hoy y ⌘K), solo para que la barra diga dónde se está.
 */
export const SECCIONES_DEL_ADMIN: readonly Seccion[] = [
  { nombre: 'Hoy', pestanas: [{ href: '/panel/admin', label: 'Hoy' }] },
  { nombre: 'Ventas', pestanas: [{ href: '/panel/admin/ventas', label: 'Ventas' }] },
  { nombre: 'Clientes', pestanas: [{ href: '/panel/admin/clientes', label: 'Clientes' }] },
  { nombre: 'Ingresos', pestanas: [{ href: '/panel/admin/ingresos', label: 'Ingresos' }] },
  {
    nombre: 'Eventos',
    pestanas: [
      { href: '/panel/admin/eventos', label: 'Eventos' },
      { href: '/panel/admin/eventos/calendario', label: 'Calendario' },
    ],
  },
  {
    nombre: 'Catálogo',
    pestanas: [
      { href: '/panel/admin/modelos', label: 'Modelos' },
      { href: '/panel/admin/planes', label: 'Planes' },
      { href: '/panel/admin/extras', label: 'Extras' },
    ],
  },
  {
    nombre: 'Ajustes',
    pestanas: [
      { href: '/panel/admin/fallos', label: 'Registro de fallos', corta: 'Fallos' },
      { href: '/panel/admin/usuarios', label: 'Equipo' },
      { href: '/panel/admin/pagos', label: 'Cobros' },
      { href: '/panel/admin/asistente', label: 'Asistente Luxury', corta: 'Luxury' },
      { href: '/panel/admin/web', label: 'La web' },
      { href: '/panel/admin/mensajes', label: 'Mensajes y agenda', corta: 'Mensajes' },
      { href: '/panel/admin/auditoria', label: 'Auditoría' },
    ],
  },
]

/** La sección y la pestaña de una ruta del admin, para la ruta de la barra de arriba («Catálogo / Modelos»). */
export const dondeEnElAdmin = (ruta: string): { seccion: string; pestana: string | null } | null => {
  for (const s of SECCIONES_DEL_ADMIN) {
    const p = s.pestanas.find((x) => x.href === ruta)
    if (p !== undefined) return { seccion: s.nombre, pestana: s.pestanas.length > 1 && p.label !== s.nombre ? p.label : null }
  }
  return null
}

/**
 * Las pestañas de la sección bajo su título, subrayadas en latón, con la cuenta al lado cuando la hay
 * («Modelos 20»). Solo las secciones con más de una pantalla visible: Catálogo y Ajustes.
 */
export function PestanasDeAdmin({ cuentas = {} }: { cuentas?: Readonly<Record<string, number | null | undefined>> }) {
  const ruta = usePathname()
  const seccion = SECCIONES_DEL_ADMIN.find((s) => s.pestanas.length > 2 && s.pestanas.some((p) => p.href === ruta))
  const fila = useRef<HTMLElement>(null)
  // En un teléfono la activa puede quedar fuera, tras el desvanecido: se trae a la vista.
  useEffect(() => {
    fila.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [ruta])
  if (seccion === undefined) return null
  return (
    <nav
      aria-label="Pestañas"
      // En el celular, Ajustes no lleva pestañas: cada ajuste es su pantalla, con «← Ajustes» arriba (M69–M74).
      className={`${seccion.nombre === 'Ajustes' ? 'max-[767px]:hidden ' : ''}mb-8 overflow-x-auto border-b border-line-panel [scrollbar-width:none] max-[859px]:mb-5 max-[859px]:[mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)]`}
      ref={fila}
    >
      <ul className="flex min-w-max gap-7 max-[859px]:gap-5 max-[859px]:pr-6">
        {seccion.pestanas.map((p) => {
          const activa = p.href === ruta
          const cuenta = cuentas[p.href]
          return (
            <li key={p.href}>
              <Link
                aria-current={activa ? 'page' : undefined}
                className={`-mb-px flex h-[46px] items-center gap-2 border-b-[1.5px] px-0.5 text-[15px] font-medium whitespace-nowrap no-underline transition-colors ${
                  activa ? 'border-gold text-shell-deep' : 'border-transparent text-ink-mute hover:text-shell-deep'
                }`}
                href={p.href}
              >
                {p.corta === undefined ? (
                  p.label
                ) : (
                  <>
                    <span className="min-[560px]:hidden">{p.corta}</span>
                    <span className="max-[559px]:hidden">{p.label}</span>
                  </>
                )}
                {cuenta ? <span className="text-[12.5px] font-normal text-ink-mute">{cuenta}</span> : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/**
 * **Dónde se está, a la izquierda de la barra de arriba** (maqueta): la fecha en Hoy, y en las demás la ruta
 * —«Catálogo / Modelos»—, con la pantalla actual más oscura.
 */
export function RutaDelAdmin({ hoy }: { hoy: string }) {
  const ruta = usePathname()
  if (ruta === '/panel/admin') return <span>{hoy}</span>
  const donde = dondeEnElAdmin(ruta)
  if (donde === null) return null
  return (
    <nav aria-label="Ruta" className="flex items-center gap-2 text-[14px]">
      <span className={donde.pestana === null ? 'font-medium text-ink' : ''}>{donde.seccion}</span>
      {donde.pestana === null ? null : (
        <>
          <span aria-hidden>/</span>
          <span className="font-medium text-ink">{donde.pestana}</span>
        </>
      )}
    </nav>
  )
}

/**
 * **La isla del celular dentro de un ajuste** (maqueta M69–M74): en lugar del menú, «← Ajustes / Equipo», que vuelve a
 * la lista de ajustes. En cualquier otra pantalla deja el menú (`menu`).
 */
export function IslaDelAdmin({ menu }: { menu: ReactNode }) {
  const ruta = usePathname()
  const ajuste = SECCIONES_DEL_ADMIN.find((s) => s.nombre === 'Ajustes')?.pestanas.find((p) => p.href === ruta)
  if (ajuste === undefined) return <>{menu}</>
  return (
    <>
      <span className="contents [&_[data-contexto]]:hidden">{menu}</span>
      <Link className="flex min-w-0 flex-1 items-center gap-2 text-ink no-underline min-[768px]:hidden" href="/panel/admin/ajustes">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center">
          <ArrowLeftIcon className="size-5" />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-[13px] text-ink-mute">Ajustes</span>
          <span className="truncate text-[16px] font-medium">{ajuste.label}</span>
        </span>
        <span className="sr-only">: volver a los ajustes</span>
      </Link>
    </>
  )
}
