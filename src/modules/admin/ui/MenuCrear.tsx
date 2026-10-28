'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { CalendarIcon, CloseIcon, PlusIcon, ReceiptIcon, UsersIcon } from '@/shared/design/ui/icons'
import { traducir } from '@/shared/i18n/en-ingles'
import { useDesplegable } from '@/shared/design/ui/panel/desplegable'
import { useT } from '@/shared/i18n/idioma-navegador'

/**
 * **El único punto de alta del admin.** Había cinco sueltos —«+ Nuevo evento», «Créalo sin
 * acceso», «Crear el evento con este pedido», «+ Agregar usuario» y el alta del equipo de un
 * evento—, cada uno con su formulario. Ahora es un menú, y cada opción abre el suyo en la
 * pantalla donde vive lo creado.
 */
export const CREAR = [
  { href: '/dashboard/admin/events?crear=evento', titulo: 'Evento para un cliente', detalle: 'Ya pagó o lo cobras por fuera', icono: 'evento' },
  { href: '/dashboard/admin/sales?crear=cotizacion', titulo: 'Cotización', detalle: 'Precio armado para enviar por WhatsApp', icono: 'cotizacion' },
  { href: '/dashboard/admin/users?crear=persona', titulo: 'Persona del equipo', detalle: 'Admin o atelier, con su propia cuenta', icono: 'persona' },
] as const

const ICONO = { evento: CalendarIcon, cotizacion: ReceiptIcon, persona: UsersIcon } as const

export function MenuCrear() {
  const t = useT()
  const menu = useRef<HTMLDetailsElement>(null)
  const cerrar = () => menu.current?.removeAttribute('open')
  useDesplegable(menu)
  return (
    <details className="group relative" ref={menu}>
      <summary
        aria-label={t('Crear', 'Create')}
        className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-[10px] bg-gold px-4.5 text-[14.5px] font-medium text-shell-deep transition-colors hover:bg-gold-hover [&::-webkit-details-marker]:hidden"
      >
        <PlusIcon className="size-[18px] transition-transform duration-200 group-open:rotate-45" />
        {t('Crear', 'Create')}
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
                    <span className="text-[15px] leading-tight font-medium">{traducir(c.titulo, t)}</span>
                    <span className="text-[13px] leading-snug text-ink-mute">{traducir(c.detalle, t)}</span>
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

/** «Crear» en el celular (maqueta M47): en el menú, sobre «Cerrar sesión», abre una hoja desde abajo con las mismas altas. */
export function MenuCrearMovil({ compacto = false }: { compacto?: boolean }) {
  const t = useT()
  const hoja = useRef<HTMLDialogElement>(null)
  const cerrar = () => hoja.current?.close()
  return (
    <>
      {compacto ? (
        // En la barra de arriba del celular (16 oct): la acción principal del admin no puede vivir al fondo del menú.
        <button
          aria-haspopup="dialog"
          aria-label={t('Crear', 'Create')}
          className="grid size-11 cursor-pointer place-items-center rounded-[10px] bg-gold text-shell-deep"
          onClick={() => hoja.current?.showModal()}
          type="button"
        >
          <PlusIcon className="size-[18px]" />
        </button>
      ) : (
        <button
          aria-haspopup="dialog"
          className="mt-3 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-gold px-4.5 text-[15.5px] font-medium text-shell-deep"
          onClick={() => hoja.current?.showModal()}
          type="button"
        >
          <PlusIcon className="size-[18px]" /> {t('Crear', 'Create')}
        </button>
      )}
      <dialog
        aria-labelledby="crear-movil"
        className="mx-0 mt-auto mb-0 w-full max-w-none rounded-t-[20px] border border-line-panel bg-bg px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] text-ink shadow-float backdrop:bg-shell-deep/50"
        onClick={(e) => {
          if (e.target === hoja.current) cerrar()
        }}
        ref={hoja}
      >
        <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-line-panel-strong" />
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-[26px] font-medium" id="crear-movil">
            {t('Crear', 'Create')}
          </h2>
          <button aria-label={t('Cerrar', 'Close')} className="grid size-11 cursor-pointer place-items-center rounded-[10px] border border-line-panel-strong bg-bg-raised" onClick={cerrar} type="button">
            <CloseIcon className="size-4" />
          </button>
        </div>
        <ul className="mt-3">
          {CREAR.map((c) => {
            const Icono = ICONO[c.icono]
            return (
              <li key={c.href}>
                <Link className="flex min-h-[64px] items-center gap-3.5 py-2 text-ink no-underline" href={c.href} onClick={cerrar}>
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-pill-pending text-gold-deep">
                    <Icono className="size-4" />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15.5px] font-medium">{traducir(c.titulo, t)}</span>
                    <span className="text-[13.5px] text-ink-mute">{traducir(c.detalle, t)}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </dialog>
    </>
  )
}
