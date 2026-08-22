import type { NavSection } from './PanelShell'

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
        { href: `${base}/mensajes`, label: 'Mensajes', icon: '❝', count: counts.sinLeer ?? null },
        { href: `${base}/puerta`, label: 'Modo puerta', icon: '⛩', count: counts.llegadas ?? null },
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
      label: 'Atelier',
      items: [
        { href: '/panel', label: 'Eventos', icon: '⌂' },
        { href: '/panel/ayuda', label: 'Ayuda', icon: '?' },
      ],
    },
  ]
}
