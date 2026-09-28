/**
 * **La venta: una sola fila de la primera pregunta a la boda creada** (28 de septiembre).
 *
 * La consulta y el pedido de la misma persona eran dos tarjetas en dos bandejas —Consultas y
 * Pedidos— y en dos columnas del tablero. Aquí se unen: por `consultationId` si el pedido salió
 * de la consulta (cotización), y si no, por el correo o los últimos ocho dígitos del teléfono,
 * como `agruparClientes`. **En cuanto hay pedido, el pedido manda la etapa**, la regla que ya
 * estaba en `leads/domain/pipeline.ts`.
 *
 * Puro: sin base y sin reloj. `ahora` llega como argumento.
 */

export type FiestaDeVenta = 'boda' | 'xv' | 'cumple' | null

export type ConsultaDeVenta = {
  readonly id: string
  readonly name: string
  readonly email: string | null
  readonly phone: string | null
  readonly fiesta: FiestaDeVenta
  readonly categoria: string | null
  readonly eventDate: string | null
  readonly message: string | null
  readonly status: 'new' | 'contacted' | 'won' | 'lost'
  readonly note: string | null
  readonly lostReason: string | null
  readonly utm: Readonly<Record<string, string>> | null
  readonly createdAt: Date
  readonly statusChangedAt: Date | null
  readonly firstContactAt: Date | null
  readonly eventSlug: string | null
}

export type PedidoDeVenta = {
  readonly id: string
  readonly publicRef: string
  readonly customerName: string
  readonly contact: string
  readonly fiesta: FiestaDeVenta
  readonly eventDate: string | null
  readonly status: 'pending_payment' | 'proof_submitted' | 'approved' | 'rejected' | 'cancelled'
  readonly origin: 'web' | 'cotizacion'
  readonly amountCents: number | null
  readonly depositCents: number | null
  readonly balancePaidAt: Date | null
  readonly remindedAt: Date | null
  readonly producto: string
  readonly esExtra: boolean
  readonly eventSlug: string | null
  readonly consultationId: string | null
  readonly createdAt: Date
  readonly decidedAt: Date | null
}

export type EtapaDeVenta =
  | 'nueva'
  | 'contactada'
  | 'esperando_pago'
  | 'por_revisar'
  | 'por_crear_evento'
  | 'saldo_pendiente'
  | 'cerrada'
  | 'perdida'
  | 'cancelada'

export type TonoDeEtapa = 'no' | 'pending' | 'maybe' | 'ok'

/**
 * Las etapas, en el orden del embudo. `tablero`: tiene columna en el tablero (perdidas y
 * canceladas se ven en la lista). `accion`: pide que el admin haga algo ahora.
 */
export const ETAPAS_DE_VENTA: readonly {
  readonly clave: EtapaDeVenta
  readonly etiqueta: string
  /** Lo que dice la píldora de una sola venta. */
  readonly una: string
  readonly ayuda: string
  readonly tono: TonoDeEtapa
  readonly tablero: boolean
  readonly accion: boolean
}[] = [
  { clave: 'nueva', etiqueta: 'Nuevas', una: 'Nueva', ayuda: 'Escribieron y esperan respuesta', tono: 'maybe', tablero: true, accion: true },
  { clave: 'contactada', etiqueta: 'Contactadas', una: 'Contactada', ayuda: 'Ya les escribiste: toca cotizar', tono: 'pending', tablero: true, accion: false },
  { clave: 'esperando_pago', etiqueta: 'Esperando pago', una: 'Esperando pago', ayuda: 'Tienen su enlace de pago', tono: 'pending', tablero: true, accion: false },
  { clave: 'por_revisar', etiqueta: 'Por revisar', una: 'Por revisar', ayuda: 'Subieron su comprobante', tono: 'maybe', tablero: true, accion: true },
  { clave: 'por_crear_evento', etiqueta: 'Por crear evento', una: 'Por crear evento', ayuda: 'Pagaron y esperan su evento', tono: 'no', tablero: true, accion: true },
  { clave: 'saldo_pendiente', etiqueta: 'Saldo pendiente', una: 'Saldo pendiente', ayuda: 'Con evento; falta el saldo', tono: 'pending', tablero: true, accion: false },
  { clave: 'cerrada', etiqueta: 'Cerradas', una: 'Cerrada', ayuda: 'Cobradas y con su evento', tono: 'ok', tablero: true, accion: false },
  { clave: 'perdida', etiqueta: 'Perdidas', una: 'Perdida', ayuda: 'Con su motivo', tono: 'no', tablero: false, accion: false },
  { clave: 'cancelada', etiqueta: 'Canceladas', una: 'Cancelada', ayuda: 'Pedidos que no se cobraron', tono: 'no', tablero: false, accion: false },
]

export const etapaDeVenta = (clave: EtapaDeVenta) => ETAPAS_DE_VENTA.find((e) => e.clave === clave)!

export type Venta = {
  /** `p-<referencia>` o `c-<id>`: estable, va en la dirección (`?venta=`). */
  readonly clave: string
  readonly nombre: string
  readonly correo: string | null
  readonly telefono: string | null
  readonly fiesta: FiestaDeVenta
  readonly fechaEvento: string | null
  readonly etapa: EtapaDeVenta
  readonly consulta: ConsultaDeVenta | null
  readonly pedido: PedidoDeVenta | null
  /** Lo que vale: el importe del pedido. Sin pedido, todavía no vale nada. */
  readonly importeCents: number | null
  /** Desde cuándo está en la etapa en la que está: lo que ordena y lo que se vuelve urgente. */
  readonly esperaDesde: Date
  readonly urgente: boolean
}

const HORA = 3_600_000
const DIA = 24 * HORA
/** Una consulta sin contestar pasadas estas horas se pinta en rojo: el que contesta primero se queda la boda. */
const NUEVA_URGENTE = 24 * HORA
/** Un pedido sin pago y sin recordatorio pasados estos días. */
const PAGO_URGENTE = 5 * DIA
/** Un comprobante sin revisar pasadas estas horas: esa persona ya pagó. */
const COMPROBANTE_URGENTE = 12 * HORA

const digitos = (texto: string): string => texto.replace(/\D/g, '')
const telefonoClave = (texto: string | null): string | null => {
  if (texto === null) return null
  const d = digitos(texto)
  return d.length >= 8 ? d.slice(-8) : null
}
const correoClave = (texto: string | null): string | null => (texto !== null && texto.includes('@') ? texto.trim().toLowerCase() : null)

/** Las claves con las que una consulta y un pedido se reconocen como la misma persona. */
function clavesDeContacto(correo: string | null, telefono: string | null): string[] {
  return [correoClave(correo), telefonoClave(telefono)].filter((c): c is string => c !== null)
}

function etapaDePedido(p: PedidoDeVenta): EtapaDeVenta {
  if (p.status === 'cancelled') return 'cancelada'
  if (p.status === 'proof_submitted') return 'por_revisar'
  if (p.status !== 'approved') return 'esperando_pago'
  if (p.esExtra) return 'cerrada'
  if (p.eventSlug === null) return 'por_crear_evento'
  if (p.depositCents !== null && p.amountCents !== null && p.depositCents < p.amountCents && p.balancePaidAt === null) return 'saldo_pendiente'
  return 'cerrada'
}

function etapaDeConsulta(c: ConsultaDeVenta): EtapaDeVenta {
  return c.status === 'new' ? 'nueva' : c.status === 'contacted' ? 'contactada' : c.status === 'won' ? 'cerrada' : 'perdida'
}

function esperaDe(etapa: EtapaDeVenta, c: ConsultaDeVenta | null, p: PedidoDeVenta | null): Date {
  if (p !== null) {
    if (etapa === 'esperando_pago') return p.remindedAt ?? p.createdAt
    if (etapa === 'por_crear_evento' || etapa === 'saldo_pendiente' || etapa === 'cerrada' || etapa === 'cancelada') return p.decidedAt ?? p.createdAt
    return p.createdAt
  }
  if (c === null) return new Date(0)
  return etapa === 'nueva' ? c.createdAt : (c.statusChangedAt ?? c.createdAt)
}

function esUrgente(etapa: EtapaDeVenta, desde: Date, ahora: Date): boolean {
  const lleva = ahora.getTime() - desde.getTime()
  if (etapa === 'nueva') return lleva >= NUEVA_URGENTE
  if (etapa === 'por_revisar') return lleva >= COMPROBANTE_URGENTE
  if (etapa === 'esperando_pago') return lleva >= PAGO_URGENTE
  return etapa === 'por_crear_evento'
}

/**
 * Junta consultas y pedidos en ventas. Cada consulta y cada pedido salen **una sola vez**.
 *
 * Un pedido se une a la consulta de la que salió (`consultationId`); si no dice nada, a la
 * consulta más reciente de la misma persona que todavía no tenga pedido y no esté perdida.
 * Los pedidos de extras no se unen: son otra venta a un cliente que ya tiene su evento.
 */
export function componerVentas(input: { consultas: readonly ConsultaDeVenta[]; pedidos: readonly PedidoDeVenta[] }, ahora: Date): Venta[] {
  const porId = new Map(input.consultas.map((c) => [c.id, c]))
  const usadas = new Set<string>()
  const porContacto = new Map<string, ConsultaDeVenta[]>()
  for (const c of [...input.consultas].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())) {
    for (const k of clavesDeContacto(c.email, c.phone)) porContacto.set(k, [...(porContacto.get(k) ?? []), c])
  }

  // Primero los enlazados de verdad, para que un pedido sin enlace no le robe su consulta a otro.
  const ordenados = [...input.pedidos].sort((a, b) => Number(b.consultationId !== null) - Number(a.consultationId !== null))
  const ventas: Venta[] = []
  for (const p of ordenados) {
    let c: ConsultaDeVenta | null = null
    if (p.consultationId !== null) {
      const enlazada = porId.get(p.consultationId)
      if (enlazada !== undefined && !usadas.has(enlazada.id)) c = enlazada
    } else if (!p.esExtra) {
      const correo = correoClave(p.contact)
      const tel = telefonoClave(p.contact)
      const candidatas = [...(correo === null ? [] : (porContacto.get(correo) ?? [])), ...(tel === null ? [] : (porContacto.get(tel) ?? []))]
      c = candidatas.find((k) => !usadas.has(k.id) && k.status !== 'lost') ?? null
    }
    if (c !== null) usadas.add(c.id)
    const etapa = etapaDePedido(p)
    const espera = esperaDe(etapa, c, p)
    ventas.push({
      clave: `p-${p.publicRef}`,
      nombre: c?.name ?? p.customerName,
      correo: c?.email ?? correoClave(p.contact),
      telefono: c?.phone ?? (correoClave(p.contact) === null ? p.contact : null),
      fiesta: p.fiesta ?? c?.fiesta ?? null,
      fechaEvento: p.eventDate ?? c?.eventDate ?? null,
      etapa,
      consulta: c,
      pedido: p,
      importeCents: p.amountCents,
      esperaDesde: espera,
      urgente: esUrgente(etapa, espera, ahora),
    })
  }

  for (const c of input.consultas) {
    if (usadas.has(c.id)) continue
    const etapa = etapaDeConsulta(c)
    const espera = esperaDe(etapa, c, null)
    ventas.push({
      clave: `c-${c.id}`,
      nombre: c.name,
      correo: c.email,
      telefono: c.phone,
      fiesta: c.fiesta,
      fechaEvento: c.eventDate,
      etapa,
      consulta: c,
      pedido: null,
      importeCents: null,
      esperaDesde: espera,
      urgente: esUrgente(etapa, espera, ahora),
    })
  }

  // Lo urgente arriba; dentro, lo que más lleva esperando.
  return ventas.sort((a, b) => Number(b.urgente) - Number(a.urgente) || a.esperaDesde.getTime() - b.esperaDesde.getTime())
}

/** La venta de una clave de la dirección. Acepta también las viejas `?pedido=` y `?consulta=`. */
export function ventaDeClave(ventas: readonly Venta[], clave: { venta?: string | undefined; pedido?: string | undefined; consulta?: string | undefined }): Venta | undefined {
  if (clave.venta !== undefined) return ventas.find((v) => v.clave === clave.venta)
  if (clave.pedido !== undefined) return ventas.find((v) => v.pedido?.publicRef === clave.pedido)
  if (clave.consulta !== undefined) return ventas.find((v) => v.consulta?.id === clave.consulta)
  return undefined
}

/** Filtra por etapa, fiesta y texto (nombre, correo, teléfono, referencia). */
export function filtrarVentas(ventas: readonly Venta[], filtro: { etapa: EtapaDeVenta | 'abiertas' | 'todas'; fiesta: FiestaDeVenta | 'todas'; q: string }): Venta[] {
  const q = filtro.q.trim().toLowerCase()
  const qDigitos = digitos(q)
  return ventas.filter((v) => {
    if (filtro.etapa === 'abiertas' && (v.etapa === 'cerrada' || v.etapa === 'perdida' || v.etapa === 'cancelada')) return false
    if (filtro.etapa !== 'abiertas' && filtro.etapa !== 'todas' && v.etapa !== filtro.etapa) return false
    if (filtro.fiesta !== 'todas' && v.fiesta !== filtro.fiesta) return false
    if (q === '') return true
    const texto = [v.nombre, v.correo ?? '', v.pedido?.publicRef ?? ''].join(' ').toLowerCase()
    return texto.includes(q) || (qDigitos.length >= 4 && digitos(v.telefono ?? '').includes(qDigitos))
  })
}

/** Cuántas ventas hay en cada etapa. */
export function contarPorEtapa(ventas: readonly Venta[]): Record<EtapaDeVenta, number> {
  const conteo = Object.fromEntries(ETAPAS_DE_VENTA.map((e) => [e.clave, 0])) as Record<EtapaDeVenta, number>
  for (const v of ventas) conteo[v.etapa] += 1
  return conteo
}

/** El evento que salió de la venta, si salió. */
export const eventoDeVenta = (v: Venta): string | null => v.pedido?.eventSlug ?? v.consulta?.eventSlug ?? null

/** Lo que el admin tiene que hacer ahora con esta venta: el botón principal de su ficha. */
export function siguientePaso(v: Venta): string | null {
  switch (v.etapa) {
    case 'nueva':
      return 'Contactar'
    case 'contactada':
      return 'Enviar cotización'
    case 'esperando_pago':
      return 'Recordar el pago'
    case 'por_revisar':
      return 'Revisar el pago'
    case 'por_crear_evento':
      return 'Crear el evento'
    case 'saldo_pendiente':
      return 'Registrar el saldo'
    case 'cerrada':
      return eventoDeVenta(v) === null ? null : 'Abrir el evento'
    case 'perdida':
      return 'Reabrir'
    case 'cancelada':
      return null
  }
}

/**
 * La primera respuesta media en horas, de las consultas contestadas en la ventana. `null` sin
 * ninguna. Es la cifra que más decide una boda: el que contesta primero se la queda.
 */
export function primeraRespuestaMedia(consultas: readonly Pick<ConsultaDeVenta, 'createdAt' | 'firstContactAt'>[]): number | null {
  const tiempos = consultas
    .filter((c): c is typeof c & { firstContactAt: Date } => c.firstContactAt !== null)
    .map((c) => (c.firstContactAt.getTime() - c.createdAt.getTime()) / HORA)
    .filter((h) => h >= 0)
  if (tiempos.length === 0) return null
  return Math.round((tiempos.reduce((a, b) => a + b, 0) / tiempos.length) * 10) / 10
}

/** «Instagram», «Facebook», «Google», «WhatsApp», «Directo»: de dónde llegó, leído de su `utm`. */
export function origenDe(utm: Readonly<Record<string, string>> | null): string {
  const fuente = (utm?.utm_source ?? utm?.source ?? '').toLowerCase()
  if (fuente === '') return 'Directo'
  if (fuente.includes('instagram') || fuente === 'ig') return 'Instagram'
  if (fuente.includes('facebook') || fuente === 'fb') return 'Facebook'
  if (fuente.includes('google')) return 'Google'
  if (fuente.includes('tiktok')) return 'TikTok'
  if (fuente.includes('whatsapp') || fuente === 'wa') return 'WhatsApp'
  return fuente.charAt(0).toUpperCase() + fuente.slice(1)
}
