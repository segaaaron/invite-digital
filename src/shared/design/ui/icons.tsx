/**
 * Los iconos de línea de la maqueta. Son SVG y no caracteres tipográficos: un «✉» o un
 * «→» los dibuja la fuente del sistema, cambian de forma en cada plataforma y no admiten
 * el grosor de trazo del diseño.
 */
type IconProps = { className?: string }

const BASE = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="15" viewBox="0 0 24 24" width="15" {...BASE}>
      <path d="M5 12h13" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  )
}

export function ArrowLeftIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="15" viewBox="0 0 24 24" width="15" {...BASE}>
      <path d="M19 12H6" />
      <path d="M11 18l-6-6 6-6" />
    </svg>
  )
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="14" viewBox="0 0 24 24" width="14" {...BASE}>
      <rect height="14" rx="2" width="18" x="3" y="5" />
      <path d="M3.5 6.5L12 13l8.5-6.5" />
    </svg>
  )
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="14" viewBox="0 0 24 24" width="14" {...BASE}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l3.5 2" />
    </svg>
  )
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="14" viewBox="0 0 24 24" width="14" {...BASE}>
      <path d="M4.5 12.5l4.5 4.5L19.5 6.5" />
    </svg>
  )
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="14" viewBox="0 0 24 24" width="14" {...BASE}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" />
    </svg>
  )
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} fill="currentColor" height="18" viewBox="0 0 24 24" width="18">
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  )
}

export function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="15" viewBox="0 0 24 24" width="15" {...BASE}>
      <path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.6-4A8 8 0 1 1 20 11.5z" />
      <path d="M9 9.5c.4 2.2 2.3 4.1 4.5 4.5l1-1.2 1.8.8-.4 1.6c-2.9.4-6.5-2.6-7.6-5.7l1.6-.4.8 1.8-1.7-1.4z" />
    </svg>
  )
}

export const METRIC_ICONS = { mail: MailIcon, clock: ClockIcon, check: CheckIcon, globe: GlobeIcon } as const

export type MetricIcon = keyof typeof METRIC_ICONS
