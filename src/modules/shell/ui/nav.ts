export type NavItem = {
  readonly href: string | null
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

export type NavCounts = {
  readonly invitados?: number | null
  readonly sinLeer?: number | null
  readonly llegadas?: number | null
}

/**
 * La navegación del panel, portada de `docs/design-reference/dashboard/Dashboard.html`:
 * tres secciones —EVENTO ACTIVO, DISEÑO, CUENTA— que son **siempre las mismas**.
 *
 * La maqueta no tiene una versión reducida para cuando no estás dentro de un evento, y
 * por eso esto tampoco la tiene: la bandeja, el evento nuevo y la ayuda enseñan la barra
 * entera, apuntando al evento activo —el de fecha más próxima—. Una barra que cambia de
 * tamaño al cambiar de página es justo lo que había que quitar.
 *
 * Sin ningún evento creado, los enlaces del evento van a `null`: se pintan apagados y no
 * llevan a ninguna parte, en vez de desaparecer.
 */
export function panelNav(slug: string | null, counts: NavCounts = {}): NavSection[] {
  const base = slug === null ? null : `/panel/eventos/${slug}`
  const en = (ruta: string) => (base === null ? null : `${base}${ruta}`)

  return [
    {
      label: 'Evento activo',
      items: [
        { href: base, label: 'Resumen', icon: '●' },
        { href: en('/invitados'), label: 'Invitados', icon: '✉', count: counts.invitados ?? null, countLabel: 'grupos' },
        { href: en('/mesas'), label: 'Mesas', icon: '🪑' },
        { href: en('/regalos'), label: 'Mesa de regalos', icon: '🎁' },
        { href: en('/mensajes'), label: 'Mensajes', icon: '💬', count: counts.sinLeer ?? null, countLabel: 'sin leer' },
        { href: en('/checkin'), label: 'Check-in', icon: '✓', count: counts.llegadas ?? null, countLabel: 'grupos dentro' },
      ],
    },
    {
      label: 'Diseño',
      items: [
        { href: en('/configuracion'), label: 'Editar invitación', icon: '✎' },
        { href: en('/configuracion#vista-previa'), label: 'Vista previa', icon: '↗' },
        { href: en('/estadisticas'), label: 'Estadísticas', icon: '📊' },
      ],
    },
    {
      label: 'Cuenta',
      items: [
        { href: en('/configuracion'), label: 'Configuración', icon: '⚙' },
        { href: en('/plan'), label: 'Plan', icon: '💳' },
        { href: '/panel', label: 'Todos los eventos', icon: '⌂' },
        { href: '/panel/ayuda', label: 'Ayuda', icon: '?' },
      ],
    },
  ]
}
