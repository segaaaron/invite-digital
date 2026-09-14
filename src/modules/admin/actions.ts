'use server'

import { revalidatePath } from 'next/cache'
import { admin, events, identity, notifications } from '@/app/composition/container'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { createCredential } from '@/modules/identity/domain/credential'
import { parseRole } from '@/modules/identity/domain/access'
import { addEventClientAction } from '@/modules/events/staff-actions'
import { requireAdmin } from '@/modules/identity/session-cookie'
import { ALFABETO_SUFIJO, slugDeBoda } from './domain/nueva-boda'
import { MAX_AUDIO_UPLOAD_BYTES } from '@/shared/audio/audio'
import { parseSiteSettings } from './domain/site-settings'
import { fechaHora } from '@/shared/format/fecha'
import { parseAmount } from '@/modules/registry'
import { isErr } from '@/shared/result'

// ============================================================================
// TODAS las acciones de este fichero empiezan por `await requireAdmin()`, que redirige a
// la puerta sin sesión y devuelve **404** a quien tiene sesión y no es admin. 404 y no
// 403: un 403 confirmaría que la administración existe, y para quien no es admin no
// existe.
//
// Ninguna lleva `requireEventAccess`, y es a propósito: el admin opera **por definición**
// sobre eventos que no son suyos. Están apuntadas como exentas en `verify-tenancy.ts`.
// ============================================================================

export type AdminActionState =
  | { status: 'idle' }
  | { status: 'success'; message?: string }
  /**
   * `valores` es lo que se envió. React 19 **vacía el formulario** al terminar la acción, y
   * sin esto un error de validación devolvía cada campo a lo guardado: el admin perdía
   * los textos que acababa de escribir por un tope mal puesto.
   */
  | { status: 'error'; message: string; valores?: Record<string, string> }

const refrescar = () => {
  revalidatePath('/panel/admin')
  revalidatePath('/panel/admin/usuarios')
  revalidatePath('/panel/admin/eventos')
  revalidatePath('/panel/admin/auditoria')
}

const texto = (formData: FormData, clave: string): string => {
  const valor = formData.get(clave)
  return typeof valor === 'string' ? valor : ''
}

/**
 * Alta de usuario.
 *
 * La contraseña inicial la escribe el admin y **se enseña una sola vez**, como los
 * enlaces de invitado: de ella solo queda su argon2.
 */
export async function createUserAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdmin()

  // Lo enviado vuelve con el error —sin la contraseña—: React vacía el formulario al acabar
  // la acción, y un correo repetido obligaba a escribir otra vez correo, rol y plan.
  const valores = { email: texto(formData, 'email'), role: texto(formData, 'role'), planSlug: texto(formData, 'planSlug') }

  const credencial = createCredential({ email: texto(formData, 'email'), password: texto(formData, 'password') })
  if (isErr(credencial)) return { status: 'error', message: credencial.error.detail, valores }

  if (await admin.findUserByEmail(credencial.value.email)) {
    return { status: 'error', message: `Ya existe un usuario con el correo ${credencial.value.email}.`, valores }
  }

  const role = parseRole(texto(formData, 'role'))
  // El plan que compró. Se valida **antes** de crear la cuenta: un plan inventado no puede
  // dejar un usuario a medias.
  const planSlug = texto(formData, 'planSlug')
  if (planSlug !== '' && !(await admin.planSlugs()).includes(planSlug)) {
    return { status: 'error', message: `No existe el plan ${planSlug}.`, valores }
  }

  const creado = await admin.createUser({ email: credencial.value.email, password: credencial.value.password, role })

  // Son dos escrituras. Si la del plan falla, la cuenta ya existe y no se deshace: se dice,
  // en vez de reventar la pantalla y dejar al admin creyendo que no se creó nada.
  let avisoDePlan = planSlug === '' ? ', sin plan' : ` con el plan ${planSlug}`
  if (planSlug !== '') {
    try {
      await admin.setUserPlan(creado.id, planSlug)
    } catch (causa) {
      console.error('alta de usuario sin plan', causa)
      avisoDePlan = `, pero sin plan: no se pudo asignar ${planSlug}; asígnalo en su fila`
    }
  }

  await admin.record(actor, {
    action: 'usuario.alta',
    subject: credencial.value.email,
    detail: planSlug === '' ? role : `${role} · plan ${planSlug}`,
  })

  refrescar()
  return { status: 'success', message: `Usuario ${credencial.value.email} creado como ${role}${avisoDePlan}.` }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Cambia el plan que compró un usuario. Vacío se lo quita. */
export async function setUserPlanAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const userId = texto(formData, 'userId')
  const planSlug = texto(formData, 'planSlug')
  // Un id que no es UUID lo rechazaría Postgres con un error de sintaxis, y la acción
  // reventaría con la pantalla de error en vez de decir que ese usuario no existe.
  if (!UUID.test(userId)) return { status: 'error', message: 'Ese usuario no existe.' }
  if (planSlug !== '' && !(await admin.planSlugs()).includes(planSlug)) {
    return { status: 'error', message: `No existe el plan ${planSlug}.` }
  }

  let existia: boolean
  try {
    existia = await admin.setUserPlan(userId, planSlug === '' ? null : planSlug)
  } catch (causa) {
    console.error('setUserPlanAction', causa)
    return { status: 'error', message: 'No pudimos guardar el plan. Vuelve a intentarlo en un momento.' }
  }
  // Sin esto, el plan de un usuario ya borrado decía «cambiado» y quedaba en la auditoría.
  if (!existia) return { status: 'error', message: 'Ese usuario ya no existe.' }

  await admin.record(actor, {
    action: 'usuario.plan',
    subject: texto(formData, 'email') || userId,
    detail: planSlug === '' ? 'sin plan' : planSlug,
  })

  refrescar()
  return { status: 'success', message: planSlug === '' ? 'Plan quitado.' : `Plan cambiado a ${planSlug}.` }
}

export async function setUserRoleAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const result = await admin.setRole(actor, { userId: texto(formData, 'userId'), role: parseRole(texto(formData, 'role')) })
  if (isErr(result)) {
    console.error('cambio de rol rechazado', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  refrescar()
  return { status: 'success' }
}

export async function deleteUserAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const result = await admin.deleteUser(actor, texto(formData, 'userId'))
  if (isErr(result)) {
    console.error('borrado de usuario rechazado', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  refrescar()
  return { status: 'success' }
}

/** Reasignar el dueño de un evento. Es la salida cuando hay que borrar a alguien. */
export async function reassignEventAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const eventId = texto(formData, 'eventId')
  const userId = texto(formData, 'userId')
  if (eventId === '' || userId === '') return { status: 'error', message: 'Faltan datos. Vuelve a cargar la página.' }

  const evento = await events.getByIdFor(actor, eventId)
  if (isErr(evento)) return { status: 'error', message: 'Ese evento ya no existe. Vuelve a cargar la página.' }

  await events.setOwner(eventId, userId)
  await admin.record(actor, { action: 'evento.reasignado', subject: evento.value.slug, detail: userId })

  refrescar()
  return { status: 'success' }
}

export async function setEventPlanAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const result = await admin.setEventPlan(actor, {
    eventId: texto(formData, 'eventId'),
    eventSlug: texto(formData, 'eventSlug'),
    planSlug: texto(formData, 'planSlug'),
  })
  if (isErr(result)) {
    console.error('cambio de plan rechazado', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  refrescar()
  return { status: 'success' }
}

/**
 * Borrar el evento de cualquiera.
 *
 * Pide escribir el `slug` como confirmación, igual que la zona de peligro del propio
 * evento: se lleva por delante invitados, mesas, regalos y mensajes, y no se deshace.
 */
export async function deleteEventAsAdminAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const eventId = texto(formData, 'eventId')
  const evento = await events.getByIdFor(actor, eventId)
  if (isErr(evento)) return { status: 'error', message: 'Ese evento ya no existe. Vuelve a cargar la página.' }

  const result = await events.remove({ eventId, confirmation: texto(formData, 'confirmation') })
  if (isErr(result)) {
    console.error('borrado de evento por admin rechazado', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  await admin.record(actor, { action: 'evento.borrado', subject: evento.value.slug, detail: evento.value.title })

  refrescar()
  return { status: 'success' }
}

// ============================================================================
// DATOS DE COBRO DEL PLAN B
//
// El QR de cobro **no lo generamos**: en Bolivia lo emite el sistema financiero y los
// códigos van cifrados y firmados por el banco. Aquí solo se guarda la imagen que el
// administrador exporta de su aplicación bancaria.
// ============================================================================

export async function savePaymentSettingsAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const result = await admin.savePayment(actor, {
    bank: texto(formData, 'bank'),
    accountHolder: texto(formData, 'accountHolder'),
    accountNumber: texto(formData, 'accountNumber'),
    notes: texto(formData, 'notes'),
  })

  if (isErr(result)) {
    console.error('datos de cobro rechazados', result.error.kind, result.error.detail)
    return { status: 'error', message: 'No pudimos guardar los datos. Inténtalo en un momento.' }
  }

  refrescar()
  revalidatePath('/es/pedido', 'layout')
  return { status: 'success', message: 'Datos de cobro guardados.' }
}

const QR_MIMES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_QR_BYTES = 2 * 1024 * 1024

export async function uploadPaymentQrAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const archivo = formData.get('qr')
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { status: 'error', message: 'Elige la imagen del QR.' }
  }
  // El tope se comprueba antes de leer el fichero a memoria, como en los comprobantes.
  if (archivo.size > MAX_QR_BYTES) {
    return { status: 'error', message: 'La imagen pasa de 2 MB. Exporta el QR más pequeño.' }
  }

  const bytes = new Uint8Array(await archivo.arrayBuffer())
  const mime = sniffImage(bytes)
  if (mime === null) {
    return { status: 'error', message: 'Solo aceptamos una imagen PNG, JPG o WEBP.' }
  }

  const result = await admin.savePaymentQr(actor, { bytes, mime })
  if (isErr(result)) {
    console.error('QR de cobro rechazado', result.error.kind, result.error.detail)
    return { status: 'error', message: 'No pudimos guardar la imagen. Inténtalo en un momento.' }
  }

  refrescar()
  revalidatePath('/es/pedido', 'layout')
  return { status: 'success', message: 'QR de cobro actualizado.' }
}

/**
 * El tipo lo deciden los primeros bytes, no la extensión ni el `Content-Type`: los dos los
 * escribe quien sube el fichero. Misma regla que los comprobantes del Plan B.
 */
function sniffImage(bytes: Uint8Array): string | null {
  const empieza = (firma: readonly number[]) => firma.every((b, i) => bytes[i] === b)

  if (empieza([0x89, 0x50, 0x4e, 0x47])) return QR_MIMES[0]!
  if (empieza([0xff, 0xd8, 0xff])) return QR_MIMES[1]!
  if (empieza([0x52, 0x49, 0x46, 0x46]) && bytes.length >= 12) {
    const marca = String.fromCharCode(...bytes.slice(8, 12))
    if (marca === 'WEBP') return QR_MIMES[2]!
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// La música de los modelos del escaparate.
//
// Es la web pública: los dieciséis que cualquiera mira antes de comprar. Lo que suena en
// una invitación de verdad es otra cosa, vive en `event_media` y lo sube el atelier o su
// cliente desde Configuración de esa boda.
// ─────────────────────────────────────────────────────────────────────────────

/** Sube el MP3 de un modelo. */
export async function uploadShowcaseMusicAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const themeKey = texto(formData, 'themeKey')
  const archivo = formData.get('musica')
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { status: 'error', message: 'Elige una canción antes de subirla.' }
  }
  // El tope, antes de leer el fichero a memoria: un `arrayBuffer()` de un archivo enorme
  // se lo trae entero al servidor antes de que nadie lo rechace.
  if (archivo.size > MAX_AUDIO_UPLOAD_BYTES) {
    return { status: 'error', message: 'La canción pasa de 30 MB.' }
  }

  const bytes = new Uint8Array(await archivo.arrayBuffer())
  const result = await admin.saveShowcaseMusic(actor, {
    themeKey,
    bytes,
    nombreArchivo: archivo.name,
    nombre: { track: texto(formData, 'track'), artist: texto(formData, 'artist') },
  })
  if (isErr(result)) {
    console.error('música del escaparate rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  refrescar()
  revalidatePath('/panel/admin/modelos')
  // Sin esto el modelo seguiría mudo hasta que caducara la caché de su página.
  revalidatePath('/modelos', 'layout')
  return { status: 'success', message: 'Ese modelo ya suena en la web.' }
}

/** Cambia el nombre que dice el reproductor de un modelo, sin volver a subir la canción. */
export async function renameShowcaseSongAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const result = await admin.renameShowcaseSong(actor, texto(formData, 'themeKey'), {
    track: texto(formData, 'track'),
    artist: texto(formData, 'artist'),
  })
  if (isErr(result)) {
    if (result.error.kind === 'storage_failure') console.error('nombre de canción', result.error.detail)
    return { status: 'error', message: result.error.kind === 'storage_failure' ? 'No pudimos guardar el nombre.' : result.error.detail }
  }

  revalidatePath('/panel/admin/modelos')
  revalidatePath('/modelos', 'layout')
  return { status: 'success', message: 'Nombre guardado. El reproductor del modelo ya lo dice.' }
}

/** Deja mudo un modelo: vuelve a como nació. */
export async function removeShowcaseMusicAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const result = await admin.removeShowcaseMusic(actor, texto(formData, 'themeKey'))
  if (isErr(result)) {
    console.error('no se pudo quitar la música', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  refrescar()
  revalidatePath('/panel/admin/modelos')
  revalidatePath('/modelos', 'layout')
  return { status: 'success', message: 'Ese modelo se quedó sin música.' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Crear la boda de un cliente: el modelo que eligió, su evento y su acceso, de una vez.
//
// Es el mismo camino que recorre aprobar un pedido, pero **sin pedido**: el cliente llegó
// por WhatsApp, eligió una tarjeta y el admin se la monta. Comparte el orden con
// `aprovisionar` porque comparte las lecciones, y la primera es que el acceso se comprueba
// **antes** de crear nada.
// ─────────────────────────────────────────────────────────────────────────────

/** Cuatro caracteres del alfabeto sin `0`, `O`, `1`, `I` ni `L`: estos slug se dictan. */
function sufijoDeSlug(): string {
  const valores = crypto.getRandomValues(new Uint8Array(4))
  return Array.from(valores, (n) => ALFABETO_SUFIJO[n % ALFABETO_SUFIJO.length]).join('')
}

export type NuevaBodaState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; message: string; eventSlug: string }

/**
 * Crea la boda con el diseño elegido y le da acceso a su cliente.
 *
 * **El orden no es estético, y cada paso está donde está por algo:**
 *
 * 1. **El acceso del cliente se comprueba antes de tocar la base.** Creando primero la
 *    boda, una contraseña corta o un correo que ya existe con otro rol dejaban el evento
 *    hecho y al cliente fuera — y la pantalla decía «creada», que es la mentira que hace
 *    que nadie lo arregle.
 * 2. **El diseño se valida contra el registro.** `themeFor` cae al clásico con una clave
 *    desconocida: sin comparar, se colaría un modelo que nadie eligió.
 * 3. **El `slug` lleva sufijo.** Dos bodas «Familia García» chocarían, y chocarían después
 *    de haber comprobado el acceso.
 * 4. **La boda nace en borrador**, para escribir el contenido antes de repartir un enlace.
 * 5. **Nada de lo que viene después deshace lo anterior.** Si el correo no sale, el alta
 *    sigue siendo válida y la contraseña está en pantalla.
 */
export async function createWeddingForClientAction(
  _previous: NuevaBodaState,
  formData: FormData,
): Promise<NuevaBodaState> {
  const actor = await requireAdmin()

  const titulo = texto(formData, 'title').trim()
  const fecha = texto(formData, 'eventDate')
  const planSlug = texto(formData, 'planSlug')
  const correo = texto(formData, 'clientEmail').trim().toLowerCase()
  const clave = texto(formData, 'clientPassword')

  if (titulo === '') return { status: 'error', message: 'Escribe el nombre de la boda.' }
  if (fecha === '') return { status: 'error', message: 'Escribe la fecha del evento.' }
  if (correo === '') return { status: 'error', message: 'Escribe el correo del cliente.' }

  // El diseño, validado contra el registro: comparar la clave es lo único que impide que
  // entre un modelo que nadie eligió.
  const pedido = texto(formData, 'themeKey')
  const tema = themeFor(pedido)
  if (tema.key !== pedido) return { status: 'error', message: 'Ese modelo no existe.' }

  // --- 1. El acceso, antes de crear nada.
  const existente = await admin.findUserByEmail(correo)

  if (existente === null) {
    const credencial = createCredential({ email: correo, password: clave })
    if (isErr(credencial)) return { status: 'error', message: credencial.error.detail }
  } else {
    // Ya tiene cuenta. Si su rol no es `cliente` **no entraría**: el acceso lo decide el
    // rol, no la pertenencia, así que prometerle acceso sería mandarle a un 404.
    const suyo = await identity.actorOf(existente.id)
    if (suyo !== null && parseRole(suyo.role) !== 'cliente') {
      return {
        status: 'error',
        message: `${correo} ya tiene cuenta con rol «${parseRole(suyo.role)}» y no entraría como cliente. Usa otro correo.`,
      }
    }
  }

  // --- 2. La boda.
  const evento = await events.create({
    // El dueño es el atelier, nunca el cliente: pasarle la propiedad dejaría fuera a quien
    // hace el trabajo. El cliente entra por pertenencia.
    userId: actor.userId,
    slug: slugDeBoda(titulo, sufijoDeSlug()),
    title: titulo,
    eventDate: fecha,
    rsvpDeadline: fecha,
    locale: 'es',
    themeKey: tema.key,
    status: 'draft',
    retentionDays: 90,
  })

  if (isErr(evento)) {
    console.error('alta de boda desde administración rechazada', evento.error.kind, evento.error.detail)
    return { status: 'error', message: `No se pudo crear la boda: ${evento.error.detail}` }
  }

  // --- 3. El contenido de muestra del diseño: la invitación se ve terminada desde el
  // primer segundo, que es la mitad de lo que se vende.
  try {
    await events.seedContent(evento.value.id, tema.defaultContent)
  } catch (causa) {
    console.error('no se pudo sembrar el contenido del evento %s:', evento.value.id, causa)
  }

  // --- 4. El plan. Sin esto cae al más barato, que no trae mesa de regalos ni modo puerta.
  //
  // Si falla **se dice en pantalla**, no solo en el registro: la boda ya existe y no se
  // deshace, pero el admin creería que la vendió con el plan elegido y el cliente entraría
  // sin mesa de regalos ni modo puerta.
  let avisoDePlan = ''
  if (planSlug !== '') {
    const plan = await admin.setEventPlan(actor, {
      eventId: evento.value.id,
      eventSlug: evento.value.slug,
      planSlug,
    })
    if (isErr(plan)) {
      console.error('no se pudo asignar el plan', plan.error.kind, plan.error.detail)
      avisoDePlan = ` Ojo: no se pudo asignar el plan «${planSlug}» y quedó con el más barato; cámbialo en su fila, en «Gestionar».`
    }
  }

  // --- 5. La cuenta del cliente. Si ya existía **no se toca su contraseña**: cambiarla
  // escribiendo su correo sería una forma de robarle la cuenta.
  let clienteId = existente?.id ?? null
  let avisoDeClave = `${correo} ya tenía cuenta: entra con su contraseña de siempre.`

  if (clienteId === null) {
    const credencial = createCredential({ email: correo, password: clave })
    if (isErr(credencial)) {
      return { status: 'error', message: `Boda creada, sin acceso del cliente: ${credencial.error.detail}` }
    }
    const creado = await admin.createUser({
      email: credencial.value.email,
      password: credencial.value.password,
      role: 'cliente',
    })
    clienteId = creado.id
    avisoDeClave = `${correo} entra con la contraseña que escribiste. No se vuelve a mostrar: cópiala antes de salir.`
  }

  await events.staff.add(evento.value.id, clienteId, 'cliente')

  // --- 6. Su acceso por correo. Nunca falla hacia arriba: el alta ya está hecha.
  const avisado = await notifications.sendClientAccess({
    to: correo,
    // Solo si acabamos de crearla: a quien ya tenía cuenta no se le manda una contraseña
    // que no funciona.
    password: existente === null ? clave : null,
    eventTitle: evento.value.title,
  })

  // Dos argumentos: el contenedor compone el actor. La forma de un solo objeto es la del
  // repositorio, y vive dentro de los casos de uso, no aquí.
  await admin.record(actor, { action: 'boda.alta', subject: evento.value.slug, detail: `${tema.label} · ${correo}` })

  refrescar()
  return {
    status: 'success',
    eventSlug: evento.value.slug,
    message: `Boda creada con el diseño «${tema.label}».${avisoDePlan} ${avisoDeClave}${avisado ? ' Le mandamos su acceso por correo.' : ''}`,
  }
}

/**
 * Dar acceso al cliente de una boda **que ya existe**.
 *
 * Es la otra mitad del alta de un paso: aquella crea boda y cliente de una vez; esta cubre
 * la boda creada antes de saber el correo, o la segunda persona de la pareja.
 *
 * **Delega en la acción del módulo de eventos, no la reescribe.** Una copia sería un
 * segundo sitio donde olvidarse de que un alta sobre un correo que ya existe **no toca su
 * cuenta** — cambiar la contraseña de alguien escribiendo su correo sería una forma de
 * robársela.
 *
 * Y se importa por su ruta concreta, **no por el índice del módulo**: exponerla allí hizo
 * que todo el que importa `@/modules/events` arrastrara el contenedor entero, y `rsvp`
 * —que solo quería el tipo `Event`— murió con una dependencia circular. Aquí no añade
 * nada: este fichero ya carga el contenedor.
 *
 * Sin `requireAdmin()` propio a propósito: la guardia vive dentro, y es `canManageStaff`,
 * que comprueba el rol **antes** de tocar la base. Duplicarla aquí sería tener dos sitios
 * donde relajarla.
 */
export async function grantClientAccessAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  // La guardia va **en este cuerpo** aunque la acción de dentro también compruebe el rol.
  // `verify:tenancy` lo exige por un motivo que ya costó una vez: delegarla en un ayudante
  // la esconde del verificador, y entonces nadie ve que falta el día que alguien la quita.
  await requireAdmin()

  const resultado = await addEventClientAction({ status: 'idle' }, formData)
  refrescar()
  return resultado
}

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo: planes y publicación de modelos. La web pública es `force-dynamic`, así que
// lo guardado se ve en la siguiente visita sin revalidar nada fuera del panel.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Guarda un plan. El importe se parsea **aquí**, con `parseAmount` de la mesa de regalos:
 * el dominio no puede importar otro módulo y el dinero se convierte en un solo sitio.
 */
export async function savePlanAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const slug = texto(formData, 'slug')
  const valores = Object.fromEntries([...formData.entries()].filter((par): par is [string, string] => typeof par[1] === 'string'))
  const precio = parseAmount(texto(formData, 'price'))
  if (isErr(precio)) return { status: 'error', message: precio.error.detail, valores }

  const marcado = (clave: string) => formData.get(clave) === 'on'
  const textoDe = (locale: 'es' | 'en') => ({
    name: texto(formData, `${locale}.name`),
    tagline: texto(formData, `${locale}.tagline`),
    description: texto(formData, `${locale}.description`),
    features: texto(formData, `${locale}.features`),
  })

  const guardado = await admin.savePlan(actor, slug, {
    priceCents: precio.value,
    maxGuestGroups: texto(formData, 'maxGuestGroups'),
    includesSeating: marcado('includesSeating'),
    includesRegistry: marcado('includesRegistry'),
    includesCheckin: marcado('includesCheckin'),
    highlighted: marcado('highlighted'),
    isActive: marcado('isActive'),
    es: textoDe('es'),
    en: textoDe('en'),
  })
  if (isErr(guardado)) {
    if (guardado.error.kind === 'storage_failure') {
      console.error('savePlanAction', guardado.error.detail)
      return { status: 'error', message: 'No pudimos guardar el plan. Vuelve a intentarlo en un momento.', valores }
    }
    return { status: 'error', message: guardado.error.detail, valores }
  }

  revalidatePath('/panel/admin/planes')
  refrescar()
  return { status: 'success', message: 'Plan guardado. La web ya enseña los cambios.' }
}

/** Publica o retira un modelo del escaparate. Retirar no borra: los enlaces siguen vivos. */
export async function setTemplatePublishedAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const publicar = texto(formData, 'publicar') === 'si'
  const hecho = await admin.setPublished(actor, texto(formData, 'themeKey'), publicar)
  if (isErr(hecho)) {
    if (hecho.error.kind === 'storage_failure') console.error('setTemplatePublishedAction', hecho.error.detail)
    return { status: 'error', message: hecho.error.kind === 'storage_failure' ? 'No pudimos cambiarlo. Vuelve a intentarlo.' : hecho.error.detail }
  }

  revalidatePath('/panel/admin/modelos')
  return { status: 'success', message: publicar ? 'Publicado en la web.' : 'Retirado de la web.' }
}

// ─────────────────────────────────────────────────────────────────────────────
// «La web»: datos del negocio, pruebas sociales, legal y SEO. El formulario viaja como un
// solo JSON: son controles controlados con vista previa en vivo, y así React no vacía nada
// al terminar la acción. Lo que llega se valida entero en el dominio.
// ─────────────────────────────────────────────────────────────────────────────

export type SiteActionState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string; campo?: string; conflicto?: true }

/** La versión sobre la que se editó; vacía es «todavía no había ninguna». */
const baseDe = (formData: FormData): string | null => texto(formData, 'base') || null

/**
 * Otro admin guardó entre medias: no se escribió nada. Se dice quién y cuándo, y **no se
 * revalida**, para que lo escrito siga en el formulario hasta que se decida recargar.
 */
const conflicto = (e: { por: string; en: Date }): SiteActionState => ({
  status: 'error',
  message: `${e.por} guardó La web el ${fechaHora(e.en)}, mientras editabas. No se guardó nada tuyo: recarga para ver sus cambios y vuelve a aplicar los tuyos.`,
  conflicto: true,
})

export async function saveSiteSettingsAction(_previous: SiteActionState, formData: FormData): Promise<SiteActionState> {
  const actor = await requireAdmin()

  let datos: unknown
  try {
    datos = JSON.parse(texto(formData, 'datos'))
  } catch {
    return { status: 'error', message: 'No pudimos leer el formulario. Recarga la página.' }
  }
  // Se pasa por el lector tolerante antes de validar: lo que no tenga la forma esperada cae
  // a su valor por defecto en vez de reventar la validación.
  const guardado = await admin.saveSite(actor, parseSiteSettings(JSON.stringify(datos)), baseDe(formData))
  if (isErr(guardado)) {
    if (guardado.error.kind === 'conflict') return conflicto(guardado.error)
    if (guardado.error.kind === 'invalid_field') return { status: 'error', message: guardado.error.detail, campo: guardado.error.campo }
    console.error('saveSiteSettingsAction', guardado.error.detail)
    return { status: 'error', message: 'No pudimos guardar. Vuelve a intentarlo en un momento.' }
  }

  revalidatePath('/panel/admin/web')
  revalidatePath('/', 'layout')
  return { status: 'success', message: 'Guardado. La web ya enseña los cambios.' }
}

export async function restoreSiteVersionAction(_previous: SiteActionState, formData: FormData): Promise<SiteActionState> {
  const actor = await requireAdmin()

  const restaurado = await admin.restoreSite(actor, texto(formData, 'versionId'), baseDe(formData))
  if (isErr(restaurado)) {
    if (restaurado.error.kind === 'conflict') return conflicto(restaurado.error)
    if (restaurado.error.kind === 'storage_failure') console.error('restoreSiteVersionAction', restaurado.error.detail)
    return { status: 'error', message: restaurado.error.kind === 'storage_failure' ? 'No pudimos restaurar. Vuelve a intentarlo.' : restaurado.error.detail }
  }

  revalidatePath('/panel/admin/web')
  revalidatePath('/', 'layout')
  return { status: 'success', message: 'Versión restaurada. La web ya la enseña.' }
}
