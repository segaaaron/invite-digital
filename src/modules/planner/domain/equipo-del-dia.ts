import type { Fiesta } from '@/modules/events'
import { horaValida } from './cronograma'

export type EstadoDeProveedor = 'cotizando' | 'reservado' | 'contratado' | 'confirmado'
export const ESTADOS_DE_PROVEEDOR: readonly EstadoDeProveedor[] = ['cotizando', 'reservado', 'contratado', 'confirmado']
export const NOMBRE_DE_ESTADO: Record<EstadoDeProveedor, string> = { cotizando: 'Cotizando', reservado: 'Reservado', contratado: 'Contratado', confirmado: 'Confirmado' }

export type Proveedor = {
  readonly id: string
  readonly service: string
  readonly company: string | null
  readonly contactName: string | null
  readonly whatsapp: string | null
  readonly email: string | null
  readonly status: EstadoDeProveedor
  /** `HH:MM`: cuándo llega el día del evento. */
  readonly arrivalTime: string | null
  readonly setupNotes: string | null
  /** La partida del presupuesto donde vive su dinero. El precio y los pagos son de ahí. */
  readonly budgetItemId: string | null
  /** Si tiene enlace de solo lectura activo. El token nunca vuelve de la base. */
  readonly conEnlace: boolean
  /** Cuándo llegó el día del evento. */
  readonly arrivedAt: Date | null
}

export type ProveedorInput = { service: string; company: string; contactName: string; whatsapp: string; email: string; status: string; arrivalTime: string; setupNotes: string }
export type ProveedorLimpio = Omit<Proveedor, 'id' | 'budgetItemId' | 'conEnlace' | 'arrivedAt'>

const opcional = (v: string, max: number) => v.trim().slice(0, max) || null

export function leerProveedor(input: ProveedorInput): { ok: true; valor: ProveedorLimpio } | { ok: false; mensaje: string } {
  const service = input.service.trim()
  if (service.length === 0 || service.length > 80) return { ok: false, mensaje: 'Di qué servicio da: DJ, fotógrafo, catering…' }
  const email = input.email.trim().toLowerCase()
  if (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, mensaje: 'Revisa el correo.' }
  if (input.arrivalTime !== '' && !horaValida(input.arrivalTime)) return { ok: false, mensaje: 'La hora de llegada va como 17:30.' }
  if (!ESTADOS_DE_PROVEEDOR.includes(input.status as EstadoDeProveedor)) return { ok: false, mensaje: 'Elige el estado.' }
  const whatsapp = input.whatsapp.replace(/[^\d+]/g, '').slice(0, 20) || null
  return {
    ok: true,
    valor: {
      service,
      company: opcional(input.company, 120),
      contactName: opcional(input.contactName, 120),
      whatsapp,
      email: email || null,
      status: input.status as EstadoDeProveedor,
      arrivalTime: input.arrivalTime || null,
      setupNotes: opcional(input.setupNotes, 2000),
    },
  }
}

/** Los que ya tienen trato pero no confirmaron: son los que hay que llamar esta semana. */
export const proveedoresSinConfirmar = <T extends { status: EstadoDeProveedor }>(lista: readonly T[]): T[] =>
  lista.filter((p) => p.status === 'reservado' || p.status === 'contratado')

export type TipoDeCortejo = 'padrino' | 'dama' | 'caballero' | 'chambelan' | 'corte'
/** Un cumpleaños no tiene cortejo: sin tipos, la pantalla no ofrece sumar a nadie. */
export const TIPOS_DE_CORTEJO: Record<Fiesta, readonly TipoDeCortejo[]> = {
  boda: ['padrino', 'dama', 'caballero'],
  xv: ['padrino', 'chambelan', 'corte'],
  cumple: [],
}
const NOMBRE_DE_CORTEJO: Record<TipoDeCortejo, string> = { padrino: 'Padrino', dama: 'Dama de honor', caballero: 'Caballero de honor', chambelan: 'Chambelán', corte: 'Corte de honor' }
export const nombreDelCortejo = (tipo: TipoDeCortejo): string => NOMBRE_DE_CORTEJO[tipo]

export type MiembroDelCortejo = {
  readonly id: string
  readonly kind: TipoDeCortejo
  readonly name: string
  readonly whatsapp: string | null
  /** Lo que apadrina: aros, arras, torta… */
  readonly sponsors: string | null
  /** Talla de traje o vestido. */
  readonly size: string | null
  readonly confirmed: boolean
  readonly budgetItemId: string | null
}

export type Ensayo = { readonly id: string; readonly date: Date; readonly place: string | null; readonly notes: string | null; readonly asistentes: readonly string[] }
