'use server'

import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { events as eventUseCases, guests } from '@/app/composition/container'
import { clientIpFrom } from '@/modules/leads/application/client-ip'
import { createRateLimiter } from '@/modules/leads/application/rate-limit'
import { guardedUnlock } from './application/guarded-unlock'
import { isUnlockValid, unlockValue, UNLOCK_MS } from './domain/unlock-token'
import { requireEventAccess, requireSession } from '@/modules/identity/session-cookie'
import { SECTION_KEYS, type SectionKey } from './domain/invitation-content'
import { themeFor } from './ui/themes/registry'
import { env } from '@/shared/config/env'
import { isErr } from '@/shared/result'
import { shareUrl } from './domain/client-share'
import type { EventErrorKind } from './domain/errors'

export type EventActionState = { status: 'idle' | 'error' | 'success'; message: EventErrorKind | '' }

const readForm = (formData: FormData) => ({
  slug: String(formData.get('slug') ?? ''),
  title: String(formData.get('title') ?? ''),
  eventDate: String(formData.get('eventDate') ?? ''),
  rsvpDeadline: String(formData.get('rsvpDeadline') ?? ''),
  locale: String(formData.get('locale') ?? 'es'),
  themeKey: String(formData.get('themeKey') ?? 'clasico'),
  status: String(formData.get('status') ?? 'draft'),
  retentionDays: Number(formData.get('retentionDays') ?? 90),
  currency: String(formData.get('currency') ?? 'BOB'),
  messageTemplate: String(formData.get('messageTemplate') ?? ''),
  venue: String(formData.get('venue') ?? ''),
})

// Cada acción empieza por requireSession: una Server Action es un extremo HTTP público,
// y que el formulario viva tras el inicio de sesión no la protege.
export async function createEventAction(_previous: EventActionState, formData: FormData): Promise<EventActionState> {
  const actor = await requireSession()

  // El evento nace con dueño. Sin esta línea la multitenencia sería un adorno: cada alta
  // dejaría un evento huérfano que solo vería el admin.
  const result = await eventUseCases.create({ ...readForm(formData), userId: actor.userId })
  if (isErr(result)) {
    console.error('alta de evento rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.kind }
  }

  // El contenido del diseño se **escribe** al crear, no se fusiona al leer.
  //
  // Fusionarlo en cada lectura haría la invitación completa igual de bien, pero el atelier
  // no podría **quitar** una sección: borrar la canción la devolvería en la siguiente
  // apertura, porque la muestra volvería a asomar por debajo. Escribirla una vez la hace
  // suya, y borrarla la borra.
  await sembrarContenido(result.value.id, result.value.themeKey)

  revalidatePath('/panel')
  return { status: 'success', message: '' }
}

/**
 * Escribe el contenido de muestra del diseño en los bloques que estén vacíos.
 *
 * Nunca pisa lo escrito. Falla en silencio a propósito: que el contenido de muestra no se
 * haya podido sembrar no puede impedir crear el evento ni cambiarle el diseño, y la
 * invitación se abre igual —con los huecos que el atelier rellene—.
 */
async function sembrarContenido(eventId: string, themeKey: string): Promise<void> {
  try {
    await eventUseCases.seedContent(eventId, themeFor(themeKey).defaultContent)
  } catch (cause) {
    console.error('No se pudo sembrar el contenido del evento %s:', eventId, cause)
  }
}

export async function updateEventAction(_previous: EventActionState, formData: FormData): Promise<EventActionState> {
  const actor = await requireSession()

  const eventId = String(formData.get('id') ?? '')
  await requireEventAccess(actor, { eventId })

  // Qué diseño tenía antes, para saber si cambió. Se lee antes de guardar, que es la única
  // forma de saberlo.
  const anterior = await eventUseCases.getByIdFor(actor, eventId)
  const temaAnterior = isErr(anterior) ? null : anterior.value.themeKey

  const result = await eventUseCases.update({ ...readForm(formData), id: eventId })
  if (isErr(result)) {
    console.error('edición de evento rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.kind }
  }

  // Al cambiar de diseño se siembra lo que el nuevo trae y el evento no tiene. Nunca pisa
  // lo escrito: probar otro diseño no puede llevarse por delante el itinerario de una boda.
  if (temaAnterior !== null && temaAnterior !== result.value.themeKey) {
    await sembrarContenido(result.value.id, result.value.themeKey)
  }

  revalidatePath('/panel')
  revalidatePath(`/panel/eventos/${result.value.slug}`)
  return { status: 'success', message: '' }
}

export type ClientShareState =
  | { status: 'idle' }
  // Igual que el enlace del invitado: viaja al cliente una sola vez, porque en la base
  // solo queda el hash.
  | { status: 'success'; url: string; expiresAt: string }
  | { status: 'error' }

export async function createClientShareAction(_previous: ClientShareState, formData: FormData): Promise<ClientShareState> {
  const actor = await requireSession()

  const eventSlug = String(formData.get('eventSlug') ?? '')
  const eventId = String(formData.get('eventId') ?? '')
  await requireEventAccess(actor, { eventId, eventSlug })

  const result = await eventUseCases.createShare({ eventId })

  if (isErr(result)) {
    console.error('alta de enlace de cliente rechazada', result.error.kind, result.error.detail)
    return { status: 'error' }
  }

  revalidatePath(`/panel/eventos/${eventSlug}`)
  return {
    status: 'success',
    url: shareUrl(result.value.token, env.SITE_URL),
    expiresAt: result.value.expiresAt.toISOString().slice(0, 10),
  }
}

export type RevokeShareState = { status: 'idle' } | { status: 'success' } | { status: 'error' }

/**
 * Devuelve estado, no `void`. Antes, si la revocación fallaba, el panel volvía a
 * pintarse igual y el enlace del cliente seguía vivo sin que nadie lo supiera.
 */
export async function revokeClientShareAction(
  _previous: RevokeShareState,
  formData: FormData,
): Promise<RevokeShareState> {
  const actor = await requireSession()

  const eventSlug = String(formData.get('eventSlug') ?? '')
  await requireEventAccess(actor, { eventSlug })

  const result = await eventUseCases.revokeShare(String(formData.get('shareId') ?? ''))
  if (isErr(result)) {
    console.error('revocación de enlace rechazada', result.error.kind, result.error.detail)
    return { status: 'error' }
  }

  revalidatePath(`/panel/eventos/${eventSlug}`)
  return { status: 'success' }
}

export type DeleteEventState = { status: 'idle' } | { status: 'error'; message: string }

/**
 * Borra un evento entero, con el identificador escrito a mano como confirmación.
 *
 * Al terminar redirige a la bandeja: quedarse en la página de un evento que ya no existe
 * daría un 404 justo después de una acción destructiva, y parecería que algo falló.
 */
export async function deleteEventAction(
  _previous: DeleteEventState,
  formData: FormData,
): Promise<DeleteEventState> {
  const actor = await requireSession()

  const eventId = String(formData.get('eventId') ?? '')
  await requireEventAccess(actor, { eventId })

  const result = await eventUseCases.remove({
    eventId,
    confirmation: String(formData.get('confirmation') ?? ''),
  })

  if (isErr(result)) {
    console.error('borrado de evento rechazado', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  redirect('/panel')
}

export type UnlockState = { status: 'idle' } | { status: 'error'; message: string }

/**
 * Cinco intentos por minuto y por IP, veinte por minuto y por evento.
 *
 * Un invitado que se equivoca al teclear cabe de sobra; probar contraseñas de seis
 * caracteres a fuerza bruta, no. El límite por evento existe porque un ataque distribuido
 * cambia de IP en cada intento, y cada intento cuesta un argon2 de 19 MiB.
 */
const abrirEvento = guardedUnlock({
  limiter: createRateLimiter({ windowMs: 60_000, max: 5 }),
  eventLimiter: createRateLimiter({ windowMs: 60_000, max: 20 }),
  check: async ({ eventId, password }) => {
    const correcta = await eventUseCases.checkPassword({ eventId, password })
    return !isErr(correcta) && correcta.value
  },
  clock: () => Date.now(),
})

const unlockCookieName = (eventId: string): string => `evento-abierto-${eventId}`

/**
 * Comprueba la contraseña de un evento y, si es la buena, deja una cookie de sesión para
 * ese evento y solo para ese.
 *
 * La cookie guarda el hash del identificador del evento con el secreto del servidor: una
 * cookie fabricada a mano no abre nada. Y el mensaje de error es siempre el mismo, sin
 * distinguir enlace inválido de contraseña incorrecta: distinguirlos confirmaría que el
 * enlace existe.
 */
export async function unlockEventAction(_previous: UnlockState, formData: FormData): Promise<UnlockState> {
  const token = String(formData.get('token') ?? '')
  const password = String(formData.get('password') ?? '')

  const group = await guests.resolveByToken(token)
  if (isErr(group)) return { status: 'error', message: 'No pudimos abrir la invitación con esos datos.' }

  const cabeceras = await headers()
  const ip = clientIpFrom({
    realIp: cabeceras.get('x-real-ip'),
    forwardedFor: cabeceras.get('x-forwarded-for'),
  })

  const intento = await abrirEvento({ ip, eventId: group.value.eventId, password })

  if (intento.status === 'rate_limited') {
    return { status: 'error', message: 'Demasiados intentos. Espera un minuto y vuelve a probar.' }
  }
  if (intento.status === 'invalid') {
    return { status: 'error', message: 'No pudimos abrir la invitación con esos datos.' }
  }

  const hash = await eventUseCases.passwordHashOf(group.value.eventId)
  const jar = await cookies()
  jar.set(
    unlockCookieName(group.value.eventId),
    unlockValue({ eventId: group.value.eventId, passwordHash: hash ?? '', issuedAt: Date.now() }),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.SITE_URL.startsWith('https://'),
      path: '/',
      maxAge: Math.floor(UNLOCK_MS / 1000),
    },
  )

  // Redirige en vez de revalidar: la cookie se escribe en esta misma respuesta, y
  // revalidar el árbol dentro de la propia acción lo vuelve a pintar **antes** de que el
  // navegador tenga la cookie, así que la puerta seguía cerrada tras acertar.
  redirect(`/i/${token}`)
}


/**
 * ¿Este navegador ya escribió la contraseña de este evento?
 *
 * La caducidad la comprueba **el servidor**, con la marca de tiempo que va firmada dentro
 * del valor: el `maxAge` de la cookie lo controla el navegador y quien la copie se lo
 * salta.
 */
export async function eventUnlocked(eventId: string): Promise<boolean> {
  const hash = await eventUseCases.passwordHashOf(eventId)
  // Sin contraseña no hay puerta que abrir: el evento es público con el enlace.
  if (hash === null) return true

  const jar = await cookies()
  const valor = jar.get(unlockCookieName(eventId))?.value
  return valor !== undefined && isUnlockValid({ value: valor, eventId, passwordHash: hash, now: Date.now() })
}

export type PrivacyState = { status: 'idle' } | { status: 'success' } | { status: 'error'; message: string }

/**
 * Pone o quita la contraseña del evento. Elegir «pública» borra el hash, y con él quedan
 * inservibles todos los desbloqueos repartidos, porque la cookie se firma con ese hash.
 */
export async function setEventPrivacyAction(_previous: PrivacyState, formData: FormData): Promise<PrivacyState> {
  const actor = await requireSession()

  const eventId = String(formData.get('eventId') ?? '')
  const eventSlug = String(formData.get('eventSlug') ?? '')
  await requireEventAccess(actor, { eventId, eventSlug })
  const publica = formData.get('privacy') !== 'password'
  const password = String(formData.get('password') ?? '')

  const result = await eventUseCases.setPassword({ eventId, password: publica ? null : password })
  if (isErr(result)) {
    console.error('privacidad rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  revalidatePath(`/panel/eventos/${eventSlug}/configuracion`)
  return { status: 'success' }
}

/**
 * Cambia la moneda del evento desde la cabecera de la mesa de regalos.
 *
 * Los importes ya guardados no se convierten: son centavos, no una cantidad con moneda.
 * Cambiar la moneda **reetiqueta** lo que hay, y quien la cambia tiene que saberlo — el
 * propio selector lo dice.
 */
export async function setEventCurrencyAction(input: {
  eventId: string
  eventSlug: string
  currency: string
}): Promise<{ status: 'success' } | { status: 'error'; message: string }> {
  const actor = await requireSession()
  await requireEventAccess(actor, { eventId: input.eventId, eventSlug: input.eventSlug })

  const row = await eventUseCases.getByIdFor(actor, input.eventId)
  if (isErr(row)) return { status: 'error', message: row.error.detail }

  const result = await eventUseCases.update({ ...row.value, currency: input.currency })
  if (isErr(result)) {
    console.error('cambio de moneda rechazado', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  revalidatePath(`/panel/eventos/${input.eventSlug}/regalos`)
  return { status: 'success' }
}

// ─────────────────────────────────────────────────────────────────────────────
// El contenido de la invitación y sus imágenes
// ─────────────────────────────────────────────────────────────────────────────

export type ContentActionState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string }

/**
 * Guarda un bloque del contenido de la invitación.
 *
 * El bloque es la unidad de edición porque es la unidad de sentido: la pantalla enseña un
 * formulario por bloque, y guardar «la canción» sin tocar «el itinerario» es lo que el
 * atelier espera.
 *
 * El valor llega como JSON en un campo del formulario. No es pereza: el itinerario, la
 * galería y los anfitriones son listas de longitud variable, y componerlas desde campos
 * planos con índices en el nombre es exactamente donde se pierden filas al reordenar.
 * Quien decide qué es válido es el dominio, que lo vuelve a parsear.
 */
export async function saveContentBlockAction(
  _previo: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const actor = await requireSession()
  const eventId = String(formData.get('eventId') ?? '')
  const eventSlug = String(formData.get('eventSlug') ?? '')
  // **`cliente` y no `full`**: los novios y la quinceañera escriben el contenido de su
  // propia invitación —los textos, la canción, el itinerario—, que es para lo que el admin
  // les dio acceso. Lo que sigue cerrado es el evento en sí: el diseño, el `slug`, la
  // contraseña y el borrado. La pertenencia se comprueba igual, así que esto no abre nada
  // de la boda de otro.
  await requireEventAccess(actor, { eventId, eventSlug, section: 'cliente' })

  const section = String(formData.get('section') ?? '')
  if (!(SECTION_KEYS as readonly string[]).includes(section)) {
    return { status: 'error', message: 'unknown_section' }
  }

  let valor: unknown
  try {
    valor = JSON.parse(String(formData.get('value') ?? 'null'))
  } catch {
    return { status: 'error', message: 'invalid_payload' }
  }

  try {
    await eventUseCases.saveContentBlock(eventId, section as SectionKey, valor)
  } catch (cause) {
    console.error('No se pudo guardar el bloque %s del evento %s:', section, eventId, cause)
    return { status: 'error', message: 'storage_failure' }
  }

  revalidatePath(`/panel/eventos/${eventSlug}/configuracion`)
  return { status: 'success' }
}

/**
 * Sube una imagen de la invitación.
 *
 * El tope de tamaño se comprueba **antes** de leer el fichero a memoria, y el tipo lo
 * deciden los primeros bytes: los dos son reglas del dominio, y aquí solo se traduce el
 * resultado a algo que la pantalla pueda pintar.
 */
export async function uploadMediaAction(
  _previo: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const actor = await requireSession()
  const eventId = String(formData.get('eventId') ?? '')
  const eventSlug = String(formData.get('eventSlug') ?? '')
  // `cliente`, como el contenido: el MP3 de su primer baile y sus fotografías las sube
  // quien celebra la boda. El tope de tamaño y la comprobación por bytes son los mismos
  // para todos.
  await requireEventAccess(actor, { eventId, eventSlug, section: 'cliente' })

  const archivo = formData.get('file')
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { status: 'error', message: 'no_file' }
  }

  const esMp3 = archivo.type === 'audio/mpeg' || archivo.name.toLowerCase().endsWith('.mp3')

  const resultado = await eventUseCases.media.save(eventId, {
    name: archivo.name,
    size: archivo.size,
    bytes: async () => new Uint8Array(await archivo.arrayBuffer()),
  })

  if (!resultado.ok) return { status: 'error', message: resultado.error }

  /**
   * **Subir la canción es elegirla.** Antes había que subirla y después buscarla en el
   * bloque «Canción»; ahora que subir una **reemplaza** la anterior, ese segundo paso
   * dejó de ser comodidad y pasó a ser corrección: el contenido seguiría apuntando a la
   * fila que el reemplazo acaba de borrar, y la invitación se quedaría muda señalando un
   * archivo que ya no existe.
   *
   * Se conserva el título y el artista que hubiera escritos: lo que cambia es el archivo,
   * no la canción que dice la invitación.
   *
   * El tipo se mira aquí por el nombre y el `Content-Type` —los dos los escribe quien
   * sube— y eso **basta para esto**: quien decide de verdad qué es el fichero son sus
   * primeros bytes, ya comprobados arriba. Equivocarse aquí solo significa no apuntar el
   * contenido a una foto, que es lo correcto de todos modos.
   */
  if (esMp3) {
    const actual = await eventUseCases.contentFor(eventId, {})
    await eventUseCases.saveContentBlock(eventId, 'music', { ...(actual.music ?? {}), audioMediaId: resultado.id })
  }

  revalidatePath(`/panel/eventos/${eventSlug}/configuracion`)
  return { status: 'success' }
}



// ─────────────────────────────────────────────────────────────────────────────
// Del invitado. **Sin sesión**: se autorizan con el token del enlace, igual que el RSVP y
// que la mesa de regalos. Añadir aquí abajo una acción del atelier la dejaría sin sesión.
// ─────────────────────────────────────────────────────────────────────────────

export type GuestPhotoState = {
  status: 'idle' | 'error' | 'success'
  /** La clase del fallo, que la pantalla traduce. Nunca el detalle, que va al registro. */
  message: 'too_large' | 'unsupported_type' | 'storage_failure' | 'too_many' | 'no_file' | 'not_found' | 'rate_limited' | ''
}

/**
 * Cinco subidas por minuto y por IP.
 *
 * Es un extremo público que escribe en disco. Sin límite, un guion con el enlace en la mano
 * llena el volumen del servidor a ocho megabytes por vez, y el tope por grupo no lo impide
 * —sube, borra, vuelve a subir—: lo que el tope acota es cuánto se **queda**, no cuánto
 * entra. Mismo motivo que el límite de `unlockEventAction`.
 */
const subirFoto = createRateLimiter({ windowMs: 60_000, max: 5 })

/**
 * La fotografía que el invitado sube desde su invitación.
 *
 * La maqueta pinta la tarjeta «Comparte tus fotos» con su botón y no hacía nada: la tarjeta
 * estaba portada y el botón, no, porque no existía dónde dejar la fotografía.
 *
 * Se autoriza por token, como el RSVP, y **respeta el candado de la contraseña**: con el
 * enlace en la mano se podía confirmar por POST en un evento «privado», y esa es la misma
 * lección. Ocultar el formulario no cierra nada; cerrarlo aquí sí.
 */
export async function uploadGuestPhotoAction(_previo: GuestPhotoState, formData: FormData): Promise<GuestPhotoState> {
  const token = String(formData.get('token') ?? '')

  const grupo = await guests.resolveByToken(token)
  // Un token desconocido responde lo mismo que uno revocado: 404 y ni una pista.
  if (isErr(grupo)) return { status: 'error', message: 'not_found' }

  if (!(await eventUnlocked(grupo.value.eventId))) return { status: 'error', message: 'not_found' }

  const cabeceras = await headers()
  const ip = clientIpFrom({
    realIp: cabeceras.get('x-real-ip'),
    forwardedFor: cabeceras.get('x-forwarded-for'),
  })
  if (subirFoto.isLimited(ip, Date.now())) return { status: 'error', message: 'rate_limited' }

  const archivo = formData.get('file')
  if (!(archivo instanceof File) || archivo.size === 0) return { status: 'error', message: 'no_file' }

  const resultado = await eventUseCases.media.saveFromGuest(grupo.value.eventId, grupo.value.id, {
    name: archivo.name,
    size: archivo.size,
    bytes: async () => new Uint8Array(await archivo.arrayBuffer()),
  })

  if (!resultado.ok) return { status: 'error', message: resultado.error }

  revalidatePath(`/i/${token}/fotos`)
  return { status: 'success', message: '' }
}
