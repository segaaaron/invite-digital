import { traductor, type T } from '@/shared/i18n/t'
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
  /** El cliente tiene más de un evento (compró otro): llega a «Mis eventos» y elige. */
  readonly misEventos?: boolean
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
  /** El idioma de la barra (el del aparato); sin él, español. */
  readonly t?: T
}

function componer(slug: string | null, counts: NavCounts, esAdmin: boolean, esPuerta: boolean, esCliente: boolean, extra: NavExtra): Borrador[] {
  const t = extra.t ?? traductor('es')
  const equipo = extra.equipo ?? 'anfitrion'
  const mesa = extra.mesaPlanner ? '/panel/planner' : null
  const base = slug === null ? null : `/panel/eventos/${slug}`
  const fuera = new Set(extra.fueraDelPlan ?? [])
  const en = (ruta: string) => (base === null || fuera.has(ruta) ? null : `${base}${ruta}`)

  // **Los grupos de la maqueta «Esmeralda y Latón»** (12 de octubre): Principal · Vender · Organizar · Configurar.
  // Cada trabajo en un solo sitio; las pantallas hermanas son pestañas de su entrada (`activo`). La cuenta propia
  // vive en la tarjeta de quien entró, abajo de la barra.
  const administracion: Borrador[] = esAdmin
    ? [
        { label: t('Principal', 'Main'), items: [{ href: '/panel/admin', label: t('Hoy', 'Today'), icon: 'hoy' }] },
        {
          label: t('Vender', 'Sell'),
          items: [
            // La consulta y su pedido son la misma venta, de la primera pregunta al evento creado.
            {
              href: '/panel/admin/ventas',
              label: t('Ventas', 'Sales'),
              icon: 'pedidos',
              count: (counts.consultas ?? 0) + (counts.pedidos ?? 0) || null,
              countLabel: t('por atender', 'to handle'),
              activo: ['/panel/admin/ventas', '/panel/admin/consultas', '/panel/pedidos'],
            },
            // La persona entera: sus consultas, pedidos, eventos, acceso y notas.
            { href: '/panel/admin/clientes', label: t('Clientes', 'Clients'), icon: 'usuarios', activo: ['/panel/admin/clientes'] },
            { href: '/panel/admin/ingresos', label: t('Ingresos', 'Revenue'), icon: 'ingresos', activo: ['/panel/admin/ingresos'] },
          ],
        },
        {
          label: t('Organizar', 'Organize'),
          items: [
            // La cartera y su calendario: qué evento está en riesgo y qué fin de semana queda libre.
            { href: '/panel/admin/eventos', label: t('Eventos', 'Events'), icon: 'todosLosEventos', activo: ['/panel/admin/eventos', '/panel/eventos'] },
            // Lo que vende la web: modelos, planes y extras.
            { href: '/panel/admin/modelos', label: t('Catálogo', 'Catalog'), icon: 'catalogo', activo: ['/panel/admin/modelos', '/panel/admin/planes', '/panel/admin/extras'] },
          ],
        },
        {
          label: t('Configurar', 'Configure'),
          items: [
            {
              href: '/panel/admin/fallos',
              label: t('Ajustes', 'Settings'),
              icon: 'configuracion',
              activo: ['/panel/admin/ajustes', '/panel/admin/fallos', '/panel/admin/usuarios', '/panel/admin/pagos', '/panel/admin/asistente', '/panel/admin/web', '/panel/admin/mensajes', '/panel/admin/auditoria'],
            },
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
        label: t('Puerta', 'Door'),
        items: [
          { href: en('/checkin'), label: t('Ingreso al evento', 'Event check-in'), icon: 'checkin', count: counts.llegadas ?? null, countLabel: t('dentro', 'inside') },
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
    // Los grupos de la maqueta: Mi evento · Organizar · El gran día · Ajustes. «Ver mi invitación» va arriba, en la
    // barra superior, a un toque desde cualquier pantalla.
    return [
      {
        label: t('Mi evento', 'My event'),
        items: [
          { href: base, label: t('Resumen', 'Overview'), icon: 'resumen' },
          { href: en('/configuracion'), label: t('Mi invitación', 'My invitation'), icon: 'editar' },
          { href: en('/invitados'), label: t('Invitados', 'Guests'), icon: 'invitados', count: counts.invitados ?? null, countLabel: t('personas', 'people') },
          { href: en('/mesas'), label: t('Mesas', 'Tables'), icon: 'mesas' },
          { href: en('/regalos'), label: t('Regalos', 'Gifts'), icon: 'regalos' },
          { href: en('/mensajes'), label: t('Libro de firmas', 'Guestbook'), icon: 'mensajes', count: counts.sinLeer ?? null, countLabel: t('sin agradecer', 'not thanked') },
        ],
      },
      {
        label: t('Organizar', 'Organize'),
        items: [
          { href: en('/planner/tareas'), label: t('Tareas', 'Tasks'), icon: 'tareas' },
          { href: en('/planner/presupuesto'), label: t('Presupuesto', 'Budget'), icon: 'presupuesto' },
          // Proveedores y cronograma los llevan el anfitrión y su planner; el cortejo, todos.
          { href: equipo === 'coanfitrion' ? null : en('/planner/proveedores'), label: t('Proveedores', 'Vendors'), icon: 'proveedores' },
          { href: equipo === 'coanfitrion' ? null : en('/planner/cronograma'), label: t('Cronograma', 'Schedule'), icon: 'cronograma' },
          { href: extra.cortejo === false ? null : en('/planner/cortejo'), label: t('Cortejo', 'Wedding party'), icon: 'cortejo' },
          { href: en('/planner/documentos'), label: t('Documentos', 'Documents'), icon: 'documentos' },
          // La agenda del atelier no está en la maqueta; se queda al final de Organizar para no perderla.
          { href: equipo === 'coanfitrion' ? null : en('/planner/agenda'), label: t('Agenda', 'Calendar'), icon: 'agenda' },
        ],
      },
      {
        label: t('El gran día', 'The big day'),
        items: [
          { href: equipo === 'coanfitrion' ? null : en('/dia-d'), label: t('Día D', 'D-Day'), icon: 'diaD' },
          { href: equipo === 'coanfitrion' ? null : en('/checkin'), label: t('Ingreso al evento', 'Event check-in'), icon: 'checkin', count: counts.llegadas ?? null, countLabel: t('dentro', 'inside') },
        ],
      },
      {
        label: t('Ajustes', 'Settings'),
        items: [
          // El anfitrión suma a su planner y a la recepción; el co-anfitrión no suma a nadie.
          { href: equipo === 'coanfitrion' ? null : en('/equipo'), label: t('Equipo y recepción', 'Team and reception'), icon: 'equipo' },
          // Comprar es del anfitrión.
          { href: equipo === 'anfitrion' ? en('/extras') : null, label: t('Extras', 'Extras'), icon: 'extras' },
          { href: en('/ajustes'), label: t('Configuración', 'Settings'), icon: 'configuracion' },
          { href: extra.misEventos ? '/panel' : null, label: t('Mis eventos', 'My events'), icon: 'eventos' },
          { href: mesa, label: t('Mesa del planner', 'Planner desk'), icon: 'eventos' },
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
        label: t('Este evento', 'This event'),
        items: [
          // El plan, el responsable y el acceso del cliente se cambian en la ficha: «Plan» es la
          // página donde un atelier *solicita* un cambio, y el admin no solicita, aplica.
          { href: en('/configuracion'), label: t('Ficha del evento', 'Event record'), icon: 'configuracion' },
          { href: en('/vista-previa'), label: t('Ver invitación', 'View invitation'), icon: 'vistaPrevia' },
        ],
      },
    ]
  }

  return [
    {
      label: t('Invitación', 'Invitation'),
      items: [
        { href: en('/configuracion'), label: t('Editar invitación', 'Edit invitation'), icon: 'editar' },
        { href: en('/vista-previa'), label: t('Ver invitación', 'View invitation'), icon: 'vistaPrevia' },
        { href: en('/qr'), label: t('Códigos QR', 'QR codes'), icon: 'qr' },
      ],
    },
    {
      label: t('Evento activo', 'Active event'),
      items: [
        { href: base, label: t('Resumen', 'Overview'), icon: 'resumen' },
        { href: en('/invitados'), label: t('Invitados', 'Guests'), icon: 'invitados', count: counts.invitados ?? null, countLabel: t('grupos', 'groups') },
        { href: en('/mesas'), label: t('Mesas', 'Tables'), icon: 'mesas' },
        { href: en('/regalos'), label: t('Regalos', 'Gifts'), icon: 'regalos' },
        { href: en('/mensajes'), label: t('Mensajes', 'Messages'), icon: 'mensajes', count: counts.sinLeer ?? null, countLabel: t('sin leer', 'unread') },
        { href: en('/checkin'), label: t('Ingreso al evento', 'Event check-in'), icon: 'checkin', count: counts.llegadas ?? null, countLabel: t('dentro', 'inside') },
        { href: en('/equipo'), label: t('Equipo', 'Team'), icon: 'usuarios' },
      ],
    },
    {
      label: t('Planner', 'Planner'),
      items: [
        { href: en('/planner/tareas'), label: t('Plan de tareas', 'Task plan'), icon: 'tareas' },
        { href: en('/planner/agenda'), label: t('Agenda', 'Calendar'), icon: 'agenda' },
        { href: en('/planner/presupuesto'), label: t('Presupuesto', 'Budget'), icon: 'presupuesto' },
        { href: en('/planner/proveedores'), label: t('Proveedores', 'Vendors'), icon: 'proveedores' },
        { href: en('/planner/cronograma'), label: t('Cronograma', 'Schedule'), icon: 'cronograma' },
        { href: extra.cortejo === false ? null : en('/planner/cortejo'), label: t('Cortejo', 'Wedding party'), icon: 'cortejo' },
        { href: en('/planner/documentos'), label: t('Documentos', 'Documents'), icon: 'documentos' },
        { href: en('/dia-d'), label: t('Día D', 'D-Day'), icon: 'diaD' },
      ],
    },
    ...administracion,
    {
      label: t('Cuenta', 'Account'),
      items: [
        // «Configuración» ya es «Editar invitación», arriba: la misma pantalla dos veces.
        { href: en('/plan'), label: t('Plan', 'Plan'), icon: 'plan' },
        { href: en('/extras'), label: t('Extras', 'Extras'), icon: 'presupuesto' },
        { href: mesa, label: t('Mesa del planner', 'Planner desk'), icon: 'eventos' },
        // «Mi cuenta» no va aquí: vive en el menú de la tarjeta del usuario, para todos.
        // El admin ya tiene «Todos los eventos» en su sección, con todos los ateliers.
        { href: esAdmin ? null : '/panel', label: t('Todos los eventos', 'All events'), icon: 'eventos' },
        // La ayuda es para quien recibe su cuenta del admin; el admin es quien la escribe.
        { href: esAdmin ? null : '/panel/ayuda', label: t('Ayuda', 'Help'), icon: 'ayuda' },
      ],
    },
  ]
}

/** Cómo se llama cada rol en la tarjeta de quien ha entrado. */
export const rotuloDeRol = (rol: 'admin' | 'atelier' | 'cliente' | 'puerta', t: T): string =>
  ({ admin: t('Administrador', 'Administrator'), atelier: 'Atelier', cliente: t('Cliente', 'Client'), puerta: t('Personal de puerta', 'Door staff') })[rol]

/** La forma de la barra inferior del celular: qué destinos van a la vista y la acción central. */
export type ConfigDeBarra = {
  /** Las entradas a la vista, en orden (dos a cuatro). Las demás van a «Más». */
  readonly vista?: readonly NavItem[]
  /** La acción principal, al centro y destacada: en el panel del evento, «Enviar». */
  readonly centro?: NavItem
}

/**
 * La barra inferior de un evento en el celular (6 de octubre): **Inicio · Invitados · Enviar · Ingreso**
 * y «Más» con el resto. Lo que más se hace —mandar invitaciones— queda al centro, a un toque. Solo con
 * entradas que esta persona ya tiene en su menú: a quien no le toca Ingreso, le va Mesas.
 *
 * El admin dentro de un evento ve su ficha: Eventos (volver a la cartera) · Ficha · Invitación. La
 * puerta no lleva barra: su panel es una sola pantalla.
 */
export function barraDelEvento(slug: string, sections: readonly NavSection[], quien: 'admin' | 'puerta' | 'equipo', t: T = traductor('es')): ConfigDeBarra | false {
  if (quien === 'puerta') return false
  const base = `/panel/eventos/${slug}`
  const todas = sections.flatMap((s) => s.items)
  const de = (href: string) => todas.find((item) => item.href === href)
  const corto = (item: NavItem | undefined, label: string): NavItem | null => (item === undefined ? null : { ...item, label })

  if (quien === 'admin') {
    return {
      vista: [
        { href: '/panel/admin/eventos', label: t('Eventos', 'Events'), icon: 'todosLosEventos' },
        corto(de(`${base}/configuracion`), t('Ficha', 'Record')),
        corto(de(`${base}/vista-previa`), t('Invitación', 'Invitation')),
      ].filter((item): item is NavItem => item !== null),
    }
  }

  const invitados = de(`${base}/invitados`)
  const vista = [corto(de(base), t('Inicio', 'Home')), invitados ?? null, corto(de(`${base}/checkin`), t('Ingreso', 'Check-in')) ?? de(`${base}/mesas`) ?? null].filter(
    (item): item is NavItem => item !== null,
  )
  return invitados === undefined ? { vista } : { vista, centro: { href: `${base}/invitados?panel=envio`, label: t('Enviar', 'Send'), icon: 'enviar' } }
}
