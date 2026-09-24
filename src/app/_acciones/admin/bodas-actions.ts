'use server'

import { revalidatePath } from 'next/cache'
import { admin, events, identity, notifications, orders } from '@/app/composition/container'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { seAsigna } from '@/shared/design/theme-catalog'
import { createCredential, parseRole } from '@/modules/identity'
import { requireAdmin } from '@/app/_acciones/sesion'
import { ALFABETO_SUFIJO, slugDeBoda } from '@/modules/admin/domain/nueva-boda'
import { isErr } from '@/shared/result'
import type { AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { refrescar, texto } from '@/app/_acciones/admin/admin-comun'
import { normalizarWhatsapp } from '@/shared/whatsapp'

/** Reasignar el dueño de un evento. Es la salida cuando hay que borrar a alguien. */
export async function reassignEventAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdmin()

  const eventId = texto(formData, 'eventId')
  const userId = texto(formData, 'userId')
  if (eventId === '' || userId === '') return { status: 'error', message: 'Faltan datos. Vuelve a cargar la página.' }

  const evento = await events.getByIdFor(actor, eventId, { section: 'ficha' })
  if (isErr(evento)) return { status: 'error', message: 'Ese evento ya no existe. Vuelve a cargar la página.' }

  await events.setOwner(eventId, userId)
  await admin.record(actor, { action: 'evento.reasignado', subject: evento.value.slug, detail: userId })

  refrescar()
  // La ficha del evento también lo enseña: sin revalidarla seguía diciendo el responsable viejo.
  revalidatePath(`/panel/eventos/${evento.value.slug}`, 'layout')
  return { status: 'success', message: 'Responsable cambiado.' }
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
  revalidatePath(`/panel/eventos/${texto(formData, 'eventSlug')}`, 'layout')
  return { status: 'success', message: 'Plan cambiado.' }
}

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
  const nombreCliente = texto(formData, 'clientName').trim().slice(0, 160)
  const telefonoCliente = normalizarWhatsapp(texto(formData, 'clientPhone'))

  if (titulo === '') return { status: 'error', message: 'Escribe el nombre del evento.' }
  if (fecha === '') return { status: 'error', message: 'Escribe la fecha del evento.' }
  if (correo === '') return { status: 'error', message: 'Escribe el correo del cliente.' }
  if (nombreCliente === '') return { status: 'error', message: 'Escribe el nombre del cliente.' }
  if (telefonoCliente === null) return { status: 'error', message: 'Revisa el WhatsApp del cliente.' }

  // El diseño, validado contra el registro: comparar la clave es lo único que impide que
  // entre un modelo que nadie eligió.
  const pedido = texto(formData, 'themeKey')
  const tema = themeFor(pedido)
  if (tema.key !== pedido) return { status: 'error', message: 'Ese modelo no existe.' }
  if (!seAsigna(pedido)) return { status: 'error', message: 'Ese modelo está retirado: elige otro.' }

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
    return { status: 'error', message: `No se pudo crear el evento: ${evento.error.detail}` }
  }

  // --- 2b. Si viene de un pedido aprobado que se quedó sin evento, se enlazan: la bandeja deja
  // de decir «sin evento» e Ingresos lo cuenta con su evento. Solo si sigue sin ninguno.
  const refDelPedido = texto(formData, 'orderRef')
  if (refDelPedido !== '') {
    const leido = await orders.byRef(refDelPedido)
    if (!isErr(leido) && leido.value.order.status === 'approved' && leido.value.order.addonSlug === null && leido.value.order.eventId === null) {
      try {
        await orders.linkEvent(leido.value.order.id, evento.value.id)
      } catch (causa) {
        console.error('no se pudo atar el pedido %s a su evento:', refDelPedido, causa)
      }
    }
  }

  // --- 3. El contenido de muestra del diseño: la invitación se ve terminada desde el
  // primer segundo, que es la mitad de lo que se vende.
  try {
    await events.seedContent(evento.value.id)
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
      return { status: 'error', message: `Evento creado, sin acceso del cliente: ${credencial.error.detail}` }
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
  await admin.completarContacto(clienteId, { fullName: nombreCliente, phone: telefonoCliente === '' ? null : telefonoCliente })

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
    message: `Evento creado con el diseño «${tema.label}».${avisoDePlan} ${avisoDeClave}${avisado ? ' Le mandamos su acceso por correo.' : ''}`,
  }
}
