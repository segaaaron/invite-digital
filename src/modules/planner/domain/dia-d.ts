import type { EstadoDeProveedor } from './equipo-del-dia'
import type { Pago } from './presupuesto'

const HORA_BOLIVIA = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** `HH:MM` en La Paz. El servidor corre en UTC: a las diez de la noche allí ya es mañana. */
export const horaEnBolivia = (instante: Date): string => HORA_BOLIVIA.format(instante)

/** Con trato y sin llegar, por hora de llegada. Los que no tienen hora, al final. */
export function proveedoresPorLlegar<T extends { status: EstadoDeProveedor; arrivalTime: string | null; arrivedAt: Date | null }>(lista: readonly T[]): T[] {
  return lista
    .filter((p) => p.status !== 'cotizando' && p.arrivedAt === null)
    .sort((a, b) => (a.arrivalTime ?? '99:99').localeCompare(b.arrivalTime ?? '99:99'))
}

/** Pagos sin marcar que vencen hoy o ya vencieron, del más viejo al de hoy. */
export function pagosDelDia(partidas: ReadonlyArray<{ id: string; concept: string; pagos: readonly Pago[] }>, hoy: string) {
  return partidas
    .flatMap((p) => p.pagos.map((g) => ({ ...g, concepto: p.concept })))
    .filter((g) => g.paidAt === null && g.dueDate !== null && g.dueDate <= hoy)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
}

/** Por mesa, quién falta por llegar. Una mesa completa no dice nada el Día D. */
export function mesasConFaltantes(mesas: ReadonlyArray<{ id: string; label: string; groups: ReadonlyArray<{ id: string; label: string }> }>, llegaron: ReadonlySet<string>) {
  return mesas
    .map((m) => ({ id: m.id, label: m.label, faltan: m.groups.filter((g) => !llegaron.has(g.id)).map((g) => g.label) }))
    .filter((m) => m.faltan.length > 0)
}

export type TipoDeDocumento = 'contrato' | 'cotizacion' | 'factura' | 'referencia'
export const TIPOS_DE_DOCUMENTO: readonly TipoDeDocumento[] = ['contrato', 'cotizacion', 'factura', 'referencia']
export const NOMBRE_DE_DOCUMENTO: Record<TipoDeDocumento, string> = { contrato: 'Contrato', cotizacion: 'Cotización', factura: 'Factura', referencia: 'Referencia' }

/** Diez megas: un contrato escaneado cabe de sobra. Se comprueba antes de leer a memoria. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

export function leerDocumento(input: { kind: string; topic: string; size: number }): { ok: true; kind: TipoDeDocumento; topic: string | null } | { ok: false; mensaje: string } {
  if (input.size <= 0) return { ok: false, mensaje: 'Elige un archivo.' }
  if (input.size > MAX_DOCUMENT_BYTES) return { ok: false, mensaje: 'El archivo pasa de 10 MB.' }
  if (!TIPOS_DE_DOCUMENTO.includes(input.kind as TipoDeDocumento)) return { ok: false, mensaje: 'Elige qué documento es.' }
  return { ok: true, kind: input.kind as TipoDeDocumento, topic: input.topic.trim().slice(0, 80) || null }
}

const EXTENSION: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
export const extensionDeDocumento = (mime: string): string => EXTENSION[mime] ?? 'bin'
