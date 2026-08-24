'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOutAction } from '@/modules/identity/actions'
import type { NavItem, NavSection } from './nav'

export type PanelUser = {
  /** El evento activo. Sin ninguno creado, la tarjeta lo dice en vez de mentir. */
  readonly title: string
  readonly planLabel: string
}

const ITEM_BASE =
  'flex items-center gap-3 rounded-lg px-2.5 py-2 text-[12px] whitespace-nowrap transition-colors md:text-[13px]'

function Icono({ icon }: { icon: string }) {
  return (
    <span aria-hidden className="w-4.5 text-[15px] opacity-85">
      {icon}
    </span>
  )
}

function Insignia({ item }: { item: NavItem }) {
  if (!item.count) return null
  return (
    <span className="ml-auto hidden rounded-full bg-sage px-1.5 py-0.5 font-mono text-[9px] text-white md:inline">
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
}: {
  sections: readonly NavSection[]
  brandSub: string
  user: PanelUser
}) {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 z-50 flex max-h-dvh flex-row flex-wrap items-center gap-x-4 gap-y-2 overflow-y-auto bg-linear-to-b from-shell to-shell-deep px-4 py-3.5 text-shell-ink shadow-[12px_0_40px_rgb(0_0_0/0.18)] md:h-dvh md:flex-col md:flex-nowrap md:items-stretch md:gap-0 md:px-5 md:py-6.5">
      <div className="hidden md:block">
        <p className="font-display text-[22px] italic">
          Invite<b className="font-medium not-italic">Premium</b>
        </p>
        <p className="mt-1 mb-7 font-mono text-[9px] tracking-[0.3em] opacity-55">{brandSub}</p>
      </div>

      {sections.map((section) => (
        <nav key={section.label} aria-label={section.label} className="flex flex-wrap gap-1 md:mb-5.5 md:flex-col md:gap-0">
          <p className="mb-2 hidden font-mono text-[9px] tracking-[0.3em] uppercase opacity-45 md:block">
            {section.label}
          </p>
          {section.items.map((item) =>
            item.href === null ? (
              // Sin evento creado no hay adónde ir. Se pinta apagado y se dice por qué,
              // en vez de desaparecer: una barra que encoge desorienta.
              <span
                key={item.label}
                aria-disabled
                title="Crea un evento para usar esta sección"
                className={`${ITEM_BASE} cursor-not-allowed opacity-35`}
              >
                <Icono icon={item.icon} />
                {item.label}
              </span>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.href === pathname ? 'page' : undefined}
                className={`${ITEM_BASE} ${
                  item.href === pathname
                    ? 'bg-linear-to-r from-gold/20 to-white/5 shadow-[inset_2px_0_0_var(--color-gold)]'
                    : 'hover:bg-white/7'
                }`}
              >
                <Icono icon={item.icon} />
                {item.label}
                <Insignia item={item} />
              </Link>
            ),
          )}
        </nav>
      ))}

      <div className="mt-0 ml-auto flex items-center gap-2.5 md:mt-auto md:ml-0 md:flex-col md:items-stretch">
        <div className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-linear-to-br from-white/8 to-white/3 px-2.5 py-1.5 md:px-3.5 md:py-3.5">
          <span
            aria-hidden
            className="hidden size-9.5 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-sage to-[var(--color-gold-light)] font-display text-[18px] italic text-white md:flex"
          >
            {user.title.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] md:text-[13px]">{user.title}</p>
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase opacity-60">{user.planLabel}</p>
          </div>
        </div>

        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full rounded-xl border border-white/10 px-2.5 py-1.5 text-left font-mono text-[9px] tracking-[0.2em] uppercase opacity-70 transition-colors hover:border-gold/50 hover:opacity-100 md:px-3.5 md:py-2.5"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  )
}
