'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { admin, events, identity, leads, notifications, orders, plans } from '@/app/composition/container'
import { redirect } from 'next/navigation'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { seAsigna } from '@/shared/design/theme-catalog'
import { createCredential, parseRole } from '@/modules/identity'
import { requireAdmin } from '@/app/_acciones/sesion'
import { ALFABETO_SUFIJO, slugDeBoda } from '@/modules/admin/domain/nueva-boda'
import { isErr } from '@/shared/result'
import type { AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { refrescar, texto } from '@/app/_acciones/admin/admin-comun'
import { normalizarWhatsapp } from '@/shared/whatsapp'
import { fiestaDeCategoria } from '@/modules/events'
import { rsvpDeadlineFor } from '@/modules/orders/domain/provisioning'
import { fechaEnBolivia } from '@/modules/admin/domain/hoy'

/** Días antes del evento en que cierran las confirmaciones, por fiesta: el catering necesita la lista. */
const CIERRE_POR_FIESTA = { boda: 21, xv: 14, cumple: 10 } as const

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
  // **Un solo alta** para los dos casos: con el acceso del cliente, o un evento que lleva el
  // atelier sin darle acceso a nadie (antes era otra pantalla, `/panel/eventos/nuevo`).
  const sinAcceso = texto(formData, 'sinAcceso') === 'on'
  const correo = texto(formData, 'clientEmail').trim().toLowerCase()
  // La contraseña provisional **se genera**: nadie la inventa ni la escribe. Le llega por correo
  // y la cambia al entrar; si el correo no sale, se enseña aquí una vez.
  const clave = randomBytes(12).toString('base64url')
  const nombreCliente = texto(formData, 'clientName').trim().slice(0, 160)
  const telefonoCliente = normalizarWhatsapp(texto(formData, 'clientPhone'))

  if (titulo === '') return { status: 'error', message: 'Escribe el nombre del evento.' }
  if (fecha === '') return { status: 'error', message: 'Escribe la fecha del evento.' }
  if (!sinAcceso && correo === '') return { status: 'error', message: 'Escribe el correo del cliente, o crea el evento sin acceso.' }
  if (!sinAcceso && nombreCliente === '') return { status: 'error', message: 'Escribe el nombre del cliente.' }
  if (telefonoCliente === null) return { status: 'error', message: 'Revisa el WhatsApp del cliente.' }

  // El diseño, validado contra el registro: comparar la clave es lo único que impide que
  // entre un modelo que nadie eligió.
  const pedido = texto(formData, 'themeKey')
  const tema = themeFor(pedido)
  if (tema.key !== pedido) return { status: 'error', message: 'Ese modelo no existe.' }
  if (!seAsigna(pedido)) return { status: 'error', message: 'Ese modelo está retirado: elige otro.' }

  // --- 1. El acceso, antes de crear nada.
  const existente = sinAcceso ? null : await admin.findUserByEmail(correo)

  if (sinAcceso) {
    // Nada que comprobar: nadie va a entrar.
  } else if (existente === null) {
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
    // El cierre con el plazo de un planner —tres semanas antes de una boda, dos de unos XV—, y
    // nunca antes de hoy: un evento dado de alta con poco margen cierra el mismo día que nace.
    rsvpDeadline: (() => {
      const cierre = rsvpDeadlineFor(fecha, CIERRE_POR_FIESTA[fiestaDeCategoria(tema.categorySlug)])
      const hoy = fechaEnBolivia(new Date())
      return cierre < hoy ? (fecha < hoy ? fecha : hoy) : cierre
    })(),
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
        if (leido.value.order.quoteExtras.length > 0) await plans.applyQuoteExtras(leido.value.order.id)
        if (leido.value.order.consultationId !== null) await leads.win(leido.value.order.consultationId, evento.value.id)
      } catch (causa) {
        console.error('no se pudo atar el pedido %s a su evento:', refDelPedido, causa)
      }
    }
  }

  // Una consulta que se cerró fuera del sistema (sin pedido): al crear su evento queda ganada.
  const consultaId = texto(formData, 'consultaId')
  if (consultaId !== '') await leads.win(consultaId, evento.value.id)

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

  if (sinAcceso) {
    await admin.record(actor, { action: 'boda.alta', subject: evento.value.slug, detail: `${tema.label} · sin acceso de cliente` })
    refrescar()
    return { status: 'success', eventSlug: evento.value.slug, message: `Evento creado con el diseño «${tema.label}», sin acceso de cliente: lo llevas tú.${avisoDePlan}` }
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
    avisoDeClave = `${correo} recibe su contraseña provisional por correo y la cambia al entrar.`
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
    // Si el correo no salió, la contraseña provisional se enseña aquí **una vez**, para pasársela
    // por WhatsApp: sin ella el cliente se quedaría fuera.
    message:
      existente === null && !avisado
        ? `Evento creado con el diseño «${tema.label}».${avisoDePlan} El correo no salió: pásale a ${correo} esta contraseña provisional, que no se vuelve a mostrar: ${clave}`
        : `Evento creado con el diseño «${tema.label}».${avisoDePlan} ${avisoDeClave}${avisado ? ' Le mandamos su acceso por correo.' : ''}`,
  }
}

/**
 * **Duplicar un evento**: el mismo diseño, plan, idioma, fecha y responsable, con la invitación
 * en blanco y sin invitados. Para la boda civil y la religiosa de la misma pareja, o la misma
 * familia que vuelve. Nace en borrador y lleva a su ficha.
 */
export async function duplicarEventoAction(_previo: { status: 'idle' | 'error'; message?: string }, formData: FormData): Promise<{ status: 'idle' | 'error'; message?: string }> {
  const actor = await requireAdmin()
  const origen = await events.getByIdFor(actor, texto(formData, 'eventId'), { section: 'ficha' })
  if (isErr(origen)) return { status: 'error', message: 'Ese evento ya no existe.' }
  const o = origen.value
  const copia = await events.create({
    userId: o.userId ?? actor.userId,
    slug: slugDeBoda(`${o.title} copia`, sufijoDeSlug()),
    title: `${o.title} (copia)`.slice(0, 160),
    eventDate: o.eventDate,
    rsvpDeadline: o.rsvpDeadline,
    locale: o.locale,
    themeKey: o.themeKey,
    status: 'draft',
    retentionDays: o.retentionDays,
  })
  if (isErr(copia)) {
    console.error('duplicarEventoAction', copia.error.kind, copia.error.detail)
    return { status: 'error', message: 'No pudimos duplicarlo. Vuelve a intentarlo en un momento.' }
  }
  try {
    await events.seedContent(copia.value.id)
  } catch (causa) {
    console.error('no se pudo sembrar el contenido de la copia %s:', copia.value.id, causa)
  }
  const capacidad = await plans.allowanceFor(o.id)
  if (!isErr(capacidad)) {
    const plan = await admin.setEventPlan(actor, { eventId: copia.value.id, eventSlug: copia.value.slug, planSlug: capacidad.value.planSlug })
    if (isErr(plan)) console.error('no se pudo copiar el plan', plan.error.detail)
  }
  await admin.record(actor, { action: 'evento.duplicado', subject: copia.value.slug, detail: `Copia de ${o.slug}` })
  refrescar()
  redirect(`/panel/eventos/${copia.value.slug}/configuracion`)
}
