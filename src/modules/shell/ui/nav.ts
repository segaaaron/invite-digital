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
  esCliente = false,
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
            // Los pedidos del Plan B compran planes de InvitePremium: el dinero va a una
            // sola cuenta y las decide el admin. Estaban en «Cuenta», a la vista de
            // cualquier atelier, y ahora que aprobar crea cuentas y eventos eso era
            // enseñar una puerta que además abría de más.
            { href: '/panel/pedidos', label: 'Pedidos', icon: 'pedidos', count: counts.pedidos ?? null, countLabel: 'por revisar' },
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

  // El cliente —los novios, la quinceañera— ve su boda y reparte sus invitaciones. No ve
  // Configuración, ni el plan, ni los códigos QR, ni el check-in: eso es del atelier que
  // le vendió la invitación. Como con la puerta, esconder el enlace no es la protección
  // —esa es la sección que pide cada página—, pero enseñar enlaces que devuelven 404 es
  // enseñar que existe algo a lo que no se llega.
  if (esCliente) {
    return [
      {
        label: 'Mi evento',
        items: [
          { href: base, label: 'Resumen', icon: 'resumen' },
          { href: en('/invitados'), label: 'Invitados', icon: 'invitados', count: counts.invitados ?? null, countLabel: 'grupos' },
          { href: en('/mesas'), label: 'Mesas', icon: 'mesas' },
          { href: en('/regalos'), label: 'Mesa de regalos', icon: 'regalos' },
          { href: en('/mensajes'), label: 'Mensajes', icon: 'mensajes', count: counts.sinLeer ?? null, countLabel: 'sin leer' },
        ],
      },
      {
        label: 'Mi invitación',
        items: [
          // Su invitación la escribe él: textos, canción e itinerario. La pantalla es la
          // misma del atelier, con las tarjetas del evento —diseño, contraseña, borrado—
          // fuera: esas son de quien le vendió la boda.
          { href: en('/configuracion'), label: 'Mi invitación', icon: 'configuracion' },
          { href: en('/vista-previa'), label: 'Vista previa', icon: 'vistaPrevia' },
          { href: en('/estadisticas'), label: 'Estadísticas', icon: 'estadisticas' },
        ],
      },
      {
        label: 'Cuenta',
        items: [{ href: '/panel/cuenta', label: 'Mi cuenta', icon: 'configuracion' }],
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
        // La propia contraseña. Las cuentas las da de alta el admin y la clave inicial
        // viaja por WhatsApp: sin esta pantalla valdría para siempre.
        { href: '/panel/cuenta', label: 'Mi cuenta', icon: 'configuracion' },
        { href: '/panel', label: 'Todos los eventos', icon: 'eventos' },
        { href: '/panel/ayuda', label: 'Ayuda', icon: 'ayuda' },
      ],
    },
    ...administracion,
  ]
}
