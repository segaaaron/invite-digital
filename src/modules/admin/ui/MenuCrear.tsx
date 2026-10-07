'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { PlusIcon } from '@/shared/design/ui/icons'

/**
 * **El único punto de alta del admin.** Había cinco sueltos —«+ Nuevo evento», «Créalo sin
 * acceso», «Crear el evento con este pedido», «+ Agregar usuario» y el alta del equipo de un
 * evento—, cada uno con su formulario. Ahora es un menú, y cada opción abre el suyo en la
 * pantalla donde vive lo creado.
 */
export const CREAR = [
  { href: '/panel/admin/ventas?crear=cotizacion', titulo: 'Cotización', detalle: 'Plan, diseño y precio para un cliente, con su enlace de pago' },
  { href: '/panel/admin/eventos?crear=evento', titulo: 'Evento', detalle: 'Una boda, unos XV o un cumpleaños, con o sin acceso del cliente' },
  { href: '/panel/admin/usuarios?crear=persona', titulo: 'Persona del equipo', detalle: 'Admin, atelier o recepción con cuenta' },
] as const

export function MenuCrear() {
  const menu = useRef<HTMLDetailsElement>(null)
  const cerrar = () => menu.current?.removeAttribute('open')
  return (
    <details className="group relative" ref={menu}>
      <summary
        aria-label="Crear"
        className="flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-shell-deep max-[859px]:size-11 max-[859px]:p-0 bg-linear-to-b from-shell to-shell-deep px-3 py-2 text-white shadow-[0_2px_8px_rgb(0_0_0/0.25),inset_0_1px_0_rgb(255_255_255/0.12)] transition-transform hover:-translate-y-px min-[560px]:px-4 [&::-webkit-details-marker]:hidden"
      >
        <PlusIcon className="size-4 transition-transform duration-200 group-open:rotate-45" />
        <span className="hidden font-mono text-[10px] tracking-[0.25em] uppercase min-[560px]:inline">Crear</span>
      </summary>
      <div className="absolute top-[calc(100%+10px)] right-0 z-40 w-[300px] origin-top-right rounded-[18px] border border-line-panel bg-bg-raised p-2 shadow-lift motion-safe:animate-slide-up">
        <p className="px-3 pt-2 pb-1.5 font-mono text-[10px] tracking-[0.18em] text-ink-mute uppercase">Crear</p>
        <ul>
          {CREAR.map((c) => (
            <li key={c.href}>
              <Link className="flex flex-col gap-0.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-bg-sunken/70 focus-visible:bg-bg-sunken/70" href={c.href} onClick={cerrar}>
                <span className="font-display text-[17px] leading-tight text-ink">{c.titulo}</span>
                <span className="text-[12px] leading-snug text-ink-mute">{c.detalle}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}
