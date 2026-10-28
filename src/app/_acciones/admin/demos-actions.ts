'use server'

import { revalidarRuta } from '@/shared/cache/revalidar-ruta'
import { redirect } from 'next/navigation'
import { admin, events, guests, plans } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { caducidadDeUnaDemo, esDemo } from '@/modules/events'
import { seAsigna } from '@/shared/design/theme-catalog'
import { tr } from '@/shared/i18n/idioma-servidor'
import { registrarFallo } from '@/shared/observability/fallos'
import { isErr } from '@/shared/result'
import { texto } from './admin-comun'
import { enlaceDeLaDemo } from './enlace-de-demo'

// ============================================================================
// **Las demos de un día** (20 oct): la invitación que el admin arma para enseñarle a un posible cliente
// cómo funciona lo que vendemos, y que le llega por WhatsApp igual que le llegaría a un invitado suyo.
// Vence en 24 horas y el pase de mantenimiento la borra entera.
//
// Como todas las del admin: `requireAdmin()` y nada de `requireEventAccess` —opera sobre un evento que
// no es de nadie—. `verify-tenancy.ts` las exime por eso, por llevar `requireAdmin()` en el cuerpo.
// ============================================================================

export type DemoActionState = { status: 'idle' } | { status: 'success'; message: string } | { status: 'error'; message: string }

/** Cuánto por delante cae la fiesta de muestra: lo justo para que la cuenta atrás tenga algo que contar. */
const DIAS_HASTA_LA_FIESTA = 45

const enIso = (dias: number): string => new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10)

/**
 * El slug: legible para el admin y **irrepetible**, porque la misma demo se arma tres veces en una
 * semana. Sin la cola aleatoria, la segunda chocaría con el índice único y el admin leería
 * «ya existe un evento», que no significa nada en esta pantalla.
 */
const slugDeDemo = (titulo: string): string => {
  const base = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return `demo-${base === '' ? 'invitacion' : base}-${crypto.randomUUID().slice(0, 6)}`
}

export async function crearDemoAction(_previo: DemoActionState, formData: FormData): Promise<DemoActionState> {
  const actor = await requireAdmin()
  const t = await tr()

  const themeKey = texto(formData, 'themeKey')
  const titulo = texto(formData, 'titulo').trim()
  const para = texto(formData, 'para').trim()
  const locale = texto(formData, 'locale') === 'en' ? 'en' : 'es'

  if (!seAsigna(themeKey)) return { status: 'error', message: t('Ese diseño no está a la venta.', 'That design isn’t for sale.') }
  if (titulo === '') return { status: 'error', message: t('Ponle un nombre a la demo: es lo que verá el cliente.', 'Give the demo a name: it’s what the client will see.') }
  if (para === '') return { status: 'error', message: t('Escribe a nombre de quién va la invitación.', 'Write who the invitation is addressed to.') }

  /**
   * **La demo lleva el plan más completo, y no por generosidad: es lo que se está enseñando.**
   *
   * Sin plan, el panel trata al evento como el más barato y cierra mesas, check-in, planner y el resto:
   * el admin abría la demo y se encontraba «tu plan no la incluye» donde quería enseñar lo que vendemos.
   * Una demo no se vende ni se cobra, así que no hay nada que un plan deba limitar aquí.
   *
   * Si la lectura se cae no puede llevarse por delante el alta —`listActivePlans` lanza, no devuelve
   * `Result`—: la demo nace sin plan, que es peor pero no es nada, y queda dicho en el registro.
   */
  const plan = await plans
    .listActive()
    .then((activos) => [...activos].sort((a, b) => (b.priceCents ?? 0) - (a.priceCents ?? 0))[0] ?? null)
    .catch((causa: unknown) => {
      registrarFallo('admin/demos-actions', 'no se pudo leer el plan más completo para la demo', 'storage_failure', causa)
      return null
    })

  // El evento de la demo: vivo desde el primer momento —nadie va a publicarlo— y con fecha de muerte.
  const evento = await events.create({
    slug: slugDeDemo(titulo),
    title: titulo,
    eventDate: enIso(DIAS_HASTA_LA_FIESTA),
    rsvpDeadline: enIso(DIAS_HASTA_LA_FIESTA - 15),
    locale,
    themeKey,
    status: 'live',
    retentionDays: plan?.onlineDays ?? 90,
    currency: 'BOB',
    /**
     * **Sin dueño, a propósito.** `events.user_id` es lo que cuenta «cuántos eventos tiene esta persona»
     * en Equipo y en Clientes: con el admin como dueño, cada demo viva le sumaba un evento que no existe.
     * Un evento sin dueño solo lo ve el admin, que es exactamente lo que una demo es.
     */
    userId: null,
    demoUntil: caducidadDeUnaDemo(new Date()),
  })
  if (isErr(evento)) {
    registrarFallo('admin/demos-actions', 'no se pudo crear la demo', evento.error.kind, evento.error.detail)
    return { status: 'error', message: t('No pudimos crear la demo. Inténtalo en un momento.', 'We couldn’t create the demo. Try again in a moment.') }
  }

  // El plan, ya creada: `events.create` no lo lleva, y sin esta línea el panel la trata como la más
  // barata y cierra media pantalla. Si falla, la demo sigue siendo usable —se ve y se manda—, solo que
  // con menos secciones abiertas: no es motivo para tirar el alta.
  if (plan !== null) {
    const asignado = await admin.setEventPlan(actor, { eventId: evento.value.id, eventSlug: evento.value.slug, planSlug: plan.slug })
    if (isErr(asignado)) registrarFallo('admin/demos-actions', 'no se pudo poner el plan completo a la demo', asignado.error.kind, asignado.error.detail)
  }

  /**
   * La fila de contenido, igual que en un alta normal (`createEventAction`). **No es lo que llena la
   * invitación**: `seedContent` escribe una fila vacía, y lo que el cliente ve es la muestra del propio
   * diseño, que `contenidoParaInvitados` fusiona al leer en todo lo que esté en blanco. La fila existe
   * para que el editor tenga dónde escribir; que falte no deja la demo vacía, solo sin esa fila.
   */
  try {
    await events.seedContent(evento.value.id)
  } catch (causa) {
    registrarFallo('admin/demos-actions', 'no se pudo sembrar el contenido de la demo', 'storage_failure', causa)
  }

  // El invitado al que va dirigida: es lo que hace que el enlace se vea como el de una invitación de
  // verdad, con su nombre dentro.
  const invitado = await guests.addGuest({
    eventId: evento.value.id,
    fullName: para,
    companionNames: [],
    attending: null,
    dietaryNote: null,
    phone: null,
    email: null,
    vip: false,
    allowance: { maxGuestGroups: 50 },
    currentGroups: 0,
  })
  // Los dos caminos de abajo dejan la demo **creada** y a medias: la lista de detrás tiene que enseñarla
  // ya, o el admin lee «bórrala» y no encuentra qué borrar hasta que recargue a mano.
  if (isErr(invitado)) {
    registrarFallo('admin/demos-actions', 'no se pudo crear el invitado de la demo', invitado.error.kind, invitado.error.detail)
    revalidarRuta('/dashboard/admin/demos')
    return { status: 'error', message: t('La demo quedó creada, pero sin invitación. Bórrala en la lista y vuelve a crearla.', 'The demo was created but without an invitation. Delete it from the list and create it again.') }
  }

  const enlace = await enlaceDeLaDemo(evento.value.id)
  if (enlace.estado !== 'listo') {
    revalidarRuta('/dashboard/admin/demos')
    return {
      status: 'error',
      message:
        enlace.estado === 'sin_invitado'
          ? t('La demo quedó creada, pero sin invitación. Bórrala en la lista y vuelve a crearla.', 'The demo was created but without an invitation. Delete it from the list and create it again.')
          : t('La demo quedó creada, pero no pudimos leer su enlace. Recarga la lista: suele estar ahí.', 'The demo was created but we couldn’t read its link. Reload the list: it’s usually there.'),
    }
  }

  revalidarRuta('/dashboard/admin/demos')
  /**
   * **Y directo a escribirla.** Una pantalla intermedia con el enlace dejaba la edición escondida detrás de
   * un segundo botón, y lo primero que se hace con una demo es ponerle los nombres y la música del cliente
   * (20 oct, el usuario la buscó cuatro veces y no la encontró). El enlace no se pierde: está en su fila de
   * Demos, con WhatsApp y correo, cuando ya tenga algo que mandar.
   */
  redirect(`/dashboard/events/${evento.value.slug}/setup?vista=invitacion`)
}


/**
 * Borrar una demo a mano, antes de que venza. **Solo demos**: la misma acción sobre una boda vendida
 * sería un borrado irreversible de algo que alguien pagó, así que se comprueba qué es antes de tocarla.
 */
export async function borrarDemoAction(_previo: DemoActionState, formData: FormData): Promise<DemoActionState> {
  const actor = await requireAdmin()
  const t = await tr()
  const eventId = texto(formData, 'eventId')

  /**
   * **Los tres casos se separan.** Con `isErr` a secas, la base caída se le contaba al admin como «esa
   * demo ya no está»: cerraba la pantalla convencido de haberla borrado y el enlace seguía abriendo para
   * el cliente. Y el doble clic normal —la segunda vez ya no existe— dejaba una fila de fallo del
   * servicio en el registro, que es ruido donde debería haber averías.
   */
  const evento = await events.getByIdFor(actor, eventId, { section: 'ficha' })
  if (isErr(evento)) {
    if (evento.error.kind === 'not_found') return { status: 'error', message: t('Esa demo ya no está. Recarga la lista.', 'That demo is gone. Reload the list.') }
    registrarFallo('admin/demos-actions', 'no se pudo borrar la demo: no se pudo leerla antes', evento.error.kind, evento.error.detail)
    return { status: 'error', message: t('No pudimos borrar la demo: la base no respondió. Sigue abriendo para el cliente; inténtalo en un momento.', 'We couldn’t delete the demo: the database didn’t respond. It still opens for the client; try again in a moment.') }
  }
  if (!esDemo(evento.value)) {
    // Nunca debería pasar desde la pantalla: la lista solo trae demos. Si pasa, es que alguien llamó a la
    // acción con el id de una boda vendida, y eso sí hay que verlo.
    registrarFallo('admin/demos-actions', 'no se pudo borrar: ese evento no es una demo', 'tenancy_failure', eventId)
    return { status: 'error', message: t('Eso no es una demo.', 'That isn’t a demo.') }
  }

  // `remove` exige escribir el nombre del evento, y con razón: borra en cascada y no hay deshacer. Aquí lo
  // pone el servidor porque lo que se borra es una demo —comprobado dos líneas arriba— que de todos modos
  // muere esta noche: hacer teclear un nombre para tirar un borrador de un día es fricción sin seguridad.
  const borrado = await events.remove({ eventId, confirmation: evento.value.title })
  if (isErr(borrado)) {
    registrarFallo('admin/demos-actions', 'no se pudo borrar la demo', borrado.error.kind, borrado.error.detail)
    return { status: 'error', message: t('No pudimos borrar la demo. Inténtalo en un momento.', 'We couldn’t delete the demo. Try again in a moment.') }
  }

  revalidarRuta('/dashboard/admin/demos')
  return { status: 'success', message: t('Demo borrada.', 'Demo deleted.') }
}
