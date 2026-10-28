'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
import { ArrowLeftIcon } from '@/shared/design/ui/icons'
import { traducir } from '@/shared/i18n/en-ingles'
import { useT } from '@/shared/i18n/idioma-navegador'

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
  { nombre: 'Hoy', pestanas: [{ href: '/dashboard/admin', label: 'Hoy' }] },
  { nombre: 'Ventas', pestanas: [{ href: '/dashboard/admin/sales', label: 'Ventas' }] },
  { nombre: 'Clientes', pestanas: [{ href: '/dashboard/admin/clients', label: 'Clientes' }] },
  { nombre: 'Ingresos', pestanas: [{ href: '/dashboard/admin/revenue', label: 'Ingresos' }] },
  { nombre: 'Demos', pestanas: [{ href: '/dashboard/admin/demos', label: 'Demos' }] },
  {
    nombre: 'Eventos',
    pestanas: [
      { href: '/dashboard/admin/events', label: 'Eventos' },
      { href: '/dashboard/admin/events/calendar', label: 'Calendario' },
    ],
  },
  {
    nombre: 'Catálogo',
    pestanas: [
      { href: '/dashboard/admin/designs', label: 'Modelos' },
      { href: '/dashboard/admin/plans', label: 'Planes' },
      { href: '/dashboard/admin/extras', label: 'Extras' },
    ],
  },
  {
    nombre: 'Ajustes',
    pestanas: [
      // Lo que se configura a menudo primero; el registro de fallos y la auditoría, que se consultan, al final (16 oct).
      { href: '/dashboard/admin/users', label: 'Equipo' },
      { href: '/dashboard/admin/payments', label: 'Cobros' },
      { href: '/dashboard/admin/web', label: 'La web' },
      { href: '/dashboard/admin/messages', label: 'Mensajes y agenda', corta: 'Mensajes' },
      { href: '/dashboard/admin/assistant', label: 'Asistente Luxury', corta: 'Luxury' },
      { href: '/dashboard/admin/errors', label: 'Registro de fallos', corta: 'Fallos' },
      { href: '/dashboard/admin/audit', label: 'Auditoría' },
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
  const t = useT()
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
      aria-label={t('Pestañas', 'Tabs')}
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
                className={`-mb-px flex h-[46px] min-w-11 items-center justify-center gap-2 border-b-[1.5px] px-0.5 text-[15px] font-medium whitespace-nowrap no-underline transition-colors ${
                  activa ? 'border-gold text-shell-deep' : 'border-transparent text-ink-mute hover:text-shell-deep'
                }`}
                href={p.href}
              >
                {p.corta === undefined ? (
                  traducir(p.label, t)
                ) : (
                  <>
                    <span className="min-[560px]:hidden">{traducir(p.corta, t)}</span>
                    <span className="max-[559px]:hidden">{traducir(p.label, t)}</span>
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
  const t = useT()
  const ruta = usePathname()
  if (ruta === '/dashboard/admin') return <span>{hoy}</span>
  const donde = dondeEnElAdmin(ruta)
  if (donde === null) return null
  return (
    <nav aria-label={t('Ruta', 'Path')} className="flex items-center gap-2 text-[14px]">
      <span className={donde.pestana === null ? 'font-medium text-ink' : ''}>{traducir(donde.seccion, t)}</span>
      {donde.pestana === null ? null : (
        <>
          <span aria-hidden>/</span>
          <span className="font-medium text-ink">{traducir(donde.pestana, t)}</span>
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
  const t = useT()
  const ruta = usePathname()
  const ajuste = SECCIONES_DEL_ADMIN.find((s) => s.nombre === 'Ajustes')?.pestanas.find((p) => p.href === ruta)
  if (ajuste === undefined) return <>{menu}</>
  return (
    <>
      <span className="contents [&_[data-contexto]]:hidden">{menu}</span>
      <Link className="flex min-w-0 flex-1 items-center gap-2 text-ink no-underline min-[768px]:hidden" href="/dashboard/admin/settings">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center">
          <ArrowLeftIcon className="size-5" />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-[13px] text-ink-mute">{t('Ajustes', 'Settings')}</span>
          <span className="truncate text-[16px] font-medium">{traducir(ajuste.label, t)}</span>
        </span>
        <span className="sr-only">{t(': volver a los ajustes', ': back to settings')}</span>
      </Link>
    </>
  )
}
