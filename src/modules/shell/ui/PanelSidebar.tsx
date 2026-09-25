'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { signOutAction } from '@/app/_acciones/identity/actions'
import { leaveSupportAction } from '@/app/_acciones/admin/support-actions'
import { ConfirmAction } from '@/shared/design/ui/panel/ConfirmAction'
import { esEntradaActiva, type NavItem, type NavSection } from './nav'
import { NAV_ICONS } from './nav-icons'

/**
 * **Quién ha entrado**, siempre. La tarjeta enseñaba el nombre del evento abierto y parecía
 * que el admin había entrado con la cuenta del cliente.
 */
export type PanelUser = {
  readonly email: string
  readonly rol: string
  /** El admin actúa como el cliente: la tarjeta lo dice y lleva la salida. */
  readonly soporte: boolean
}

/** El evento en el que se está trabajando, con su salida si hay adónde volver. */
export type PanelEvento = {
  readonly title: string
  readonly planLabel: string
  readonly salirHref: string | null
  readonly salirLabel: string
}

const ITEM_BASE =
  'flex items-center gap-3 rounded-lg px-2.5 py-2 text-[12px] whitespace-nowrap transition-colors min-[860px]:text-[13px]'

function Icono({ icon }: { icon: NavItem['icon'] }) {
  // `shrink-0` y ancho fijo: los rótulos arrancan todos en la misma columna, que es lo
  // que hace que la barra se lea como una lista y no como una escalera.
  return (
    <span aria-hidden className="flex w-4.5 shrink-0 justify-center opacity-80">
      {NAV_ICONS[icon]}
    </span>
  )
}

function Insignia({ item }: { item: NavItem }) {
  if (!item.count) return null
  return (
    <span className="ml-auto hidden rounded-full bg-sage px-1.5 py-0.5 font-mono text-[10.5px] text-white min-[860px]:inline">
      {item.count}
      {item.countLabel ? <span className="sr-only"> {item.countLabel}</span> : null}
    </span>
  )
}

/**
 * La barra lateral del panel, portada de la maqueta entregada.
 *
 * Es cliente por una razón concreta: la sección activa se deduce de la ruta con
 * `usePathname`, no de un prop `active` que cada página tenía que pasar. Ese prop era
 * otro sitio donde olvidarse, igual que la carcasa entera lo fue.
 */
export function PanelSidebar({
  sections,
  brandSub,
  user,
  evento,
}: {
  sections: readonly NavSection[]
  brandSub: string
  user: PanelUser
  evento: PanelEvento | null
}) {
  const pathname = usePathname()
  /**
   * En el teléfono el menú va plegado. La maqueta lo reparte en filas encima de la página,
   * pero la dibujó con doce entradas: con las del evento y las del admin eran más de veinte,
   * y cada pantalla empezaba con medio teléfono de menú antes del contenido.
   */
  const [abierto, setAbierto] = useState(false)
  const actual = sections.flatMap((s) => s.items).find((item) => esEntradaActiva(item, pathname))

  return (
    <aside className="sticky top-0 z-50 flex max-h-dvh flex-col gap-y-2 overflow-y-auto bg-linear-to-b from-shell to-shell-deep px-4 py-3 text-shell-ink shadow-[12px_0_40px_rgb(0_0_0/0.18)] min-[860px]:h-dvh min-[860px]:flex-nowrap min-[860px]:items-stretch min-[860px]:gap-0 min-[860px]:px-5 min-[860px]:py-6.5">
      {/* La barra del teléfono: marca, dónde estás y el botón que abre el menú. */}
      {/* La marca no se parte nunca; lo que cede, con puntos suspensivos, es el nombre de la
          sección («Todos los eventos», «Ficha del evento»), que antes la empujaba a dos líneas. */}
      <div className="flex min-w-0 items-center gap-3 min-[860px]:hidden">
        <p className="shrink-0 whitespace-nowrap font-display text-[18px] italic">
          Luxury <b className="font-medium not-italic">Atelier</b>
        </p>
        {actual ? <span className="min-w-0 truncate font-mono text-[10px] tracking-[0.2em] uppercase opacity-60">· {actual.label}</span> : null}
        <button
          aria-controls="menu-panel"
          aria-expanded={abierto}
          className="ml-auto flex shrink-0 items-center gap-2 rounded-full border border-white/15 px-3.5 py-1.5 font-mono text-[10px] tracking-[0.25em] uppercase transition-colors hover:border-gold/50"
          onClick={() => setAbierto((a) => !a)}
          type="button"
        >
          {/* Icono **y** palabra: según NN/g, la palabra «Menú» junto al icono es lo que
              compensa la encontrabilidad que se pierde al plegar la navegación. */}
          <svg aria-hidden className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" viewBox="0 0 24 24">
            {abierto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
          {abierto ? 'Cerrar' : 'Menú'}
        </button>
      </div>

      <div
        className={`${abierto ? 'flex' : 'hidden'} flex-col gap-3 pb-2 min-[860px]:flex min-[860px]:flex-1 min-[860px]:gap-0 min-[860px]:pb-0`}
        id="menu-panel"
      >
      <div className="hidden min-[860px]:block">
        <p className="font-display text-[22px] italic">
          Luxury <b className="font-medium not-italic">Atelier</b>
        </p>
        <p className="mt-1 mb-7 font-mono text-[10.5px] tracking-[0.16em] opacity-55">{brandSub}</p>
      </div>

      {user.soporte ? (
        // En modo soporte, la salida va lo primero de la barra: abajo quedaba fuera de la vista.
        <div className="mb-5 flex flex-col gap-2 rounded-xl border border-gold/50 bg-gold/15 px-3 py-2.5">
          <p className="font-mono text-[10.5px] tracking-[0.25em] text-gold-light uppercase">Modo soporte</p>
          <p className="text-[12px] leading-snug">
            Estás como <span className="break-all">{user.email}</span>
          </p>
          <form action={leaveSupportAction}>
            <button className="w-full rounded-lg bg-gold px-3 py-2 text-[12px] text-shell-deep transition-colors hover:bg-gold-light" type="submit">
              Regresar al panel de admin
            </button>
          </form>
        </div>
      ) : null}

      {evento === null ? null : (
        // Dónde se está y cómo salir, lo primero de la barra. Dentro de un evento el menú es
        // solo el de ese evento: la única forma de salir es esta, y dice adónde lleva.
        <div className="mb-6 flex flex-col gap-2.5">
          {evento.salirHref === null ? null : (
            <Link
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-[12px] transition-colors hover:border-gold/60 hover:text-gold-light"
              href={evento.salirHref}
              onClick={() => setAbierto(false)}
            >
              <span aria-hidden>←</span> {evento.salirLabel}
            </Link>
          )}
          <div className="rounded-xl border border-gold/35 bg-white/5 px-3 py-2.5">
            <p className="font-mono text-[10.5px] tracking-[0.25em] uppercase opacity-55">Evento</p>
            <p className="mt-0.5 truncate text-[14px]">{evento.title}</p>
            <p className="font-mono text-[10.5px] tracking-[0.2em] uppercase opacity-55">{evento.planLabel}</p>
          </div>
        </div>
      )}

      {sections.map((section) => (
        <nav key={section.label} aria-label={section.label} className="flex flex-wrap gap-1 min-[860px]:mb-5.5 min-[860px]:flex-col min-[860px]:gap-0">
          <p className="mb-1 w-full font-mono text-[10.5px] tracking-[0.16em] uppercase opacity-45 min-[860px]:mb-2">
            {section.label}
          </p>
          {section.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setAbierto(false)}
              aria-current={esEntradaActiva(item, pathname) ? 'page' : undefined}
              className={`${ITEM_BASE} ${
                esEntradaActiva(item, pathname)
                  ? 'bg-linear-to-r from-gold/20 to-white/5 shadow-[inset_2px_0_0_var(--color-gold)]'
                  : 'hover:bg-white/7'
              }`}
            >
              <Icono icon={item.icon} />
              {item.label}
              <Insignia item={item} />
            </Link>
          ))}
        </nav>
      ))}

      <div className="flex items-center gap-2.5 min-[860px]:mt-auto min-[860px]:flex-col min-[860px]:items-stretch">
        <div className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-linear-to-br from-white/8 to-white/3 px-2.5 py-1.5 min-[860px]:px-3.5 min-[860px]:py-3">
          <span
            aria-hidden
            className="hidden size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-sage to-[var(--color-gold-light)] font-display text-[17px] text-white uppercase min-[860px]:flex"
          >
            {user.email.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] min-[860px]:text-[12.5px]">{user.email}</p>
            <p className="font-mono text-[10.5px] tracking-[0.2em] uppercase opacity-60">{user.rol}</p>
          </div>
        </div>

        <ConfirmAction
          action={signOutAction}
          confirmLabel="Cerrar sesión"
          description="Saldrás del panel en este dispositivo. Para volver tendrás que entrar con tu correo y tu contraseña."
          title="Cerrar sesión"
          trigger="Cerrar sesión"
          triggerClassName="w-full rounded-xl border border-white/10 px-2.5 py-1.5 text-left font-mono text-[10.5px] tracking-[0.2em] uppercase opacity-70 transition-colors hover:border-gold/50 hover:opacity-100 min-[860px]:px-3.5 min-[860px]:py-2.5"
        />
      </div>
      </div>
    </aside>
  )
}
