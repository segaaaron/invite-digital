export type NavItem = {
  readonly href: string
  readonly label: string
  readonly icon: string
  /** Insignia con el número pendiente. `null` o cero no pintan nada. */
  readonly count?: number | null
  /** Qué cuenta la insignia. Un número suelto no dice nada a quien no ve el color. */
  readonly countLabel?: string
}

export type NavSection = {
  readonly label: string
  readonly items: readonly NavItem[]
}

/**
 * La navegación del evento, en un solo sitio. Repetir esta lista en cada página fue lo
 * que produjo la cabecera de siete botones sueltos que se rompía con títulos largos.
 */
export function eventNav(slug: string, counts: { sinLeer?: number | null; llegadas?: number | null } = {}): NavSection[] {
  const base = `/panel/eventos/${slug}`
  return [
    {
      label: 'Evento activo',
      items: [
        { href: base, label: 'Resumen', icon: '●' },
        { href: `${base}/mesas`, label: 'Mesas', icon: '⌗' },
        { href: `${base}/regalos`, label: 'Regalos', icon: '❖' },
        { href: `${base}/mensajes`, label: 'Mensajes', icon: '❝', count: counts.sinLeer ?? null, countLabel: 'sin leer' },
        { href: `${base}/puerta`, label: 'Modo puerta', icon: '⛩', count: counts.llegadas ?? null, countLabel: 'grupos dentro' },
      ],
    },
    {
      label: 'Cuenta',
      items: [
        { href: `${base}/estadisticas`, label: 'Estadísticas', icon: '◔' },
        { href: `${base}/plan`, label: 'Plan', icon: '◈' },
        { href: '/panel', label: 'Todos los eventos', icon: '⌂' },
        { href: '/panel/ayuda', label: 'Ayuda', icon: '?' },
      ],
    },
  ]
}

/** La navegación fuera de un evento: la bandeja y la ayuda. */
export function rootNav(): NavSection[] {
  return [
    {
      label: 'Panel',
      items: [
        { href: '/panel', label: 'Eventos', icon: '⌂' },
        { href: '/panel/ayuda', label: 'Ayuda', icon: '?' },
      ],
    },
  ]
}
