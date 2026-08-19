import type { ReactNode } from 'react'

export function GlassPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-[var(--color-line)] bg-bg-raised/70 shadow-[var(--shadow-float)] backdrop-blur-md ${className}`.trim()}
    >
      {children}
    </div>
  )
}
