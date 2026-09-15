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
}

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
 * - **Admin**: ADMINISTRACIÓN y CUENTA; dentro de un evento, además, las del evento.
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
}

function componer(slug: string | null, counts: NavCounts, esAdmin: boolean, esPuerta: boolean, esCliente: boolean, extra: NavExtra): Borrador[] {
  const equipo = extra.equipo ?? 'anfitrion'
  const mesa = extra.mesaPlanner ? '/panel/planner' : null
  const base = slug === null ? null : `/panel/eventos/${slug}`
  const en = (ruta: string) => (base === null ? null : `${base}${ruta}`)

  // Tres secciones y no una de diez: lo del día, lo del negocio y lo del sistema. Una
  // lista plana ponía «Auditoría» al mismo nivel que «Hoy».
  const administracion: Borrador[] = esAdmin
    ? [
        {
          label: 'Día a día',
          items: [
            // Lo que espera decisión hoy. Sustituyó a Panorama: las cifras siguen dentro.
            { href: '/panel/admin', label: 'Hoy', icon: 'hoy' },
            // Lo que llega del formulario de la web. Se guardaba y nadie lo leía.
            { href: '/panel/admin/consultas', label: 'Consultas', icon: 'consultas', count: counts.consultas ?? null, countLabel: 'nuevas' },
            // Los pedidos del Plan B compran planes de Luxury Atelier: el dinero va a una
            // sola cuenta y las decide el admin. Estaban en «Cuenta», a la vista de
            // cualquier atelier, y ahora que aprobar crea cuentas y eventos eso era
            // enseñar una puerta que además abría de más.
            { href: '/panel/pedidos', label: 'Pedidos', icon: 'pedidos', count: counts.pedidos ?? null, countLabel: 'por revisar' },
            { href: '/panel/admin/eventos', label: 'Todos los eventos', icon: 'todosLosEventos' },
          ],
        },
        {
          label: 'Negocio',
          items: [
            // Lo cobrado por mes y por plan, con el importe congelado de cada pedido.
            { href: '/panel/admin/ingresos', label: 'Ingresos', icon: 'estadisticas' },
            // Precio, tope y funciones de cada plan, sin SQL ni despliegue.
            { href: '/panel/admin/planes', label: 'Planes', icon: 'plan' },
            // Publicar o retirar cada modelo de la web, y su música de escaparate. No es la
            // música de una boda: esa la sube su atelier o su cliente desde Configuración.
            { href: '/panel/admin/modelos', label: 'Modelos', icon: 'editar' },
            // WhatsApp, ubicación, redes, cifras, testimonios, textos legales y buscadores:
            // lo que la web pública enseña del negocio, sin tocar código.
            { href: '/panel/admin/web', label: 'La web', icon: 'web' },
            { href: '/panel/admin/pagos', label: 'Datos de cobro', icon: 'qr' },
          ],
        },
        {
          label: 'Sistema',
          items: [
            { href: '/panel/admin/usuarios', label: 'Usuarios', icon: 'usuarios' },
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
          // Su gente de la puerta: la suman el anfitrión y su planner, con enlace y PIN.
          { href: equipo === 'coanfitrion' ? null : en('/porteros'), label: 'Porteros', icon: 'checkin' },
          // Solo el anfitrión suma personas: nadie da más permisos de los que tiene.
          { href: equipo === 'anfitrion' ? en('/equipo') : null, label: 'Equipo', icon: 'usuarios' },
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
          { href: en('/planner/cortejo'), label: 'Cortejo', icon: 'cortejo' },
          { href: en('/planner/documentos'), label: 'Documentos', icon: 'documentos' },
          { href: equipo === 'coanfitrion' ? null : en('/dia-d'), label: 'Día D', icon: 'checkin' },
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
        items: [
          { href: mesa, label: 'Mesa del planner', icon: 'eventos' },
          { href: '/panel/cuenta', label: 'Mi cuenta', icon: 'configuracion' },
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
        { href: en('/porteros'), label: 'Porteros', icon: 'usuarios' },
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
        { href: en('/planner/cortejo'), label: 'Cortejo', icon: 'cortejo' },
        { href: en('/planner/documentos'), label: 'Documentos', icon: 'documentos' },
        { href: en('/dia-d'), label: 'Día D', icon: 'checkin' },
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
    ...administracion,
    {
      label: 'Cuenta',
      items: [
        { href: en('/configuracion'), label: 'Configuración', icon: 'configuracion' },
        { href: en('/plan'), label: 'Plan', icon: 'plan' },
        { href: mesa, label: 'Mesa del planner', icon: 'eventos' },
        // La propia contraseña. Las cuentas las da de alta el admin y la clave inicial
        // viaja por WhatsApp: sin esta pantalla valdría para siempre.
        { href: '/panel/cuenta', label: 'Mi cuenta', icon: 'configuracion' },
        // El admin ya tiene «Todos los eventos» en su sección, con todos los ateliers.
        { href: esAdmin ? null : '/panel', label: 'Todos los eventos', icon: 'eventos' },
        // La ayuda es para quien recibe su cuenta del admin; el admin es quien la escribe.
        { href: esAdmin ? null : '/panel/ayuda', label: 'Ayuda', icon: 'ayuda' },
      ],
    },
  ]
}
