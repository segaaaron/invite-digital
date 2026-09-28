import { avisosDeHoy } from '@/modules/admin/domain/avisos-del-evento'
import { diasEntre, fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { drizzleAcompanamiento } from '@/modules/admin/infrastructure/drizzle-acompanamiento'
import { fiestaDeTema } from '@/modules/events'
import { env } from '@/shared/config/env'
import { diaDelEvento } from '@/shared/format/fecha'
import { createTokenMinter } from '@/shared/security/tokens'
import { isErr } from '@/shared/result'
import { admin } from './negocio'
import { notifications } from './web'

const minter = createTokenMinter()
const sitio = () => env.SITE_URL.replace(/\/+$/, '')

/**
 * **El acompañamiento diario**: lo corre `pnpm maintenance`. Para cada evento vivo decide qué
 * aviso toca hoy (`avisosDeHoy`) y se lo manda a sus anfitriones **una sola vez**: el aviso se
 * aparta antes de mandarlo, y si el correo no sale se devuelve para reintentar mañana.
 *
 * Sin anfitrión con acceso (un evento que lleva el atelier) no hay a quién escribir: no se aparta.
 */
export async function enviarAcompanamiento(ahora: Date): Promise<{ enviados: number; fallidos: number }> {
  const hoy = fechaEnBolivia(ahora)
  const eventos = await drizzleAcompanamiento.eventos(hoy)
  let enviados = 0
  let fallidos = 0
  const ajustes = await admin.mensajes()
  const descuento = isErr(ajustes) ? 0 : ajustes.value.descuentoReferido
  for (const e of eventos) {
    if (e.anfitriones.length === 0) continue
    const avisos = avisosDeHoy({ ...e, fiesta: fiestaDeTema(e.themeKey), yaEnviados: new Set(e.yaEnviados) }, hoy)
    for (const tipo of avisos) {
      if (!(await drizzleAcompanamiento.reservar(e.id, tipo))) continue
      let enlaceOpinion: string | null = null
      if (tipo === 'encuesta') {
        const { token, hash } = minter.mint()
        await drizzleAcompanamiento.crearEncuesta(e.id, hash)
        enlaceOpinion = `${sitio()}/es/opinion/${token}`
      }
      const entrada = {
        tipo,
        evento: e.title,
        fecha: diaDelEvento(e.eventDate),
        dias: diasEntre(hoy, e.eventDate),
        grupos: e.grupos,
        respondidos: e.respondidos,
        enlacePanel: tipo === 'aniversario' ? `${sitio()}/es/colecciones` : `${sitio()}/panel/eventos/${e.slug}`,
        enlaceOpinion,
        // Tras la fiesta, cada evento recibe su código de recomendación sin que nadie lo cree a mano.
        referido: tipo === 'encuesta' || tipo === 'aniversario' ? await referidoDe(e.id, descuento) : null,
      }
      const resultados = await Promise.all(e.anfitriones.map((to) => notifications.sendAcompanamiento(to, entrada)))
      if (resultados.some(Boolean)) enviados += 1
      else {
        fallidos += 1
        await drizzleAcompanamiento.liberar(e.id, tipo)
      }
    }
  }
  return { enviados, fallidos }
}

async function referidoDe(eventId: string, descuento: number) {
  const codigo = await admin.ensureReferralCode(eventId)
  return isErr(codigo) ? null : { codigo: codigo.value, descuento }
}

/** La encuesta de un enlace de opinión. `null` si el enlace no existe. */
export const leerEncuesta = (token: string) => drizzleAcompanamiento.encuesta(minter.hashOf(token))

/** Guarda la opinión, una sola vez. */
export const responderEncuesta = (token: string, respuesta: { rating: number; comment: string | null; allowPublish: boolean }) =>
  drizzleAcompanamiento.responder(minter.hashOf(token), respuesta)

/** Las opiniones de estos eventos, para enseñarlas en el panel. */
export const opinionesDe = (eventIds: readonly string[]) => drizzleAcompanamiento.opiniones(eventIds)
