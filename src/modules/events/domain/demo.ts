import type { Event } from './event'

/**
 * **La demo de un día**: la invitación que el admin arma para enseñarle a un cliente cómo funciona lo que
 * vendemos, y que le llega por WhatsApp igual que le llegaría a un invitado suyo.
 *
 * Un día, decidido con el usuario el 20 de octubre: una o dos horas no alcanzan si el cliente abre el
 * mensaje por la noche, y una semana deja la demo circulando cuando ya no la controlamos. Un día es «míralo
 * hoy», que además es el empujón para que decida.
 *
 * Lo que la distingue de una boda vendida es **solo** `demoUntil`. Por eso la regla vive aquí, en una
 * función que todos usan, y no en un `!== null` repetido por las pantallas: el día que la demo cambie de
 * forma, cambia en un sitio.
 */
export const DURACION_DE_LA_DEMO_MS = 24 * 60 * 60 * 1000

export const caducidadDeUnaDemo = (desde: Date): Date => new Date(desde.getTime() + DURACION_DE_LA_DEMO_MS)

export const esDemo = (event: Pick<Event, 'demoUntil'>): boolean => event.demoUntil !== null

/**
 * Si esta demo ya no abre. **Lo vendido nunca vence por aquí**: sin `demoUntil` devuelve `false` siempre, que
 * es lo que impide que un fallo en esta línea apague una boda de verdad.
 */
export const demoVencida = (event: Pick<Event, 'demoUntil'>, ahora: Date): boolean =>
  event.demoUntil !== null && event.demoUntil.getTime() < ahora.getTime()

/** Lo que el admin lee en la lista («caduca en 19 h»). Redondea hacia arriba y nunca baja de cero. */
export const horasQueLeQuedan = (hasta: Date, ahora: Date): number => Math.max(0, Math.ceil((hasta.getTime() - ahora.getTime()) / 3_600_000))
