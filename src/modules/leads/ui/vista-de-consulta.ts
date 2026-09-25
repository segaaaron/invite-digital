import type { ConsultationRow } from '../application/ports'
import { esperaDeConsulta } from '../domain/espera'
import type { ConsultationView } from './ConsultationDetail'

const FECHA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const RECIBIDA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' })
const CORTA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', timeZone: 'America/La_Paz' })

/**
 * La fila de la base, lista para pintar: fechas ya formateadas en el servidor —el navegador
 * no tiene por qué estar en la misma zona— y la categoría con su nombre. La usan Consultas y
 * el panel lateral de Ventas.
 */
export function vistaDeConsulta(c: ConsultationRow, nombreCategoria: ReadonlyMap<string, string>, ahora: Date): ConsultationView {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    category: c.categorySlug === null ? null : (nombreCategoria.get(c.categorySlug) ?? c.categorySlug),
    eventDateLabel: c.eventDate === null ? null : FECHA.format(new Date(`${c.eventDate}T00:00:00Z`)),
    message: c.message,
    status: c.status,
    note: c.note,
    receivedLabel: `Llegó el ${RECIBIDA.format(c.createdAt)}`,
    shortDateLabel: CORTA.format(c.createdAt),
    event: c.event,
    espera: c.status === 'new' ? esperaDeConsulta(c.createdAt, ahora) : null,
  }
}
