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

// ---------------------------------------------------------------------------
// Los iconos de la barra del panel.
//
// Son SVG por el mismo motivo que los de arriba, y por uno más: la barra tenía una
// mezcla de glifos monocromos —`●`, `✉`, `✓`— y **emoji a todo color** —🪑, 🎁, 📊, 💳—.
// El emoji lo dibuja la fuente del sistema con su propia paleta, así que sobre la tinta
// oscura de la barra aparecían seis manchas de color que no son de la marca y que además
// cambian de forma entre macOS, Windows y Android. Con `currentColor` heredan la tinta de
// la fila, incluida la del estado activo.
// ---------------------------------------------------------------------------

export function LayoutIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="16" viewBox="0 0 24 24" width="16" {...BASE}>
      <rect height="16" rx="2" width="18" x="3" y="4" />
      <path d="M3 10h18" />
      <path d="M10 10v10" />
    </svg>
  )
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="16" viewBox="0 0 24 24" width="16" {...BASE}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-4.8 5.5-4.8s5.5 1.8 5.5 4.8" />
      <path d="M16 5.6a3.2 3.2 0 0 1 0 5.6" />
      <path d="M17.5 14.6c1.9.6 3 2.2 3 4.4" />
    </svg>
  )
}

/**
 * Una mesa de perfil: tablero, faldón y dos patas.
 *
 * Dos intentos antes: la mesa vista desde arriba —un círculo con cuatro puntos alrededor—
 * se leía a 16 píxeles como un diagrama de átomos, y la silla que la sustituyó era una
 * silla, que es otra cosa. La sección se llama Mesas y lo que se reparte son mesas.
 */
export function TableIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="16" viewBox="0 0 24 24" width="16" {...BASE}>
      <path d="M2.5 8.5h19" />
      <path d="M4.5 12h15" />
      <path d="M6.5 12v7.5M17.5 12v7.5" />
    </svg>
  )
}

export function GiftIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="16" viewBox="0 0 24 24" width="16" {...BASE}>
      <rect height="11" rx="1.5" width="18" x="3" y="10" />
      <path d="M3 13.5h18" />
      <path d="M12 10v11" />
      <path d="M12 10S10.6 6 8.4 6a2.2 2.2 0 0 0 0 4.4" />
      <path d="M12 10s1.4-4 3.6-4a2.2 2.2 0 0 1 0 4.4" />
    </svg>
  )
}

export function MessageIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="16" viewBox="0 0 24 24" width="16" {...BASE}>
      <path d="M20 12.5a6.5 6.5 0 0 1-6.5 6.5H8l-4 3v-3.9A6.5 6.5 0 0 1 4 12.5v-1A6.5 6.5 0 0 1 10.5 5h3A6.5 6.5 0 0 1 20 11.5z" />
    </svg>
  )
}

/** Los cuatro filos de una mira de escaneo. La puerta lee pases, no marca casillas. */
export function ScanIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="16" viewBox="0 0 24 24" width="16" {...BASE}>
      <path d="M4 9V6a2 2 0 0 1 2-2h3" />
      <path d="M15 4h3a2 2 0 0 1 2 2v3" />
      <path d="M20 15v3a2 2 0 0 1-2 2h-3" />
      <path d="M9 20H6a2 2 0 0 1-2-2v-3" />
      <path d="M7.5 12h9" />
    </svg>
  )
}

export function PenIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="16" viewBox="0 0 24 24" width="16" {...BASE}>
      <path d="M16.5 4.5l3 3L8 19H5v-3z" />
      <path d="M14.2 6.8l3 3" />
    </svg>
  )
}

export function EyeIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="16" viewBox="0 0 24 24" width="16" {...BASE}>
      <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  )
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="16" viewBox="0 0 24 24" width="16" {...BASE}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8.5 20v-6" />
      <path d="M13 20V9" />
      <path d="M17.5 20v-9.5" />
    </svg>
  )
}

/**
 * Mandos, no un engranaje. El engranaje pide dientes, y a 16 píxeles con trazo de 1,4 los
 * dientes se convierten en un halo: la primera versión se leía como un sol —el icono de
 * brillo de pantalla—, que es justo lo que Configuración no es.
 */
export function GearIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="16" viewBox="0 0 24 24" width="16" {...BASE}>
      <path d="M4 7.5h16M4 12h16M4 16.5h16" />
      <circle cx="9" cy="7.5" r="1.9" />
      <circle cx="15.5" cy="12" r="1.9" />
      <circle cx="8" cy="16.5" r="1.9" />
    </svg>
  )
}

export function CardIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="16" viewBox="0 0 24 24" width="16" {...BASE}>
      <rect height="13" rx="2" width="19" x="2.5" y="5.5" />
      <path d="M2.5 10h19" />
      <path d="M6 14.5h4" />
    </svg>
  )
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="16" viewBox="0 0 24 24" width="16" {...BASE}>
      <rect height="16" rx="2" width="17" x="3.5" y="4.5" />
      <path d="M3.5 9.5h17" />
      <path d="M8 2.8v3.4M16 2.8v3.4" />
    </svg>
  )
}

export function ReceiptIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="16" viewBox="0 0 24 24" width="16" {...BASE}>
      <path d="M5.5 3.2h13v17.6l-2.2-1.5-2.2 1.5-2.1-1.5-2.2 1.5-2.2-1.5-2.1 1.5z" />
      <path d="M9 8.5h6M9 12.5h6" />
    </svg>
  )
}

export function HelpIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="16" viewBox="0 0 24 24" width="16" {...BASE}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4a2.5 2.5 0 0 1 4.9.6c0 1.7-2.5 2-2.5 3.6" />
      <path d="M12 17.1h.01" />
    </svg>
  )
}

export function PinIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="14" viewBox="0 0 24 24" width="14" {...BASE}>
      <path d="M12 21v-6.5" />
      <path d="M8 3.5h8l-1 5 2.5 2.5v3H6.5v-3L9 8.5z" />
    </svg>
  )
}

/** Un edificio: los eventos de todo el sistema, no los de una boda. */
export function BuildingIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="16" viewBox="0 0 24 24" width="16" {...BASE}>
      <path d="M4 20.5V6.5l7-3v17" />
      <path d="M11 10.5h6.5v10" />
      <path d="M2.5 20.5h19" />
      <path d="M7 9.5h1M7 13h1M14 14h1M14 17.5h1" />
    </svg>
  )
}

/** Un escudo: la auditoría. */
export function ShieldIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="16" viewBox="0 0 24 24" width="16" {...BASE}>
      <path d="M12 3l7 2.6v5.6c0 4.3-2.9 7.7-7 9.3-4.1-1.6-7-5-7-9.3V5.6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

/** Un código QR: los tres ojos y un módulo suelto. */
export function QrIcon({ className }: IconProps) {
  return (
    <svg aria-hidden className={className} height="16" viewBox="0 0 24 24" width="16" {...BASE}>
      <rect height="7" rx="1.5" width="7" x="3" y="3" />
      <rect height="7" rx="1.5" width="7" x="14" y="3" />
      <rect height="7" rx="1.5" width="7" x="3" y="14" />
      <path d="M14 14h3v3h-3zM20 14h1M14 20h3M20 17.5v3.5" />
    </svg>
  )
}
