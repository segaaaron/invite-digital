import type { NavIcon } from './nav-icons'

export type NavItem = {
  readonly href: string
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
  /**
   * Otras rutas que también son esta entrada: «Ventas» sigue marcada en Consultas, Pedidos o
   * Ingresos, que son sus pestañas. Por prefijo.
   */
  readonly activo?: readonly string[]
}

/** Si la entrada es la de la pantalla actual: su ruta exacta o una de sus pestañas. */
export const esEntradaActiva = (item: NavItem, pathname: string): boolean =>
  item.href === pathname || (item.activo ?? []).some((prefijo) => pathname === prefijo || pathname.startsWith(`${prefijo}/`))

export type NavSection = {
  readonly label: string
  readonly items: readonly NavItem[]
}

/** Lo que se compone antes de quitar los enlaces que no llevan a ninguna parte. */
type Borrador = { readonly label: string; readonly items: readonly (Omit<NavItem, 'href'> & { readonly href: string | null })[] }

export type NavCounts = {
  readonly invitados?: number | null
  readonly sinLeer?: number | null
  readonly llegadas?: number | null
  /** Consultas de la web sin contactar. Solo la calcula la carcasa para un admin. */
  readonly consultas?: number | null
  /** Pedidos del Plan B con comprobante por revisar. */
  readonly pedidos?: number | null
}

/**
 * La navegación del panel, portada de `docs/design-reference/dashboard/Dashboard.html`.
 *
 * **Cada rol ve solo lo suyo, y nada se pinta apagado.** La barra tenía que ser siempre la
 * misma y, sin evento, enseñaba las secciones del evento apagadas; en la administración
 * eso eran diez filas grises que el admin no iba a usar. Lo pidió el usuario el 14 de
 * septiembre: una opción que no lleva a ninguna parte no sale.
 *
 * - **Atelier**: EVENTO ACTIVO y DISEÑO si tiene evento, y CUENTA.
 * - **Admin**: ADMINISTRACIÓN y CUENTA; dentro de una boda, además, su ficha: configuración,
 *   plan y vista previa. Nunca los datos del cliente.
 * - **Cliente** y **puerta**: sus barras propias, más abajo.
 *
 * Ocultar no es la protección —esa vive en la sección que pide cada página y en
 * `requireAdmin()`, que devuelven 404—, pero enseñar enlaces que llevan a un 404 es
 * enseñar que existe algo a lo que no se llega.
 */
export function panelNav(
  slug: string | null,
  counts: NavCounts = {},
  esAdmin = false,
  esPuerta = false,
  esCliente = false,
  extra: NavExtra = {},
): NavSection[] {
  return componer(slug, counts, esAdmin, esPuerta, esCliente, extra)
    .map((seccion) => ({ label: seccion.label, items: seccion.items.filter((item): item is NavItem => item.href !== null) }))
    .filter((seccion) => seccion.items.length > 0)
}

export type NavExtra = {
  /** Su papel en el equipo del evento, si entra por pertenencia. Sin decirlo, anfitrión. */
  readonly equipo?: 'anfitrion' | 'coanfitrion' | 'planner' | null
  /** Es planner en algún evento: llega a su mesa desde la cuenta. */
  readonly mesaPlanner?: boolean
  /**
   * Las secciones que el plan del evento no trae (`seccionesFueraDelPlan`): no se enseñan. Un
   * plan básico no ve entradas a pantallas que tiene cerradas. Sin decirlo, todas.
   */
  readonly fueraDelPlan?: readonly string[]
  /**
   * Si esta fiesta tiene cortejo. Un cumpleaños no lo tiene —ni padrinos, ni chambelanes,
   * ni corte de honor—, y la pantalla responde 404: enseñar el enlace sería llevar ahí.
   */
  readonly cortejo?: boolean
}

function componer(slug: string | null, counts: NavCounts, esAdmin: boolean, esPuerta: boolean, esCliente: boolean, extra: NavExtra): Borrador[] {
  const equipo = extra.equipo ?? 'anfitrion'
  const mesa = extra.mesaPlanner ? '/panel/planner' : null
  const base = slug === null ? null : `/panel/eventos/${slug}`
  const fuera = new Set(extra.fueraDelPlan ?? [])
  const en = (ruta: string) => (base === null || fuera.has(ruta) ? null : `${base}${ruta}`)

  // **Siete entradas, por trabajo y no por tabla** (24 de septiembre): eran quince, una por
  // entidad —consultas, pedidos, planes, extras, usuarios…—, y el trabajo real cruza varias.
  // Lo que eran pantallas hermanas son ahora pestañas de su entrada (`activo`).
  const administracion: Borrador[] = esAdmin
    ? [
        {
          label: 'Día a día',
          items: [
            // Lo que pide acción hoy, con su botón para resolverlo.
            { href: '/panel/admin', label: 'Hoy', icon: 'hoy' },
            // El recorrido entero de la venta: consulta → pedido → pago → evento, y lo cobrado.
            {
              href: '/panel/admin/ventas',
              label: 'Ventas',
              icon: 'pedidos',
              count: (counts.consultas ?? 0) + (counts.pedidos ?? 0) || null,
              countLabel: 'por atender',
              activo: ['/panel/admin/ventas', '/panel/admin/consultas', '/panel/pedidos', '/panel/admin/ingresos'],
            },
            { href: '/panel/admin/eventos', label: 'Eventos', icon: 'todosLosEventos' },
            // La persona entera: sus consultas, pedidos, eventos y acceso, en un sitio.
            { href: '/panel/admin/clientes', label: 'Clientes', icon: 'usuarios', activo: ['/panel/admin/clientes'] },
          ],
        },
        {
          label: 'Negocio',
          items: [
            // Lo que se vende: los modelos, los planes y los extras.
            { href: '/panel/admin/modelos', label: 'Catálogo', icon: 'editar', activo: ['/panel/admin/modelos', '/panel/admin/planes', '/panel/admin/extras'] },
            // Lo que la web pública enseña del negocio, sin tocar código.
            { href: '/panel/admin/web', label: 'Web', icon: 'web' },
          ],
        },
        {
          label: 'Sistema',
          items: [
            // Equipo, datos de cobro, auditoría y la propia cuenta.
            { href: '/panel/admin/usuarios', label: 'Ajustes', icon: 'configuracion', activo: ['/panel/admin/usuarios', '/panel/admin/pagos', '/panel/admin/auditoria', '/panel/cuenta'] },
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
          { href: en('/checkin'), label: 'Ingreso al evento', icon: 'checkin', count: counts.llegadas ?? null, countLabel: 'dentro' },
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
      // Lo primero que se hace: escribir la invitación. Va arriba, con nombres que dicen qué pasa.
      {
        label: 'Mi invitación',
        items: [
          // Su invitación la escribe él: textos, canción e itinerario. La pantalla es la
          // misma del atelier, con las tarjetas del evento —diseño, contraseña, borrado—
          // fuera: esas son de quien le vendió la boda.
          { href: en('/configuracion'), label: 'Personalizar invitación', icon: 'editar' },
          { href: en('/vista-previa'), label: 'Vista previa', icon: 'vistaPrevia' },
          { href: en('/estadisticas'), label: 'Estadísticas', icon: 'estadisticas' },
        ],
      },
      {
        label: 'Mi evento',
        items: [
          { href: base, label: 'Resumen', icon: 'resumen' },
          { href: en('/invitados'), label: 'Invitados', icon: 'invitados', count: counts.invitados ?? null, countLabel: 'grupos' },
          // Quién llegó y quién falta, en vivo; y desde ahí, el modo puerta para escanear.
          { href: equipo === 'coanfitrion' ? null : en('/checkin'), label: 'Ingreso al evento', icon: 'checkin', count: counts.llegadas ?? null, countLabel: 'dentro' },
          { href: en('/mesas'), label: 'Mesas', icon: 'mesas' },
          { href: en('/regalos'), label: 'Regalos', icon: 'regalos' },
          { href: en('/mensajes'), label: 'Mensajes', icon: 'mensajes', count: counts.sinLeer ?? null, countLabel: 'sin leer' },
          // Co-anfitriones, planner y porteros en una sola pantalla. El anfitrión suma a todos;
          // su planner, solo porteros. El co-anfitrión no suma a nadie.
          { href: equipo === 'coanfitrion' ? null : en('/equipo'), label: 'Equipo', icon: 'usuarios' },
          // Comprar es del anfitrión.
          { href: equipo === 'anfitrion' ? en('/extras') : null, label: 'Extras', icon: 'plan' },
        ],
      },
      {
        label: 'Planner',
        items: [
          { href: en('/planner/tareas'), label: 'Plan de tareas', icon: 'tareas' },
          { href: en('/planner/presupuesto'), label: 'Presupuesto', icon: 'presupuesto' },
          // Proveedores y cronograma los llevan el anfitrión y su planner; el cortejo, todos.
          { href: equipo === 'coanfitrion' ? null : en('/planner/proveedores'), label: 'Proveedores', icon: 'proveedores' },
          { href: equipo === 'coanfitrion' ? null : en('/planner/cronograma'), label: 'Cronograma', icon: 'hoy' },
          { href: extra.cortejo === false ? null : en('/planner/cortejo'), label: 'Cortejo', icon: 'cortejo' },
          { href: en('/planner/documentos'), label: 'Documentos', icon: 'documentos' },
          { href: equipo === 'coanfitrion' ? null : en('/dia-d'), label: 'Día D', icon: 'diaD' },
        ],
      },
      {
        label: 'Cuenta',
        items: [
          { href: mesa, label: 'Mesa del planner', icon: 'eventos' },
          { href: '/panel/cuenta', label: 'Mi cuenta', icon: 'configuracion' },
        ],
      },
    ]
  }

  // El admin dentro de una boda: **solo el menú de esa boda**, como al entrar en un proyecto.
  // Con la administración debajo, pulsar «Hoy» sacaba del evento sin avisar y no se sabía
  // dónde se estaba; la salida es el «← Volver» de arriba de la barra. Invitados, mensajes,
  // mesas, regalos y planner son datos del cliente: para verlos entra como el cliente.
  if (esAdmin && base !== null) {
    return [
      {
        label: 'Este evento',
        items: [
          // El plan, el responsable y el acceso del cliente se cambian en la ficha: «Plan» es la
          // página donde un atelier *solicita* un cambio, y el admin no solicita, aplica.
          { href: en('/configuracion'), label: 'Ficha del evento', icon: 'configuracion' },
          { href: en('/vista-previa'), label: 'Ver invitación', icon: 'vistaPrevia' },
        ],
      },
    ]
  }

  return [
    {
      label: 'Invitación',
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
      label: 'Evento activo',
      items: [
        { href: base, label: 'Resumen', icon: 'resumen' },
        { href: en('/invitados'), label: 'Invitados', icon: 'invitados', count: counts.invitados ?? null, countLabel: 'grupos' },
        { href: en('/mesas'), label: 'Mesas', icon: 'mesas' },
        { href: en('/regalos'), label: 'Regalos', icon: 'regalos' },
        { href: en('/mensajes'), label: 'Mensajes', icon: 'mensajes', count: counts.sinLeer ?? null, countLabel: 'sin leer' },
        { href: en('/checkin'), label: 'Ingreso al evento', icon: 'checkin', count: counts.llegadas ?? null, countLabel: 'dentro' },
        { href: en('/equipo'), label: 'Equipo', icon: 'usuarios' },
      ],
    },
    {
      label: 'Planner',
      items: [
        { href: en('/planner/tareas'), label: 'Plan de tareas', icon: 'tareas' },
        { href: en('/planner/presupuesto'), label: 'Presupuesto', icon: 'presupuesto' },
        { href: en('/planner/proveedores'), label: 'Proveedores', icon: 'proveedores' },
        { href: en('/planner/cronograma'), label: 'Cronograma', icon: 'hoy' },
        { href: extra.cortejo === false ? null : en('/planner/cortejo'), label: 'Cortejo', icon: 'cortejo' },
        { href: en('/planner/documentos'), label: 'Documentos', icon: 'documentos' },
        { href: en('/dia-d'), label: 'Día D', icon: 'diaD' },
      ],
    },
    ...administracion,
    {
      label: 'Cuenta',
      items: [
        { href: en('/configuracion'), label: 'Configuración', icon: 'configuracion' },
        { href: en('/plan'), label: 'Plan', icon: 'plan' },
        { href: en('/extras'), label: 'Extras', icon: 'presupuesto' },
        { href: mesa, label: 'Mesa del planner', icon: 'eventos' },
        // La propia contraseña. Las cuentas las da de alta el admin y la clave inicial
        // viaja por WhatsApp: sin esta pantalla valdría para siempre.
        // El admin la tiene dentro de Ajustes.
        { href: esAdmin ? null : '/panel/cuenta', label: 'Mi cuenta', icon: 'configuracion' },
        // El admin ya tiene «Todos los eventos» en su sección, con todos los ateliers.
        { href: esAdmin ? null : '/panel', label: 'Todos los eventos', icon: 'eventos' },
        // La ayuda es para quien recibe su cuenta del admin; el admin es quien la escribe.
        { href: esAdmin ? null : '/panel/ayuda', label: 'Ayuda', icon: 'ayuda' },
      ],
    },
  ]
}

/** Cómo se llama cada rol en la tarjeta de quien ha entrado. */
export const ROTULO_DE_ROL: Record<'admin' | 'atelier' | 'cliente' | 'puerta', string> = {
  admin: 'Administrador',
  atelier: 'Atelier',
  cliente: 'Cliente',
  puerta: 'Personal de puerta',
}
