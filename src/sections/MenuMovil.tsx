'use client'

import { useEffect, useState } from 'react'

type Props = {
  readonly enlaces: readonly { readonly href: string; readonly label: string }[]
  /** «Crear invitación»: en pantallas estrechas no cabe en la cabecera y va aquí, al final. */
  readonly accion: { readonly href: string; readonly label: string }
  readonly abrir: string
  readonly cerrar: string
}

/**
 * El menú de la web en el teléfono: el botón de tres rayas junto a «Crear invitación» y, al
 * tocarlo, las cuatro entradas bajo la cabecera. En el teléfono la navegación estaba oculta
 * y no había nada que la sustituyera: solo se podía ir a crear la invitación.
 *
 * Se cierra al elegir una entrada (las de la portada son anclas y no cambian de página) y
 * con Escape.
 */
export function MenuMovil({ enlaces, accion, abrir, cerrar }: Props) {
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    if (!abierto) return
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('keydown', alPulsar)
    return () => document.removeEventListener('keydown', alPulsar)
  }, [abierto])

  return (
    <div className="md:hidden">
      <button
        aria-controls="menu-web"
        aria-expanded={abierto}
        aria-label={abierto ? cerrar : abrir}
        className="flex size-11 items-center justify-center rounded-full border border-[var(--color-line)] text-ink-soft transition-colors hover:text-gold-deep"
        onClick={() => setAbierto((valor) => !valor)}
        type="button"
      >
        <svg aria-hidden className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" viewBox="0 0 24 24">
          {abierto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      <nav
        className={`${abierto ? 'flex' : 'hidden'} absolute inset-x-0 top-[calc(100%+10px)] flex-col rounded-[var(--radius-card)] border border-[var(--color-line)] bg-bg-raised p-2 shadow-[var(--shadow-float)]`}
        id="menu-web"
      >
        {enlaces.map((enlace) => (
          <a
            className="rounded-[14px] px-5 py-4 text-[12px] tracking-[var(--tracking-luxe)] text-ink-soft uppercase transition-colors hover:bg-bg-sunken hover:text-gold-deep"
            href={enlace.href}
            key={enlace.href}
            onClick={() => setAbierto(false)}
          >
            {enlace.label}
          </a>
        ))}
        <a
          className="mt-2 rounded-[var(--radius-pill)] bg-gold px-5 py-3.5 text-center text-[12px] tracking-[var(--tracking-luxe)] text-white uppercase transition-colors hover:bg-gold-deep min-[440px]:hidden"
          href={accion.href}
          onClick={() => setAbierto(false)}
        >
          {accion.label}
        </a>
      </nav>
    </div>
  )
}
