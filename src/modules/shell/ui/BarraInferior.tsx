'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef } from 'react'
import { signOutAction } from '@/app/_acciones/identity/actions'
import { ConfirmAction } from '@/shared/design/ui/panel/ConfirmAction'
import { esEntradaActiva, type NavItem, type NavSection } from './nav'
import { NAV_ICONS } from './nav-icons'
import type { PanelUser } from './PanelSidebar'

/** Cuántas entradas van a la vista; el resto, en «Más». Cinco toques es lo que cabe con el pulgar. */
const A_LA_VISTA = 4

/**
 * **La navegación del admin en el celular, abajo y al alcance del pulgar** (patrón de las apps
 * nativas: Instagram, Shopify, Stripe). Sustituye a la barra oscura con «Menú» de arriba, que se
 * sumaba a la barra de herramientas y se comía un sexto de la pantalla antes del contenido.
 *
 * Hoy · Ventas · Eventos · Clientes a la vista; «Más» abre una hoja con el resto y la cuenta.
 */
export function BarraInferior({ sections, user }: { sections: readonly NavSection[]; user: PanelUser }) {
  const ruta = usePathname()
  const hoja = useRef<HTMLDialogElement>(null)
  const entradas = sections.flatMap((s) => s.items)
  const vista = entradas.slice(0, A_LA_VISTA)
  const resto = entradas.slice(A_LA_VISTA)
  const enResto = resto.some((item) => esEntradaActiva(item, ruta)) || ruta === '/panel/cuenta'
  const cerrar = () => hoja.current?.close()

  return (
    <>
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-shell-deep/95 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),8px)] text-shell-ink shadow-[0_-12px_32px_rgb(0_0_0/0.22)] backdrop-blur-md min-[860px]:hidden"
      >
        <ul className="grid grid-cols-5">
          {vista.map((item) => (
            <li key={item.href}>
              <Entrada activa={esEntradaActiva(item, ruta)} item={item} />
            </li>
          ))}
          <li>
            <button
              aria-haspopup="dialog"
              className={`relative flex w-full flex-col items-center gap-1 rounded-xl py-1.5 text-[10.5px] transition-colors ${enResto ? 'text-gold-light' : 'opacity-70'}`}
              onClick={() => hoja.current?.showModal()}
              type="button"
            >
              <svg aria-hidden className="size-4.5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="1.7" />
                <circle cx="12" cy="12" r="1.7" />
                <circle cx="19" cy="12" r="1.7" />
              </svg>
              Más
            </button>
          </li>
        </ul>
      </nav>

      <dialog
        aria-label="Más secciones"
        className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[80dvh] w-full max-w-none rounded-t-[26px] border-t border-line-panel bg-bg-raised p-0 text-ink shadow-lift backdrop:bg-ink/40 motion-safe:animate-slide-up"
        onClick={(e) => {
          if (e.target === hoja.current) cerrar()
        }}
        ref={hoja}
      >
        <div className="flex flex-col gap-1 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
          <span aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-panel-strong" />
          {resto.map((item) => (
            <Link
              aria-current={esEntradaActiva(item, ruta) ? 'page' : undefined}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] transition-colors hover:bg-bg-sunken aria-[current=page]:bg-bg-sunken"
              href={item.href}
              key={item.href}
              onClick={cerrar}
            >
              <span aria-hidden className="flex w-5 justify-center text-ink-soft">
                {NAV_ICONS[item.icon]}
              </span>
              {item.label}
            </Link>
          ))}
          <div className="my-2 h-px bg-line-panel" />
          <p className="px-3 pb-1 text-[12px] text-ink-mute">
            {user.email} · {user.rol}
          </p>
          {user.soporte ? null : (
            <Link className="rounded-xl px-3 py-3 text-[15px] transition-colors hover:bg-bg-sunken" href="/panel/cuenta" onClick={cerrar}>
              Mi cuenta
            </Link>
          )}
          <ConfirmAction
            action={signOutAction}
            confirmLabel="Cerrar sesión"
            description="Saldrás del panel en este dispositivo. Para volver tendrás que entrar con tu correo y tu contraseña."
            title="Cerrar sesión"
            trigger="Cerrar sesión"
            triggerClassName="w-full rounded-xl px-3 py-3 text-left text-[15px] text-danger-deep transition-colors hover:bg-bg-sunken"
          />
        </div>
      </dialog>
    </>
  )
}

function Entrada({ item, activa }: { item: NavItem; activa: boolean }) {
  return (
    <Link
      aria-current={activa ? 'page' : undefined}
      className={`relative flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10.5px] transition-colors ${activa ? 'text-gold-light' : 'opacity-70 hover:opacity-100'}`}
      href={item.href}
    >
      {activa ? <span aria-hidden className="absolute -top-1.5 h-0.5 w-6 rounded-full bg-gold" /> : null}
      <span aria-hidden className="flex size-4.5 items-center justify-center [&>svg]:size-4.5">
        {NAV_ICONS[item.icon]}
      </span>
      {item.label}
      {item.count ? (
        <span className="absolute top-0 right-[calc(50%-18px)] min-w-4 rounded-full bg-sage px-1 font-mono text-[9.5px] leading-4 text-white">
          {item.count}
          {item.countLabel ? <span className="sr-only"> {item.countLabel}</span> : null}
        </span>
      ) : null}
    </Link>
  )
}
