import type { NavIcon } from './nav-icons'

export type NavItem = {
  readonly href: string | null
  readonly label: string
  /**
   * La clave del icono, no el dibujo. Este fichero es un `.ts` sin JSX; el SVG lo pone
   * `nav-icons.tsx`, y el `Record` de allí obliga a que cada clave traiga el suyo.
   */
  readonly icon: NavIcon
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
  /** Pedidos del Plan B con comprobante por revisar. */
  readonly pedidos?: number | null
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
/**
 * La administración es una sección **más** de la misma barra, y solo se pinta para un
 * admin: un atelier no ve ni el rótulo. Ocultarla no es la protección —esa vive en
 * `requireAdmin()`, que devuelve 404— pero enseñar enlaces que llevan a un 404 es
 * enseñar que existe algo a lo que no se llega.
 */
export function panelNav(
  slug: string | null,
  counts: NavCounts = {},
  esAdmin = false,
  esPuerta = false,
): NavSection[] {
  const base = slug === null ? null : `/panel/eventos/${slug}`
  const en = (ruta: string) => (base === null ? null : `${base}${ruta}`)

  const administracion: NavSection[] = esAdmin
    ? [
        {
          label: 'Administración',
          items: [
            { href: '/panel/admin', label: 'Panorama', icon: 'panorama' },
            { href: '/panel/admin/eventos', label: 'Todos los eventos', icon: 'todosLosEventos' },
            { href: '/panel/admin/usuarios', label: 'Usuarios', icon: 'usuarios' },
            { href: '/panel/admin/pagos', label: 'Cobros', icon: 'plan' },
            { href: '/panel/admin/auditoria', label: 'Auditoría', icon: 'auditoria' },
          ],
        },
      ]
    : []

  // El personal de puerta ve una barra de una sola entrada. Enseñarle el resto sería
  // enseñarle enlaces que le devuelven 404: el corte de verdad está en la sección que
  // pide cada página.
  if (esPuerta) {
    return [
      {
        label: 'Puerta',
        items: [
          { href: en('/checkin'), label: 'Check-in', icon: 'checkin', count: counts.llegadas ?? null, countLabel: 'grupos dentro' },
        ],
      },
    ]
  }

  return [
    {
      label: 'Evento activo',
      items: [
        { href: base, label: 'Resumen', icon: 'resumen' },
        { href: en('/invitados'), label: 'Invitados', icon: 'invitados', count: counts.invitados ?? null, countLabel: 'grupos' },
        { href: en('/mesas'), label: 'Mesas', icon: 'mesas' },
        { href: en('/regalos'), label: 'Mesa de regalos', icon: 'regalos' },
        { href: en('/mensajes'), label: 'Mensajes', icon: 'mensajes', count: counts.sinLeer ?? null, countLabel: 'sin leer' },
        { href: en('/checkin'), label: 'Check-in', icon: 'checkin', count: counts.llegadas ?? null, countLabel: 'grupos dentro' },
      ],
    },
    {
      label: 'Diseño',
      items: [
        { href: en('/configuracion'), label: 'Editar invitación', icon: 'editar' },
        // La invitación de esta boda, entera. Era un ancla —`#vista-previa`— que no
        // existía en ninguna página: pulsarla dejaba al atelier en Configuración
        // preguntándose qué había pasado.
        { href: en('/vista-previa'), label: 'Vista previa', icon: 'vistaPrevia' },
        { href: en('/qr'), label: 'Códigos QR', icon: 'qr' },
        { href: en('/estadisticas'), label: 'Estadísticas', icon: 'estadisticas' },
      ],
    },
    {
      label: 'Cuenta',
      items: [
        { href: en('/configuracion'), label: 'Configuración', icon: 'configuracion' },
        { href: en('/plan'), label: 'Plan', icon: 'plan' },
        { href: '/panel', label: 'Todos los eventos', icon: 'eventos' },
        // La maqueta no dibujó el Plan B, igual que no dibujó Reparto ni las Zonas del
        // salón. Se queda: es funcionalidad construida, y un pedido que nadie mira es un
        // cliente que transfirió y no recibió nada.
        { href: '/panel/pedidos', label: 'Pedidos', icon: 'pedidos', count: counts.pedidos ?? null, countLabel: 'por revisar' },
        { href: '/panel/ayuda', label: 'Ayuda', icon: 'ayuda' },
      ],
    },
    ...administracion,
  ]
}
