'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Pestana = { readonly href: string; readonly label: string }

/**
 * Las pantallas hermanas de cada entrada del admin, como pestañas: Ventas reúne consultas,
 * pedidos y lo cobrado; Catálogo, modelos, planes y extras; Ajustes, el equipo, el cobro, la
 * auditoría y la cuenta. Antes eran quince entradas sueltas en la barra.
 *
 * Se pintan una sola vez, desde la carcasa, según la ruta: ninguna página puede olvidarlas.
 */
export const GRUPOS_DEL_ADMIN: readonly (readonly Pestana[])[] = [
  [
    { href: '/panel/admin/ventas', label: 'Tablero' },
    { href: '/panel/admin/consultas', label: 'Consultas' },
    { href: '/panel/pedidos', label: 'Pedidos' },
    { href: '/panel/admin/ingresos', label: 'Resultados' },
  ],
  [
    { href: '/panel/admin/modelos', label: 'Modelos' },
    { href: '/panel/admin/planes', label: 'Planes' },
    { href: '/panel/admin/extras', label: 'Extras' },
  ],
  [
    { href: '/panel/admin/usuarios', label: 'Equipo' },
    { href: '/panel/admin/pagos', label: 'Cobros' },
    { href: '/panel/admin/auditoria', label: 'Auditoría' },
    { href: '/panel/cuenta', label: 'Mi cuenta' },
  ],
]

export function PestanasDeAdmin() {
  const ruta = usePathname()
  const grupo = GRUPOS_DEL_ADMIN.find((pestanas) => pestanas.some((p) => p.href === ruta))
  if (grupo === undefined) return null
  return (
    <nav aria-label="Secciones" className="-mt-1 mb-6 overflow-x-auto border-b border-line-panel">
      <ul className="flex min-w-max gap-6">
        {grupo.map((p) => {
          const activa = p.href === ruta
          return (
            <li key={p.href}>
              <Link
                aria-current={activa ? 'page' : undefined}
                className={`-mb-px block border-b-2 pb-3 text-[13.5px] transition-colors ${
                  activa ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:border-line-panel-strong hover:text-ink'
                }`}
                href={p.href}
              >
                {p.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
