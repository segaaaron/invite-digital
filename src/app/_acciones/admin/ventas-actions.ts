'use server'

import { revalidatePath } from 'next/cache'
import { admin, leads, orders, plans } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { etiquetaDeMotivo, parseMotivo } from '@/modules/leads/domain/pipeline'
import { rellenar } from '@/modules/admin/domain/mensajes'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { env } from '@/shared/config/env'
import { BRAND } from '@/shared/config/brand'
import { campo } from '@/shared/forms/campo'
import { formatAmount, parseAmount } from '@/shared/money'
import { diaDelEvento } from '@/shared/format/fecha'
import { isErr } from '@/shared/result'
import { enlaceWhatsapp } from '@/shared/whatsapp'

// ============================================================================
// Las acciones de **una venta** (Ventas › panel lateral). Todas del admin: empiezan por
// `await requireAdmin()`, que responde 404 a quien no lo es. Ninguna toca un evento ajeno:
// una venta es una consulta o un pedido, que no son de ningún evento todavía.
// ============================================================================

export type VentaActionState = { status: 'idle' } | { status: 'success'; message: string } | { status: 'error'; message: string }

/** Cambia algo que se ve en Hoy, Ventas, Clientes e Ingresos: las cuatro a la vez. */
function revalidarVentas() {
  for (const ruta of ['/panel/admin', '/panel/admin/ventas', '/panel/admin/clientes', '/panel/admin/ingresos']) revalidatePath(ruta)
}

/** La página del pedido del cliente: datos de cobro, el monto exacto y su comprobante. */
const enlaceDelPedido = (ref: string) => `${env.SITE_URL.replace(/\/$/, '')}/es/pedido/ref/${ref}`

/**
 * «Contactar»: el WhatsApp o el correo ya lo abrió el navegador en el clic; aquí se deja
 * constancia —la consulta pasa a contactada y queda su primera respuesta—. Si ya no estaba
 * nueva, no hay nada que mover y no es un error.
 */
export async function contactarVentaAction(formData: FormData): Promise<void> {
  const actor = await requireAdmin()
  const id = campo(formData, 'consultaId')
  const movida = await leads.move({ id, to: 'contacted', note: '', eventId: '' })
  if (isErr(movida)) {
    if (movida.error.kind === 'storage_failure') console.error('contactarVentaAction', movida.error.detail)
    return
  }
  await admin.record(actor, { action: 'consulta.estado', subject: movida.value.name, detail: 'Nueva → Contactada' })
  revalidarVentas()
}

export type CotizacionState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; ref: string; enlace: string; whatsapp: string | null; mensaje: string }

/**
 * **La cotización**: arma el pedido con el plan, el diseño, los extras y el precio final, y
 * devuelve el enlace y el WhatsApp con el mensaje de la plantilla. Si salió de una consulta
 * nueva, la consulta pasa a contactada: cotizar es contestar.
 */
export async function cotizarAction(_previo: CotizacionState, formData: FormData): Promise<CotizacionState> {
  const actor = await requireAdmin()

  const planes = await admin.planOptions()
  const planSlug = campo(formData, 'plan')
  const plan = planes.find((p) => p.slug === planSlug)
  if (plan === undefined) return { status: 'error', message: 'Elige un plan de la lista.' }

  const extrasALaVenta = await plans.listActiveExtras()
  const elegidos = formData.getAll('extras').filter((x): x is string => typeof x === 'string')
  const extras = extrasALaVenta.filter((x) => elegidos.includes(x.slug)).map((x) => ({ slug: x.slug, name: x.name, cents: x.priceCents }))

  const leido = parseAmount(campo(formData, 'precio'))
  if (isErr(leido)) return { status: 'error', message: 'Escribe el precio final en bolivianos, por ejemplo 1190.' }
  const precio = leido.value

  // El diseño se valida contra el registro: `themeFor` cae al clásico con una clave desconocida.
  const modelo = campo(formData, 'modelo')
  const templateSlug = modelo !== '' && themeFor(modelo).key === modelo ? modelo : null
  const consultaId = campo(formData, 'consultaId')
  const fecha = campo(formData, 'fecha')

  const creada = await orders.quote({
    planSlug,
    templateSlug,
    customerName: campo(formData, 'nombre'),
    contact: campo(formData, 'contacto'),
    eventDate: /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null,
    notes: campo(formData, 'nota'),
    consultationId: consultaId === '' ? null : consultaId,
    listaCents: plan.priceCents,
    finalCents: precio,
    extras,
  })
  if (isErr(creada)) {
    if (creada.error.kind === 'storage_failure') {
      console.error('cotizarAction', creada.error.detail)
      return { status: 'error', message: 'No pudimos guardar la cotización. Vuelve a intentarlo en un momento.' }
    }
    return { status: 'error', message: creada.error.detail }
  }

  const q = creada.value
  // Cotizar es contestar: la consulta nueva pasa a contactada. Si ya lo estaba, no pasa nada.
  if (q.consultationId !== null) await leads.move({ id: q.consultationId, to: 'contacted', note: '', eventId: '' })

  await admin.record(actor, { action: 'pedido.cotizado', subject: q.customerName, detail: `${q.publicRef} · ${formatAmount(precio, 'BOB')}` })

  const plantillas = await admin.mensajes()
  const enlace = enlaceDelPedido(q.publicRef)
  const mensaje = rellenar(isErr(plantillas) ? '' : plantillas.value.mensajes.cotizacion, {
    nombre: q.customerName.split(' ')[0] ?? q.customerName,
    plan: plan.nombre,
    importe: formatAmount(precio, 'BOB'),
    enlace,
    fecha: q.eventDate === null ? null : diaDelEvento(q.eventDate),
    marca: BRAND.siteName,
  })

  revalidarVentas()
  return { status: 'success', ref: q.publicRef, enlace, whatsapp: q.contact.includes('@') ? null : enlaceWhatsapp(q.contact, mensaje), mensaje }
}

/** Deja constancia de que se recordó el pago: el WhatsApp lo abrió el navegador en el clic. */
export async function recordarPagoAction(formData: FormData): Promise<void> {
  const actor = await requireAdmin()
  const recordado = await orders.remind(campo(formData, 'orderId'))
  if (isErr(recordado)) {
    if (recordado.error.kind === 'storage_failure') console.error('recordarPagoAction', recordado.error.detail)
    return
  }
  await admin.record(actor, { action: 'pedido.recordado', subject: recordado.value.customerName, detail: recordado.value.publicRef })
  revalidarVentas()
}

/** El saldo de un pedido con anticipo, recibido: queda cobrado entero. */
export async function registrarSaldoAction(_previo: VentaActionState, formData: FormData): Promise<VentaActionState> {
  const actor = await requireAdmin()
  const orderId = campo(formData, 'orderId')
  const hecho = await orders.registerBalance(orderId)
  if (isErr(hecho)) {
    if (hecho.error.kind === 'storage_failure') console.error('registrarSaldoAction', hecho.error.detail)
    return { status: 'error', message: hecho.error.kind === 'wrong_status' ? 'Este pedido ya no tiene saldo pendiente.' : 'No pudimos registrarlo. Vuelve a intentarlo.' }
  }
  await admin.record(actor, { action: 'pedido.saldo', subject: campo(formData, 'nombre'), detail: campo(formData, 'ref') })
  revalidarVentas()
  return { status: 'success', message: 'Saldo registrado: la venta queda cobrada entera.' }
}

/**
 * **Perder la venta**, sea consulta o pedido sin cobrar: el motivo de la lista y la nota. Con
 * pedido, se cancela; sin él, la consulta pasa a perdida. Una sola salida para las dos.
 */
export async function perderVentaAction(_previo: VentaActionState, formData: FormData): Promise<VentaActionState> {
  const actor = await requireAdmin()
  const motivo = parseMotivo(campo(formData, 'motivo'))
  const nota = campo(formData, 'nota').trim()
  if (motivo === null) return { status: 'error', message: 'Elige por qué se pierde.' }
  if (motivo === 'otro' && nota === '') return { status: 'error', message: 'Cuenta en la nota cuál fue el motivo.' }

  const orderId = campo(formData, 'orderId')
  const consultaId = campo(formData, 'consultaId')

  if (orderId !== '') {
    const cancelado = await orders.cancel({ orderId, reason: [etiquetaDeMotivo(motivo), nota].filter(Boolean).join(' · ') })
    if (isErr(cancelado)) {
      if (cancelado.error.kind === 'storage_failure') console.error('perderVentaAction', cancelado.error.detail)
      return { status: 'error', message: cancelado.error.kind === 'wrong_status' ? 'Este pedido ya está cobrado o cancelado.' : 'No pudimos guardarlo. Vuelve a intentarlo.' }
    }
    await admin.record(actor, { action: 'pedido.cancelado', subject: cancelado.value.customerName, detail: etiquetaDeMotivo(motivo) ?? motivo })
  }

  if (consultaId !== '') {
    const movida = await leads.move({ id: consultaId, to: 'lost', note: nota, eventId: '', reason: motivo })
    // Con pedido, la consulta es secundaria: si ya no se podía mover, la venta ya quedó perdida.
    if (isErr(movida) && orderId === '') {
      if (movida.error.kind === 'storage_failure') console.error('perderVentaAction', movida.error.detail)
      return { status: 'error', message: movida.error.kind === 'storage_failure' ? 'No pudimos guardarlo. Vuelve a intentarlo.' : movida.error.detail }
    }
    if (!isErr(movida)) await admin.record(actor, { action: 'consulta.estado', subject: movida.value.name, detail: `Perdida · ${etiquetaDeMotivo(motivo)}` })
  }

  revalidarVentas()
  return { status: 'success', message: 'Venta marcada como perdida, con su motivo.' }
}

/** Reabrir una consulta perdida: quien dijo que no vuelve a escribir. Se retoma contactada. */
export async function reabrirVentaAction(formData: FormData): Promise<void> {
  const actor = await requireAdmin()
  const movida = await leads.move({ id: campo(formData, 'consultaId'), to: 'contacted', note: '', eventId: '' })
  if (isErr(movida)) {
    if (movida.error.kind === 'storage_failure') console.error('reabrirVentaAction', movida.error.detail)
    return
  }
  await admin.record(actor, { action: 'consulta.estado', subject: movida.value.name, detail: 'Perdida → Contactada' })
  revalidarVentas()
}
