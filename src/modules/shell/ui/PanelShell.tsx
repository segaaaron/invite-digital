import Link from 'next/link'
import type { ReactNode } from 'react'
import { signOutAction } from '@/modules/identity/actions'

export type NavItem = {
  readonly href: string
  readonly label: string
  readonly icon: string
  /** Insignia con el número pendiente. `null` o cero no pintan nada. */
  readonly count?: number | null
}

export type NavSection = {
  readonly label: string
  readonly items: readonly NavItem[]
}

type Props = {
  sections: readonly NavSection[]
  /** `href` de la sección abierta, para marcarla activa. */
  active: string
  brandSub: string
  title: string
  kicker?: string
  meta?: string
  actions?: ReactNode
  children: ReactNode
}

/**
 * La carcasa del panel, portada del diseño entregado: barra lateral oscura fija sobre
 * cuerpo marfil.
 *
 * Sustituye a la cabecera de botones sueltos que había antes, que se rompía sola: con un
 * título de tres palabras se partía en tres líneas y el último enlace se salía del borde.
 * Una lista vertical no tiene ese problema por mucho que crezca.
 */
export function PanelShell({ sections, active, brandSub, title, kicker, meta, actions, children }: Props) {
  return (
    <div className="grid min-h-dvh grid-cols-1 md:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 z-50 flex max-h-dvh flex-row flex-wrap items-center gap-x-4 gap-y-2 overflow-y-auto bg-linear-to-b from-shell to-shell-deep px-4 py-3.5 text-shell-ink shadow-[12px_0_40px_rgb(0_0_0/0.18)] md:h-dvh md:flex-col md:flex-nowrap md:items-stretch md:gap-0 md:px-5 md:py-6.5">
        <div className="hidden md:block">
          <p className="font-display text-[22px] italic">
            Invite<b className="font-medium not-italic">Premium</b>
          </p>
          <p className="mt-1 mb-7 font-mono text-[9px] tracking-[0.3em] opacity-55">{brandSub}</p>
        </div>

        {sections.map((section) => (
          <nav key={section.label} aria-label={section.label} className="flex gap-1 md:mb-5.5 md:flex-col md:gap-0">
            <p className="mb-2 hidden font-mono text-[9px] tracking-[0.3em] uppercase opacity-45 md:block">
              {section.label}
            </p>
            {section.items.map((item) => {
              const current = item.href === active
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

      <main className="relative z-1 bg-bg bg-[radial-gradient(ellipse_900px_600px_at_8%_-10%,rgb(var(--color-gold-rgb)/0.16),transparent_60%),radial-gradient(ellipse_800px_700px_at_105%_10%,rgb(90_112_92/0.14),transparent_55%)] p-4.5 md:p-7">
        <header className="mb-6.5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {kicker ? (
              <p className="font-mono text-[10px] tracking-[0.35em] uppercase opacity-55">{kicker}</p>
            ) : null}
            <h1 className="mt-1.5 font-display text-[28px] leading-none font-light text-ink md:text-[38px]">{title}</h1>
            {meta ? <p className="mt-2 text-[12px] text-ink-soft">{meta}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
        </header>
        {children}
      </main>
    </div>
  )
}
