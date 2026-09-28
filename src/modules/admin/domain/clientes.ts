/**
 * **Clientes: una persona, todo lo suyo.** La misma novia escribe una consulta con su correo,
 * pide el plan con su teléfono y recibe la cuenta con el correo otra vez: tres tablas que no
 * se conocen. Aquí se unen por lo que la identifica —correo o teléfono— y, si algo trae los
 * dos, une también a quienes tenían solo uno (unión de conjuntos).
 *
 * Puro: recibe filas planas y el reloj no le hace falta. El orden es por última actividad.
 */

export type ConsultaDeCliente = { readonly id: string; readonly name: string; readonly email: string | null; readonly phone: string | null; readonly status: string; readonly createdAt: Date }
export type PedidoDeCliente = {
  readonly publicRef: string
  readonly customerName: string
  readonly contact: string
  readonly status: string
  readonly createdAt: Date
  readonly eventSlug: string | null
  readonly producto: string
  /** Lo que vale el pedido, congelado. Sin él (pedidos antiguos), no suma al valor del cliente. */
  readonly amountCents?: number | null
  readonly decidedAt?: Date | null
}
/** `nombre`: el que el admin escribió al darle de alta (`users.full_name`), si lo hay. */
export type CuentaDeCliente = { readonly email: string; readonly phone: string | null; readonly createdAt: Date; readonly nombre?: string | null }
export type EventoDeCliente = { readonly slug: string; readonly title: string; readonly eventDate: string; readonly anfitriones: readonly { readonly email: string; readonly phone: string | null }[] }

export type Cliente = {
  readonly clave: string
  readonly nombre: string
  readonly correos: readonly string[]
  readonly telefonos: readonly string[]
  readonly cuenta: boolean
  readonly consultas: readonly ConsultaDeCliente[]
  readonly pedidos: readonly PedidoDeCliente[]
  readonly eventos: readonly EventoDeCliente[]
  readonly ultima: Date
}

const correo = (texto: string | null): string | null => {
  const limpio = texto?.trim().toLowerCase() ?? ''
  return limpio.includes('@') ? limpio : null
}

/** ponytail: los últimos 8 dígitos (celular boliviano) igualan «+591 7…» y «7…»; con clientes de fuera habría que guardar E.164. */
const telefono = (texto: string | null): string | null => {
  if (texto === null || texto.includes('@')) return null
  const digitos = texto.replace(/\D/g, '')
  return digitos.length >= 7 ? digitos.slice(-8) : null
}

export function agruparClientes(entrada: {
  readonly consultas: readonly ConsultaDeCliente[]
  readonly pedidos: readonly PedidoDeCliente[]
  readonly cuentas: readonly CuentaDeCliente[]
  readonly eventos: readonly EventoDeCliente[]
}): Cliente[] {
  const padre = new Map<string, string>()
  const raiz = (x: string): string => {
    let r = x
    while (padre.get(r) !== r) r = padre.get(r) ?? r
    padre.set(x, r)
    return r
  }
  const unir = (claves: readonly string[]): string | null => {
    const [primera, ...resto] = claves
    if (primera === undefined) return null
    for (const c of claves) if (!padre.has(c)) padre.set(c, c)
    for (const c of resto) padre.set(raiz(c), raiz(primera))
    return primera
  }
  const claves = (email: string | null, phone: string | null) =>
    [correo(email), telefono(phone)].flatMap((v, i) => (v === null ? [] : [`${i === 0 ? 'e' : 't'}:${v}`]))

  // Primero se conocen todas las uniones; después se reparte, cuando las raíces ya no cambian.
  const consultas = entrada.consultas.map((c) => ({ c, k: unir(claves(c.email, c.phone)) }))
  const pedidos = entrada.pedidos.map((p) => ({ p, k: unir(claves(p.contact, p.contact)) }))
  const cuentas = entrada.cuentas.map((u) => ({ u, k: unir(claves(u.email, u.phone)) }))
  const eventos = entrada.eventos.flatMap((e) => e.anfitriones.map((a) => ({ e, k: unir(claves(a.email, a.phone)) })))

  type Acumulado = { nombre: { texto: string; fecha: Date } | null; correos: Set<string>; telefonos: Map<string, string>; cuenta: boolean; consultas: ConsultaDeCliente[]; pedidos: PedidoDeCliente[]; eventos: Map<string, EventoDeCliente>; ultima: Date }
  const porRaiz = new Map<string, Acumulado>()
  const de = (k: string): Acumulado => {
    const r = raiz(k)
    const hay = porRaiz.get(r)
    if (hay !== undefined) return hay
    const nuevo: Acumulado = { nombre: null, correos: new Set(), telefonos: new Map(), cuenta: false, consultas: [], pedidos: [], eventos: new Map(), ultima: new Date(0) }
    porRaiz.set(r, nuevo)
    return nuevo
  }
  const anotar = (a: Acumulado, nombre: string, fecha: Date, email: string | null, phone: string | null) => {
    if (nombre.trim() !== '' && (a.nombre === null || fecha > a.nombre.fecha)) a.nombre = { texto: nombre.trim(), fecha }
    if (fecha > a.ultima) a.ultima = fecha
    const e = correo(email)
    if (e !== null) a.correos.add(e)
    // El mismo número escrito de dos formas («+591 7111 2222», «71112222») se enseña una vez.
    const t = telefono(phone)
    if (t !== null && phone !== null && !a.telefonos.has(t)) a.telefonos.set(t, phone.trim())
  }

  for (const { c, k } of consultas) {
    if (k === null) continue
    de(k).consultas.push(c)
    anotar(de(k), c.name, c.createdAt, c.email, c.phone)
  }
  for (const { p, k } of pedidos) {
    if (k === null) continue
    de(k).pedidos.push(p)
    anotar(de(k), p.customerName, p.createdAt, p.contact, p.contact)
  }
  for (const { u, k } of cuentas) {
    if (k === null) continue
    de(k).cuenta = true
    anotar(de(k), u.nombre ?? '', u.createdAt, u.email, u.phone)
  }
  for (const { e, k } of eventos) if (k !== null) de(k).eventos.set(e.slug, e)

  return [...porRaiz.entries()]
    .map(([clave, a]) => ({
      clave,
      nombre: a.nombre?.texto ?? [...a.correos][0] ?? [...a.telefonos.values()][0] ?? 'Sin nombre',
      correos: [...a.correos],
      telefonos: [...a.telefonos.values()],
      cuenta: a.cuenta,
      consultas: a.consultas.toSorted((x, y) => y.createdAt.getTime() - x.createdAt.getTime()),
      pedidos: a.pedidos.toSorted((x, y) => y.createdAt.getTime() - x.createdAt.getTime()),
      eventos: [...a.eventos.values()],
      ultima: a.ultima,
    }))
    .toSorted((x, y) => y.ultima.getTime() - x.ultima.getTime())
}

/** Busca en nombre, correos y teléfonos, sin tildes ni mayúsculas. */
export function filtrarClientes(clientes: readonly Cliente[], texto: string): readonly Cliente[] {
  const plano = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  const q = plano(texto.trim())
  if (q === '') return clientes
  const digitos = q.replace(/\D/g, '')
  return clientes.filter(
    (c) =>
      plano(c.nombre).includes(q) ||
      c.correos.some((e) => e.includes(q)) ||
      (digitos.length >= 4 && c.telefonos.some((t) => t.replace(/\D/g, '').includes(digitos))),
  )
}

/**
 * **En qué punto está la persona**, derivado de lo que ya se guarda (28 de septiembre). Antes
 * «Comprador» se le decía a quien solo había pedido un plan sin pagarlo.
 *
 * Celebrado si todos sus eventos pasaron; cliente si tiene evento o un pago aprobado; pidió plan si
 * tiene un pedido abierto; perdido si todo lo suyo se perdió o se canceló; si no, prospecto.
 */
export const ETAPAS_DE_CLIENTE = [
  { clave: 'prospecto', etiqueta: 'Prospecto', tono: 'pending' },
  { clave: 'pidio_plan', etiqueta: 'Pidió plan', tono: 'maybe' },
  { clave: 'cliente', etiqueta: 'Cliente', tono: 'ok' },
  { clave: 'celebrado', etiqueta: 'Celebrado', tono: 'ok' },
  { clave: 'perdido', etiqueta: 'Perdido', tono: 'no' },
] as const
export type EtapaDeCliente = (typeof ETAPAS_DE_CLIENTE)[number]['clave']

export function etapaDeCliente(c: Cliente, hoy: string): EtapaDeCliente {
  if (c.eventos.length > 0) return c.eventos.every((e) => e.eventDate < hoy) ? 'celebrado' : 'cliente'
  if (c.pedidos.some((p) => p.status === 'approved')) return 'cliente'
  if (c.pedidos.some((p) => p.status === 'pending_payment' || p.status === 'proof_submitted' || p.status === 'rejected')) return 'pidio_plan'
  const todoPerdido = c.pedidos.every((p) => p.status === 'cancelled') && c.consultas.every((k) => k.status === 'lost')
  if (todoPerdido && (c.pedidos.length > 0 || c.consultas.length > 0)) return 'perdido'
  return c.cuenta ? 'cliente' : 'prospecto'
}

/** Lo que ha pagado: la suma de sus pedidos aprobados. */
export const valorDeCliente = (c: Cliente): number => c.pedidos.filter((p) => p.status === 'approved').reduce((s, p) => s + (p.amountCents ?? 0), 0)

/** Su próximo evento, o el último si ya pasaron todos. */
export function eventoPrincipal(c: Cliente, hoy: string): EventoDeCliente | null {
  const ordenados = [...c.eventos].sort((a, b) => a.eventDate.localeCompare(b.eventDate))
  return ordenados.find((e) => e.eventDate >= hoy) ?? ordenados.at(-1) ?? null
}

/**
 * Las claves con las que se guarda y se encuentra su nota: cada correo y cada teléfono. Se lee por
 * cualquiera de ellas y se escribe con la primera, así la nota sigue a la persona aunque su
 * grupo se una con otro después.
 */
export function clavesDeNota(c: Cliente): string[] {
  return [...c.correos.map((e) => `e:${e}`), ...c.telefonos.map((t) => telefono(t)).filter((t): t is string => t !== null).map((t) => `t:${t}`)]
}

/** Si alguno de sus contactos es el que se busca (correo o teléfono, escrito como sea). */
export function tieneContacto(c: Cliente, contacto: string): boolean {
  const e = correo(contacto)
  const t = telefono(contacto)
  return (e !== null && c.correos.includes(e)) || (t !== null && c.telefonos.some((x) => telefono(x) === t))
}

export type HitoDeCliente = { readonly cuando: Date; readonly texto: string; readonly href: string | null }

/** Lo que ha pasado con esta persona, en orden: consultas, pedidos, pagos y eventos. */
export function lineaDeTiempo(c: Cliente): HitoDeCliente[] {
  const hitos: HitoDeCliente[] = [
    ...c.consultas.map((k) => ({ cuando: k.createdAt, texto: 'Escribió desde la web', href: `/panel/admin/ventas?venta=c-${k.id}` })),
    ...c.pedidos.map((p) => ({ cuando: p.createdAt, texto: `Pedido ${p.producto}`, href: `/panel/admin/ventas?venta=p-${p.publicRef}` })),
    ...c.pedidos
      .filter((p): p is typeof p & { decidedAt: Date } => p.status === 'approved' && p.decidedAt instanceof Date)
      .map((p) => ({ cuando: p.decidedAt, texto: 'Pago aprobado', href: `/panel/admin/ventas?venta=p-${p.publicRef}` })),
    ...c.eventos.map((e) => ({ cuando: new Date(`${e.eventDate}T12:00:00Z`), texto: e.title, href: `/panel/eventos/${e.slug}/configuracion` })),
  ]
  return hitos.sort((a, b) => a.cuando.getTime() - b.cuando.getTime())
}
