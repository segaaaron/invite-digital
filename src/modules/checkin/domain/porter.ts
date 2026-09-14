import { err, ok, type Result } from '@/shared/result'
import { normalizarWhatsapp } from '@/shared/whatsapp'

/**
 * El portero: la persona de la puerta que suma quien compró el evento.
 *
 * Puro: valida lo que se escribe, compone el PIN y decide si su acceso está abierto a esta
 * hora. Quién puede sumarlo y cuántos caben lo decide la aplicación con el plan.
 */

export type PorteroLimpio = { readonly name: string; readonly phone: string | null; readonly gate: string | null }
export type FalloPortero = { readonly campo: 'name' | 'phone' | 'gate'; readonly mensaje: string }

/** Intentos de PIN antes de bloquear: seis dígitos se adivinan solos si nadie los cuenta. */
export const MAX_INTENTOS_PIN = 5
export const MINUTOS_BLOQUEO = 15
export const HORAS_ANTES_POR_DEFECTO = 6
export const HORAS_DESPUES_POR_DEFECTO = 4

/** Bolivia no tiene horario de verano: UTC−4 todo el año. */
const DESFASE_BOLIVIA_MS = 4 * 60 * 60 * 1000
const HORA_MS = 60 * 60 * 1000

export function leerPortero(entrada: { name: string; phone: string; gate: string }): Result<PorteroLimpio, FalloPortero> {
  const name = entrada.name.replace(/\s+/g, ' ').trim()
  if (name === '' || name.length > 80) return err({ campo: 'name', mensaje: 'Escribe el nombre del portero (hasta 80 caracteres).' })

  const gate = entrada.gate.replace(/\s+/g, ' ').trim()
  if (gate.length > 40) return err({ campo: 'gate', mensaje: 'El nombre de la puerta va hasta 40 caracteres.' })

  let phone: string | null = null
  if (entrada.phone.trim() !== '') {
    phone = normalizarWhatsapp(entrada.phone)
    if (phone === null) return err({ campo: 'phone', mensaje: 'Ese WhatsApp no es un número válido.' })
  }

  return ok({ name, phone, gate: gate === '' ? null : gate })
}

/** Seis dígitos a partir de cuatro bytes aleatorios. El sesgo del módulo sobre 32 bits es despreciable. */
export function generarPin(bytes: Uint8Array): string {
  const n = (((bytes[0] ?? 0) << 24) | ((bytes[1] ?? 0) << 16) | ((bytes[2] ?? 0) << 8) | (bytes[3] ?? 0)) >>> 0
  return String(n % 1_000_000).padStart(6, '0')
}

/** Si cabe uno más con este límite. `null` no limita; cero no admite ninguno. */
export const cabeUnoMas = (limite: number | null, actuales: number): boolean => limite === null || actuales < limite

/**
 * Si el acceso del portero está abierto: el día del evento en Bolivia, ampliado hacia atrás
 * y hacia delante. El evento guarda un día, no una hora, así que se toma el día entero.
 */
export function ventanaAbierta(input: { eventDate: string; ahora: Date; horasAntes: number; horasDespues: number }): boolean {
  const inicioDia = Date.parse(`${input.eventDate}T00:00:00Z`) + DESFASE_BOLIVIA_MS
  const finDia = inicioDia + 24 * HORA_MS
  const t = input.ahora.getTime()
  return t >= inicioDia - input.horasAntes * HORA_MS && t <= finDia + input.horasDespues * HORA_MS
}
