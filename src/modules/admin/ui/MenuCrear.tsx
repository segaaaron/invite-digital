'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { CalendarIcon, PlusIcon, ReceiptIcon, UsersIcon } from '@/shared/design/ui/icons'

/**
 * **El único punto de alta del admin.** Había cinco sueltos —«+ Nuevo evento», «Créalo sin
 * acceso», «Crear el evento con este pedido», «+ Agregar usuario» y el alta del equipo de un
 * evento—, cada uno con su formulario. Ahora es un menú, y cada opción abre el suyo en la
 * pantalla donde vive lo creado.
 */
export const CREAR = [
  { href: '/panel/admin/eventos?crear=evento', titulo: 'Evento para un cliente', detalle: 'Ya pagó o lo cobras por fuera', icono: 'evento' },
  { href: '/panel/admin/ventas?crear=cotizacion', titulo: 'Cotización', detalle: 'Precio armado para enviar por WhatsApp', icono: 'cotizacion' },
  { href: '/panel/admin/usuarios?crear=persona', titulo: 'Persona del equipo', detalle: 'Admin o atelier, con su propia cuenta', icono: 'persona' },
] as const

const ICONO = { evento: CalendarIcon, cotizacion: ReceiptIcon, persona: UsersIcon } as const

export function MenuCrear() {
  const menu = useRef<HTMLDetailsElement>(null)
  const cerrar = () => menu.current?.removeAttribute('open')
  return (
    <details className="group relative" ref={menu}>
      <summary
        aria-label="Crear"
        className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-[10px] bg-gold px-4.5 text-[14.5px] font-medium text-shell-deep transition-colors hover:bg-gold-hover [&::-webkit-details-marker]:hidden"
      >
        <PlusIcon className="size-[18px] transition-transform duration-200 group-open:rotate-45" />
        Crear
      </summary>
      {/* El menú de la maqueta (E50): cada alta con su icono, qué es y para qué. */}
      <div className="absolute top-[calc(100%+10px)] right-0 z-40 w-[320px] origin-top-right rounded-[16px] border border-line-panel bg-bg-raised p-2 shadow-lift motion-safe:animate-slide-up">
        <ul>
          {CREAR.map((c) => {
            const Icono = ICONO[c.icono]
            return (
              <li key={c.href}>
                <Link className="flex items-center gap-3.5 rounded-[12px] px-3 py-3 text-ink no-underline transition-colors hover:bg-fila focus-visible:bg-fila" href={c.href} onClick={cerrar}>
                  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-pill-pending text-gold-deep">
                    <Icono className="size-4" />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] leading-tight font-medium">{c.titulo}</span>
                    <span className="text-[13px] leading-snug text-ink-mute">{c.detalle}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </details>
  )
}
