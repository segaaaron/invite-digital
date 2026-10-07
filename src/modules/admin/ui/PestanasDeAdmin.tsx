'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

/** `corta`: lo que dice en un teléfono, donde la fila no cabe entera. */
type Pestana = { readonly href: string; readonly label: string; readonly corta?: string }

/**
 * Las pantallas hermanas de cada entrada del admin, como pestañas. **Una pantalla por cosa**
 * (28 de septiembre): Ventas ya no tiene bandejas de Consultas y Pedidos aparte —son la misma
 * venta—, Eventos suma su calendario, el Escaparate junta lo que ve el público y la cuenta
 * propia sale de Ajustes al menú del usuario.
 */
export const GRUPOS_DEL_ADMIN: readonly (readonly Pestana[])[] = [
  [
    { href: '/panel/admin/ventas', label: 'Embudo' },
    { href: '/panel/admin/ingresos', label: 'Ingresos' },
  ],
  [
    { href: '/panel/admin/eventos', label: 'Cartera' },
    { href: '/panel/admin/eventos/calendario', label: 'Calendario' },
  ],
  [
    { href: '/panel/admin/modelos', label: 'Modelos' },
    { href: '/panel/admin/planes', label: 'Planes' },
    { href: '/panel/admin/extras', label: 'Extras' },
    { href: '/panel/admin/web', label: 'La web' },
  ],
  [
    { href: '/panel/admin/usuarios', label: 'Equipo' },
    { href: '/panel/admin/pagos', label: 'Cobros' },
    { href: '/panel/admin/mensajes', label: 'Mensajes y agenda', corta: 'Mensajes' },
    { href: '/panel/admin/asistente', label: 'Asistente' },
    { href: '/panel/admin/fallos', label: 'Registro de fallos', corta: 'Fallos' },
    { href: '/panel/admin/auditoria', label: 'Auditoría' },
  ],
]

/** El grupo de la ruta actual, si es una pantalla con hermanas. */
export const grupoDe = (ruta: string) => GRUPOS_DEL_ADMIN.find((pestanas) => pestanas.some((p) => p.href === ruta))

/** Las pestañas de la sección, dentro de la barra superior. Sin hermanas, no pinta nada. */
export function PestanasDeAdmin() {
  const ruta = usePathname()
  const grupo = grupoDe(ruta)
  const fila = useRef<HTMLElement>(null)
  // En un teléfono la activa puede quedar fuera, tras el desvanecido: se trae a la vista.
  useEffect(() => {
    fila.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [ruta])
  if (grupo === undefined) return null
  return (
    // En un teléfono la fila se desliza: el borde derecho se desvanece para que se note que sigue.
    <nav
      aria-label="Secciones"
      ref={fila}
      className="-mb-px min-w-0 overflow-x-auto [scrollbar-width:none] max-[559px]:[mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)]"
    >
      <ul className="flex min-w-max gap-1 max-[559px]:pr-6">
        {grupo.map((p) => {
          const activa = p.href === ruta
          return (
            <li key={p.href}>
              <Link
                aria-current={activa ? 'page' : undefined}
                className={`flex min-h-11 items-center rounded-full px-2.5 py-1.5 text-[13px] transition-colors min-[860px]:block min-[860px]:min-h-0 min-[560px]:px-3.5 min-[560px]:text-[13px] ${
                  activa ? 'bg-ink text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]' : 'text-ink-soft hover:bg-white hover:text-ink'
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
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
