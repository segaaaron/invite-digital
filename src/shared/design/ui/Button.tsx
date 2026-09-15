import Link from 'next/link'
import type { ReactNode } from 'react'

type ButtonProps = {
  children: ReactNode
  href?: string
  external?: boolean
  variant?: 'gold' | 'ghost'
  type?: 'button' | 'submit'
  className?: string
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] px-7 py-3.5 text-[12px] uppercase tracking-[var(--tracking-luxe)] transition-transform duration-300 hover:-translate-y-0.5'

const VARIANTS = {
  gold: 'bg-gold text-bg-raised shadow-[var(--shadow-float)] hover:bg-gold-deep',
  ghost: 'border border-[var(--color-line)] bg-bg-raised/70 text-ink backdrop-blur-md hover:border-gold',
} as const

export function Button({ children, href, external, variant = 'gold', type = 'button', className = '' }: ButtonProps) {
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`.trim()

  if (href) {
    if (external) {
      return (
        <a className={classes} href={href} target="_blank" rel="noopener noreferrer">
          {children}
          {/* Quien usa lector de pantalla tiene que saber que sale del sitio y pierde «atrás». */}
          {' '}
          <span className="sr-only">(se abre en una pestaña nueva)</span>
        </a>
      )
    }
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} type={type}>
      {children}
    </button>
  )
}
