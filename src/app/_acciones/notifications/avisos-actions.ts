'use server'

import { headers } from 'next/headers'
import { avisos } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import { TIPOS_DE_AVISO } from '@/modules/notifications'
import { describirDispositivo } from '@/modules/identity'

// Los avisos del propio actor de la sesión: su campana, sus aparatos y lo que silencia. Ninguna toca un
// evento ni lo que es de otra persona (todas filtran por `actor.userId`).

export type AvisoDeLaCampana = { id: string; kind: string; title: string; body: string; href: string; createdAt: string; visto: boolean }

/** Los últimos avisos, y los deja vistos: abrir la campana es verlos. */
export async function abrirCampanaAction(): Promise<AvisoDeLaCampana[]> {
  const actor = await requireSession()
  const lista = await avisos.listar(actor.userId)
  await avisos.marcarVistos(actor.userId)
  return lista.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))
}

export type SuscripcionDelNavegador = { endpoint?: string; keys?: { p256dh?: string; auth?: string } }

/** Activa las notificaciones push en este aparato. Lo que llega es lo que devuelve `PushSubscription.toJSON()`. */
export async function activarAparatoAction(sub: SuscripcionDelNavegador): Promise<{ ok: boolean }> {
  const actor = await requireSession()
  const endpoint = sub.endpoint ?? ''
  const p256dh = sub.keys?.p256dh ?? ''
  const auth = sub.keys?.auth ?? ''
  // Solo servicios de push de verdad, por https: el servidor va a hacer peticiones a esa dirección.
  if (!/^https:\/\/[^\s]+$/.test(endpoint) || endpoint.length > 1000 || p256dh === '' || auth === '' || p256dh.length > 200 || auth.length > 100) return { ok: false }
  const agente = (await headers()).get('user-agent') ?? ''
  await avisos.suscribir(actor.userId, { endpoint, p256dh, auth }, describirDispositivo(agente).slice(0, 80))
  return { ok: true }
}

export async function desactivarAparatoAction(endpoint: string): Promise<{ ok: boolean }> {
  const actor = await requireSession()
  await avisos.desuscribir(actor.userId, endpoint)
  return { ok: true }
}

/** Manda un aviso de prueba a los aparatos de la persona. */
export async function probarAvisosAction(): Promise<{ aparatos: number; entregados: number }> {
  const actor = await requireSession()
  return avisos.probar(actor.userId)
}

export type PreferenciasState = { status: 'idle' } | { status: 'success'; message: string } | { status: 'error'; message: string }

/**
 * Qué tipos de aviso van a sus aparatos: un interruptor `tipo:<tipo>` por cada uno que la pantalla enseña
 * (`mostrado`). Solo esos cambian: los que no se le enseñan (ventas, a quien no es admin) se quedan como estaban.
 */
export async function guardarPreferenciasAction(_previo: PreferenciasState, formData: FormData): Promise<PreferenciasState> {
  const actor = await requireSession()
  const mostrados = new Set(formData.getAll('mostrado').filter((x): x is string => typeof x === 'string'))
  const antes = await avisos.silenciados(actor.userId)
  const silenciados = TIPOS_DE_AVISO.filter((t) => (mostrados.has(t) ? formData.get(`tipo:${t}`) !== 'on' : antes.includes(t)))
  await avisos.silenciar(actor.userId, silenciados)
  return { status: 'success', message: 'Guardado.' }
}
