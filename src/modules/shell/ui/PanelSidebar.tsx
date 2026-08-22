'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOutAction } from '@/modules/identity/actions'
import type { NavSection } from './nav'

/**
 * La barra lateral del panel. Es cliente por una razón concreta: la sección activa se
 * deduce de la ruta con `usePathname`, no de un prop `active` que cada página tenía que
 * pasar. Ese prop era otro sitio donde olvidarse, igual que la carcasa entera lo fue.
 */
export function PanelSidebar({ sections, brandSub }: { sections: readonly NavSection[]; brandSub: string }) {
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
          {section.items.map((item) => {
            const current = item.href === pathname
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-[12px] whitespace-nowrap transition-colors md:text-[13px] ${
                  current
                    ? 'bg-linear-to-r from-gold/20 to-white/5 shadow-[inset_2px_0_0_var(--color-gold)]'
                    : 'hover:bg-white/7'
                }`}
              >
                <span aria-hidden className="w-4.5 text-[15px] opacity-85">
                  {item.icon}
                </span>
                {item.label}
                {item.count ? (
                  <span className="ml-auto hidden rounded-full bg-sage px-1.5 py-0.5 font-mono text-[9px] text-white md:inline">
                    {item.count}
                    {item.countLabel ? <span className="sr-only"> {item.countLabel}</span> : null}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>
      ))}

      <form action={signOutAction} className="mt-0 ml-auto md:mt-auto md:ml-0">
        <button
          type="submit"
          className="w-full rounded-xl border border-white/10 bg-linear-to-br from-white/8 to-white/3 px-2.5 py-1.5 text-left font-mono text-[9px] tracking-[0.2em] uppercase opacity-70 transition-colors hover:border-gold/50 hover:opacity-100 md:px-3.5 md:py-3"
        >
          Cerrar sesión
        </button>
      </form>
    </aside>
  )
}
