import { attempt, err, ok, type Result } from '@/shared/result'
import { ordersError, type OrdersError } from '../domain/errors'
import { canDecide, canReceiveProof, newPublicRef, normalizeRef, type Order, type OrderStatus } from '../domain/order'
import { checkProof } from '../domain/proof'
import type { FileStorage, OrderRepository, ProofRow } from './ports'

type Deps = { orders: OrderRepository; clock: () => Date }
type WithStorage = Deps & { storage: FileStorage; newKey: () => string }

const MAX_NAME = 160
const MAX_NOTES = 1000

/**
 * Alta de pedido desde la web pública.
 *
 * La referencia se acuña aquí y se reintenta ante colisión: son 31⁸ combinaciones, así
 * que no va a pasar, pero un `unique` que revienta en la cara del cliente sí sería
 * definitivo para él.
 */
export const placeOrder =
  (deps: Deps) =>
  async (input: {
    planSlug: string
    /**
     * El diseño elegido en el escaparate. Llega ya validado desde la frontera: quién sabe
     * qué temas existen es el registro, que vive en `events/ui`, y este módulo no puede
     * importarlo sin romper las fronteras. Aquí solo se recorta y se acota.
     */
    templateSlug?: string | null
    customerName: string
    contact: string
    eventDate: string | null
    notes: string | null
  }): Promise<Result<Order, OrdersError>> => {
    // Los errores del pedido público son **códigos** (`name`, `contact`…): la web los
    // traduce con su diccionario, en el idioma de quien pide.
    const nombre = input.customerName.trim()
    const contacto = input.contact.trim()

    if (nombre === '' || nombre.length > MAX_NAME) {
      return err(ordersError('invalid_input', 'name'))
    }
    if (contacto === '' || contacto.length > MAX_NAME) {
      return err(ordersError('invalid_input', 'contact'))
    }
    if (input.planSlug.trim() === '') return err(ordersError('invalid_input', 'plan'))

    const notas = input.notes?.trim() ?? ''
    if (notas.length > MAX_NOTES) return err(ordersError('invalid_input', 'notes'))

    // Un diseño que no cabe en la columna **no tumba el pedido**: se descarta y el evento
    // nacerá con el clásico. Un pedido es dinero; perderlo por un parámetro raro de la URL
    // sería la peor forma posible de validar.
    const diseno = input.templateSlug?.trim() ?? ''
    const templateSlug = diseno === '' || diseno.length > 64 ? null : diseno

    return attempt(
      async () => {
        for (let intento = 0; intento < 5; intento += 1) {
          const publicRef = newPublicRef()
          if ((await deps.orders.findByRef(publicRef)) !== null) continue

          return ok(
            await deps.orders.create({
              publicRef,
              planSlug: input.planSlug.trim(),
              templateSlug,
              customerName: nombre,
              contact: contacto,
              eventDate: input.eventDate,
              notes: notas === '' ? null : notas,
            }),
          )
        }

        return err(ordersError('storage_failure', 'No se pudo acuñar una referencia libre.'))
      },
      (cause) => ordersError('storage_failure', `No se pudo crear el pedido: ${String(cause)}`),
    )
  }

/**
 * El pedido de un extra desde el panel del evento. Quien lo pide ya tiene cuenta y evento:
 * no hay fecha ni diseño. El precio lo congela el repositorio desde el extra **activo**.
 */
export const placeAddonOrder =
  (deps: Deps) =>
  async (input: { addonSlug: string; eventId: string; customerName: string; contact: string }): Promise<Result<Order, OrdersError>> =>
    attempt(
      async () => {
        for (let intento = 0; intento < 5; intento += 1) {
          const publicRef = newPublicRef()
          if ((await deps.orders.findByRef(publicRef)) !== null) continue
          const creado = await deps.orders.createForAddon({
            publicRef,
            addonSlug: input.addonSlug,
            eventId: input.eventId,
            customerName: input.customerName.trim().slice(0, MAX_NAME) || input.contact,
            contact: input.contact.trim().slice(0, MAX_NAME),
          })
          return creado === null ? err(ordersError('invalid_input', 'Ese extra no está a la venta.')) : ok(creado)
        }
        return err(ordersError('storage_failure', 'No se pudo acuñar una referencia libre.'))
      },
      (cause) => ordersError('storage_failure', `No se pudo crear el pedido del extra: ${String(cause)}`),
    )

/** El pedido que hay detrás de una referencia. Una referencia desconocida es `not_found`, nunca «prohibido». */
export const findOrderByRef =
  (deps: Deps) =>
  async (rawRef: string): Promise<Result<{ order: Order; proofs: ProofRow[] }, OrdersError>> => {
    const publicRef = normalizeRef(rawRef)
    if (publicRef === null) return err(ordersError('not_found', 'Esa referencia no tiene forma de referencia.'))

    return attempt(
      async () => {
        const order = await deps.orders.findByRef(publicRef)
        if (order === null) return err(ordersError('not_found', `No existe el pedido ${publicRef}.`))
        return ok({ order, proofs: await deps.orders.listProofs(order.id) })
      },
      (cause) => ordersError('storage_failure', `No se pudo leer el pedido: ${String(cause)}`),
    )
  }

/**
 * El cliente sube su comprobante.
 *
 * El tipo lo decide el contenido —`checkProof` mira los magic bytes—, no la extensión ni
 * el `Content-Type`: los dos los escribe quien sube el fichero. Y el fichero se guarda con
 * un UUID por nombre: usar el original dejaría que quien sube eligiera dónde se escribe.
 */
export const attachProof =
  (deps: WithStorage) =>
  async (input: {
    rawRef: string
    bytes: Uint8Array
    declaredName: string
    declaredType: string
  }): Promise<Result<Order, OrdersError>> => {
    const publicRef = normalizeRef(input.rawRef)
    if (publicRef === null) return err(ordersError('not_found', 'Esa referencia no tiene forma de referencia.'))

    const veredicto = checkProof({
      bytes: input.bytes,
      declaredName: input.declaredName,
      declaredType: input.declaredType,
    })
    if (!veredicto.ok) return err(ordersError('proof_rejected', veredicto.reason))

    return attempt(
      async () => {
        const order = await deps.orders.findByRef(publicRef)
        if (order === null) return err(ordersError('not_found', `No existe el pedido ${publicRef}.`))
        if (!canReceiveProof(order.status)) {
          return err(ordersError('wrong_status', 'Este pedido ya está aprobado: no admite más comprobantes.'))
        }

        const storageKey = deps.newKey()
        // Primero el fichero y después la fila: al revés, un fallo al escribir en disco
        // dejaría en la base un comprobante que el panel no puede abrir.
        await deps.storage.put(storageKey, input.bytes)
        await deps.orders.addProof({
          orderId: order.id,
          storageKey,
          // El nombre original se recorta y se guarda **solo para enseñarlo**.
          originalName: input.declaredName.slice(0, 255),
          mime: veredicto.mime,
          sizeBytes: input.bytes.length,
        })
        await deps.orders.setStatus({ id: order.id, status: 'proof_submitted', decisionNote: null, decidedAt: null })

        return ok({ ...order, status: 'proof_submitted' as const, decisionNote: null, decidedAt: null })
      },
      (cause) => ordersError('storage_failure', `No se pudo guardar el comprobante: ${String(cause)}`),
    )
  }

/**
 * Una página de la bandeja, con sus comprobantes y el recuento por estado.
 *
 * **Se pagina en la base.** Leía todos los pedidos de la historia con todos sus comprobantes y
 * pintaba cada uno: con 1.500 pedidos eran 16 MB de HTML por visita. Ahora el recuento es un
 * `group by`, la página se corta en `tope` (se pide uno más para saber si queda algo) y los
 * comprobantes vienen en **una** consulta solo para los que se ven.
 */
export const listOrdersPage =
  (deps: Deps) =>
  async (input: {
    status: OrderStatus | null
    tope: number
    prioridad: readonly OrderStatus[]
  }): Promise<Result<{ pedidos: { order: Order; proofs: ProofRow[] }[]; conteo: Record<OrderStatus, number>; hayMas: boolean }, OrdersError>> =>
    attempt(
      async () => {
        const [conteo, filas] = await Promise.all([
          deps.orders.countByStatusAll(),
          deps.orders.listPage({ status: input.status, limit: input.tope + 1, prioridad: input.prioridad }),
        ])
        const pagina = filas.slice(0, input.tope)
        const porPedido = await deps.orders.listProofsFor(pagina.map((o) => o.id))
        return ok({ pedidos: pagina.map((order) => ({ order, proofs: porPedido.get(order.id) ?? [] })), conteo, hayMas: filas.length > input.tope })
      },
      (cause) => ordersError('storage_failure', `No se pudieron leer los pedidos: ${String(cause)}`),
    )

/**
 * El atelier aprueba o rechaza.
 *
 * Rechazar **exige nota**: «rechazado» a secas deja al cliente sin saber si transfirió de
 * menos, a otra cuenta o subió la foto equivocada, y la única salida es una llamada.
 */
export const decideOrder =
  (deps: Deps) =>
  async (input: { orderId: string; decision: 'approved' | 'rejected'; note: string }): Promise<Result<null, OrdersError>> => {
    const nota = input.note.trim()
    if (input.decision === 'rejected' && nota === '') {
      return err(ordersError('invalid_input', 'Un rechazo sin motivo obliga al cliente a llamar para averiguarlo.'))
    }

    return attempt(
      async () => {
        const order = await deps.orders.findById(input.orderId)
        if (order === null) return err(ordersError('not_found', `No existe el pedido ${input.orderId}.`))
        if (!canDecide(order.status)) {
          return err(ordersError('wrong_status', 'Solo se decide sobre un pedido con comprobante presentado.'))
        }

        await deps.orders.setStatus({
          id: order.id,
          status: input.decision,
          decisionNote: nota === '' ? null : nota,
          decidedAt: deps.clock(),
        })

        return ok(null)
      },
      (cause) => ordersError('storage_failure', `No se pudo decidir el pedido: ${String(cause)}`),
    )
  }

/** El comprobante, para el route handler que lo sirve tras la sesión del atelier. */
export const readProof =
  (deps: Deps & { storage: FileStorage }) =>
  async (proofId: string): Promise<Result<{ proof: ProofRow; bytes: Uint8Array }, OrdersError>> =>
    attempt(
      async () => {
        const proof = await deps.orders.findProof(proofId)
        if (proof === null) return err(ordersError('not_found', `No existe el comprobante ${proofId}.`))

        const bytes = await deps.storage.get(proof.storageKey)
        if (bytes === null) return err(ordersError('not_found', 'El fichero del comprobante no está en el almacén.'))

        return ok({ proof, bytes })
      },
      (cause) => ordersError('storage_failure', `No se pudo leer el comprobante: ${String(cause)}`),
    )
