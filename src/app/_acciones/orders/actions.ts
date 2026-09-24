'use server'

import { avisarAlAdmin } from '@/app/_acciones/avisar-al-admin'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { admin, events, identity, notifications, orders, plans } from '@/app/composition/container'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { type Actor, createCredential, parseRole } from '@/modules/identity'
import { requireAdmin } from '@/app/_acciones/sesion'
import { eventSlugFor, rsvpDeadlineFor } from '@/modules/orders/domain/provisioning'
import { clientIpFrom } from '@/shared/http/client-ip'
import { createRateLimiter } from '@/shared/http/rate-limit'
import { isErr } from '@/shared/result'
import { MAX_PROOF_BYTES } from '@/modules/orders/domain/proof'
import { campo } from '@/shared/forms/campo'
import { normalizarWhatsapp } from '@/shared/whatsapp'
import type { OrderErrorCode } from '@/shared/i18n/dictionary'

// ============================================================================
// Este fichero tiene DOS bloques, y la diferencia importa.
//
// Arriba, las acciones **públicas**: cualquiera en internet puede llamarlas sin sesión,
// así que van con límite de tasa por IP y validan todo lo que reciben. Abajo, las del
// atelier, que empiezan por `requireSession()`.
//
// Añadir una acción del atelier en el bloque de arriba la dejaría sin sesión.
// ============================================================================

/** Tres pedidos por minuto y por IP. Un formulario público sin freno se llena de basura. */
const limitePedido = createRateLimiter({ windowMs: 60_000, max: 3 })
/** Las subidas son más caras: cada una escribe hasta ocho megas en disco. */
const limiteSubida = createRateLimiter({ windowMs: 60_000, max: 5 })

async function ipDeLaPeticion(): Promise<string> {
  const bolsa = await headers()
  return clientIpFrom({ realIp: bolsa.get('x-real-ip'), forwardedFor: bolsa.get('x-forwarded-for') })
}

/**
 * Lo público devuelve **códigos**, no frases: el formulario los traduce con el diccionario
 * del idioma de la página. Una frase escrita aquí salía en español en la web en inglés.
 */
export type PlaceOrderState =
  | { status: 'idle' }
  | { status: 'success'; publicRef: string }
  | { status: 'error'; code: OrderErrorCode }

const CODIGOS_DE_PEDIDO: ReadonlySet<string> = new Set(['name', 'contact', 'plan', 'notes'])

export async function placeOrderAction(_previous: PlaceOrderState, formData: FormData): Promise<PlaceOrderState> {
  if (limitePedido.isLimited(await ipDeLaPeticion(), Date.now())) {
    return { status: 'error', code: 'rateLimited' }
  }

  const texto = (clave: string): string => {
    const valor = formData.get(clave)
    return typeof valor === 'string' ? valor : ''
  }

  const fecha = texto('eventDate').trim()

  const result = await orders.place({
    planSlug: texto('planSlug'),
    // Ya viene validado contra el registro de temas por la página que pinta el formulario:
    // aquí solo viaja.
    templateSlug: texto('templateSlug'),
    customerName: texto('customerName'),
    contact: texto('contact'),
    eventDate: fecha === '' ? null : fecha,
    notes: texto('notes'),
  })

  if (isErr(result)) {
    console.error('pedido rechazado', result.error.kind, result.error.detail)
    if (result.error.kind !== 'invalid_input') return { status: 'error', code: 'failed' }
    return { status: 'error', code: CODIGOS_DE_PEDIDO.has(result.error.detail) ? (result.error.detail as OrderErrorCode) : 'invalid' }
  }

  return { status: 'success', publicRef: result.value.publicRef }
}

export type UploadProofState = { status: 'idle' } | { status: 'success' } | { status: 'error'; code: OrderErrorCode }

const MOTIVO: Record<string, OrderErrorCode> = {
  vacio: 'proofEmpty',
  demasiado_grande: 'proofTooBig',
  tipo_no_admitido: 'proofType',
}

export async function uploadProofAction(_previous: UploadProofState, formData: FormData): Promise<UploadProofState> {
  if (limiteSubida.isLimited(await ipDeLaPeticion(), Date.now())) {
    return { status: 'error', code: 'proofRateLimited' }
  }

  const archivo = formData.get('proof')
  const rawRef = formData.get('publicRef')
  if (!(archivo instanceof File) || typeof rawRef !== 'string') {
    return { status: 'error', code: 'proofMissing' }
  }

  // El tope se comprueba **antes** de leer el fichero a memoria: `arrayBuffer()` de un
  // archivo de dos gigas se los trae enteros al servidor antes de que nadie lo rechace.
  if (archivo.size > MAX_PROOF_BYTES) return { status: 'error', code: 'proofTooBig' }

  const result = await orders.attachProof({
    rawRef,
    bytes: new Uint8Array(await archivo.arrayBuffer()),
    declaredName: archivo.name,
    declaredType: archivo.type,
  })

  if (isErr(result)) {
    console.error('comprobante rechazado', result.error.kind, result.error.detail)
    if (result.error.kind === 'proof_rejected') {
      return { status: 'error', code: MOTIVO[result.error.detail] ?? 'proofRejected' }
    }
    return { status: 'error', code: result.error.kind === 'wrong_status' ? 'proofApproved' : 'proofFailed' }
  }

  revalidatePath(`/panel/pedidos`)
  avisarAlAdmin({
    asunto: `Nuevo comprobante · ${result.value.publicRef}`,
    lineas: [`${result.value.customerName} subió el comprobante del pedido ${result.value.publicRef}. Espera tu revisión.`],
    ruta: '/panel/pedidos?estado=proof_submitted',
  })
  return { status: 'success' }
}

// ============================================================================
// A partir de aquí, **el admin**. No basta con tener sesión.
//
// Un pedido del Plan B compra un plan de Luxury Atelier, y ese dinero va a una sola
// cuenta: decidir sobre él no es de cada atelier. Y desde que aprobar **crea la cuenta
// del cliente y un evento cuyo dueño es quien aprueba**, un permiso flojo aquí dejaría
// que cualquier atelier se adjudicara la boda de otro y diera de alta usuarios.
// ============================================================================

/**
 * El éxito no lleva mensaje, y es a propósito: al aprobar —y al rechazar— el pedido cambia
 * de estado, `OrderDecision` deja de pintarse y cualquier texto se iría con él. Lo que
 * salió de la decisión lo enseña la tarjeta, leyéndolo de la base.
 */
export type DecideOrderState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string }

export async function decideOrderAction(_previous: DecideOrderState, formData: FormData): Promise<DecideOrderState> {
  const actor = await requireAdmin()

  const orderId = formData.get('orderId')
  const decision = formData.get('decision')
  const note = formData.get('note')

  if (typeof orderId !== 'string' || (decision !== 'approved' && decision !== 'rejected')) {
    return { status: 'error', message: 'Faltan datos de la decisión. Vuelve a cargar la página.' }
  }

  const result = await orders.decide({
    orderId,
    decision,
    note: typeof note === 'string' ? note : '',
  })

  if (isErr(result)) {
    console.error('decisión de pedido rechazada', result.error.kind, result.error.detail)
    return {
      status: 'error',
      message:
        result.error.kind === 'invalid_input'
          ? result.error.detail
          : result.error.kind === 'wrong_status'
            ? 'Ese pedido ya no admite esta decisión. Vuelve a cargar la página.'
            : 'No pudimos guardar la decisión. Inténtalo en un momento.',
    }
  }

  if (decision === 'rejected') {
    revalidatePath('/panel/pedidos')
    return { status: 'success' }
  }

  // El detalle va al registro del servidor, que es donde puede leerse entero. La pantalla
  // lo cuenta con lo que quedó en la base: «boda creada» con su enlace, o el aviso de que
  // se aprobó sin crearla.
  const aprovisionado = await aprovisionar(actor, orderId, formData)
  console.info('pedido %s aprobado — %s', orderId, aprovisionado.message)

  revalidatePath('/panel/pedidos')
  revalidatePath('/panel')
  return { status: 'success' }
}

/**
 * El pedido aprobado se convierte en una boda: cuenta del cliente, evento con **su**
 * diseño, plan y acceso.
 *
 * Esto es lo que unía el escaparate con el panel y faltaba: el cliente elegía un modelo,
 * pagaba, y alguien tenía que crear el evento a mano acordándose de qué diseño era.
 *
 * **Vive aquí y no en `decideOrder`** porque orquesta tres módulos —pedidos, identidad y
 * eventos— y el de pedidos no puede importar a los otros dos sin romper las fronteras.
 * La frontera es justo donde se habla con el contenedor.
 *
 * **Nada de esto deshace la aprobación.** El pago ya está cobrado y el estado ya está
 * escrito: si falta la fecha o el correo, se aprueba igual y se dice qué falta, en vez de
 * dejar al atelier con un pedido a medio aprobar.
 */
async function aprovisionar(
  actor: Actor,
  orderId: string,
  formData: FormData,
): Promise<{ message: string; eventSlug: string | null }> {
  const order = await orders.byId(orderId)
  if (order === null) return { message: 'Pedido aprobado. No pudimos releerlo para crear el evento.', eventSlug: null }

  // **Un pedido de extra no crea boda**: sube la capacidad del evento que lo compró, una sola
  // vez aunque se apruebe dos veces.
  if (order.addonSlug !== null) {
    const aplicado = await plans.applyExtra(order.id)
    await admin.record(actor, { action: 'extra.aplicado', subject: order.eventSlug ?? order.publicRef, detail: order.addonName ?? order.addonSlug })
    return { message: aplicado ? `Extra «${order.addonName ?? order.addonSlug}» aplicado.` : 'El extra ya estaba aplicado.', eventSlug: order.eventSlug }
  }

  const correo = campo(formData, 'clientEmail').trim().toLowerCase()
  const clave = campo(formData, 'clientPassword')

  if (order.eventDate === null) {
    return { message: 'Pedido aprobado. Sin fecha de evento no se puede crear el evento: créalo a mano.', eventSlug: null }
  }
  if (correo === '') {
    return { message: 'Pedido aprobado. Escribe el correo del cliente para crearle el evento y su acceso.', eventSlug: null }
  }

  // **El acceso del cliente se comprueba ANTES de crear nada.**
  //
  // Creando primero la boda, una contraseña corta o un correo que ya existe con otro rol
  // dejaban el evento hecho y al cliente fuera — y la bandeja decía «boda creada», que es
  // exactamente la mentira que hace que nadie lo arregle. Si el acceso no va a funcionar,
  // no se crea la boda y se dice por qué.
  const existente = await admin.findUserByEmail(correo)

  if (existente === null) {
    const credencial = createCredential({ email: correo, password: clave })
    if (isErr(credencial)) {
      return { message: `Pedido aprobado, sin crear el evento: ${credencial.error.detail}.`, eventSlug: null }
    }
  } else {
    // Ya tiene cuenta. Si su rol no es `cliente` **no entraría**: el acceso se decide por
    // el rol del usuario, no por la pertenencia, así que prometerle acceso sería mandarle
    // a un 404.
    const suyo = await identity.actorOf(existente.id)
    if (suyo !== null && parseRole(suyo.role) !== 'cliente') {
      return {
        message: `Pedido aprobado, sin crear el evento: ${correo} ya tiene cuenta con rol «${parseRole(suyo.role)}» y no entraría como cliente. Usa otro correo.`,
        eventSlug: null,
      }
    }
  }

  // El diseño elegido se valida contra el registro: `themeFor` cae al clásico con una
  // clave desconocida, y eso daría por bueno un modelo que nadie eligió.
  const tema = order.templateSlug === null ? null : themeFor(order.templateSlug)
  const themeKey = tema !== null && tema.key === order.templateSlug ? tema.key : 'clasico'

  const evento = await events.create({
    userId: actor.userId,
    slug: eventSlugFor(order.publicRef),
    title: order.customerName,
    eventDate: order.eventDate,
    rsvpDeadline: rsvpDeadlineFor(order.eventDate),
    locale: 'es',
    themeKey,
    // Nace en borrador: el atelier escribe el contenido antes de repartir un solo enlace.
    status: 'draft',
    retentionDays: 90,
  })

  if (isErr(evento)) {
    console.error('alta de evento desde pedido rechazada', evento.error.kind, evento.error.detail)
    return {
      message:
        evento.error.kind === 'duplicate_slug'
          ? 'Pedido aprobado. Su evento ya estaba creado.'
          : 'Pedido aprobado, pero no pudimos crear el evento. Créalo a mano desde el panel.',
      eventSlug: null,
    }
  }

  // El pedido recuerda **su** boda. Sin esto, lo único que decía que se había creado era
  // el estado de la pantalla, y ese estado muere al aprobar: el formulario de decisión
  // solo se pinta mientras el pedido está «por revisar», así que se desmonta con el
  // mensaje dentro y el atelier no llega a ver ni el enlace ni el aviso.
  try {
    await orders.linkEvent(orderId, evento.value.id)
  } catch (causa) {
    console.error('no se pudo atar el pedido %s a su boda:', orderId, causa)
  }

  // El contenido de muestra del diseño, como en el alta normal: la invitación se ve
  // terminada desde el primer segundo, que es la mitad de lo que se vende.
  try {
    await events.seedContent(evento.value.id)
  } catch (causa) {
    console.error('no se pudo sembrar el contenido del evento %s:', evento.value.id, causa)
  }

  // El plan que compró. Sin esto el evento cae al más barato, que no trae mesa de regalos
  // ni modo puerta: el cliente pagaría el alto y recibiría el bajo.
  if (order.planSlug !== null) {
    const plan = await admin.setEventPlan(actor, {
      eventId: evento.value.id,
      eventSlug: evento.value.slug,
      planSlug: order.planSlug,
    })
    if (isErr(plan)) console.error('no se pudo asignar el plan del pedido', plan.error.kind, plan.error.detail)
  }

  // La cuenta del cliente. Ya sabemos que se puede crear —se comprobó antes de tocar la
  // base—, y si el correo ya existía **no se toca su contraseña**: cambiarla escribiendo
  // su correo sería una forma de robarle la cuenta.
  let clienteId = existente?.id ?? null
  let avisoDeClave = `${correo} ya tenía cuenta: entra con su contraseña de siempre.`

  if (clienteId === null) {
    const credencial = createCredential({ email: correo, password: clave })
    if (isErr(credencial)) {
      return { message: `Evento creado, sin acceso del cliente: ${credencial.error.detail}.`, eventSlug: evento.value.slug }
    }
    const creado = await admin.createUser({ email: credencial.value.email, password: credencial.value.password, role: 'cliente' })
    clienteId = creado.id
    avisoDeClave = `${correo} entra con la contraseña que escribiste. No se vuelve a mostrar.`
  }

  await events.staff.add(evento.value.id, clienteId, 'cliente')
  // Quién compró, con lo que dejó en el pedido. «WhatsApp o correo»: solo un número es teléfono.
  const telefono = order.contact.includes('@') ? null : normalizarWhatsapp(order.contact)
  await admin.completarContacto(clienteId, { fullName: order.customerName, phone: telefono === '' ? null : telefono })

  // Y se le manda su acceso. Como en el alta desde Configuración: si el correo no sale, el
  // alta sigue siendo válida y la contraseña está en pantalla.
  const avisado = await notifications.sendClientAccess({
    to: correo,
    // Solo si acabamos de crearla: a quien ya tenía cuenta no se le manda una contraseña
    // que no funciona.
    password: existente === null ? clave : null,
    eventTitle: evento.value.title,
  })

  return {
    message: `Evento creado con el diseño «${themeFor(themeKey).label}». ${avisoDeClave}${avisado ? ' Le mandamos su acceso por correo.' : ''}`,
    eventSlug: evento.value.slug,
  }
}
