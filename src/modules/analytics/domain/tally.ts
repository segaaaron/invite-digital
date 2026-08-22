import { DEVICES, SOURCES, type Device, type Source } from './view'

export type ViewRow = { readonly device: Device; readonly source: Source; readonly viewedAt: Date }

export type Breakdown = { readonly label: string; readonly count: number; readonly percent: number }

export type ViewTally = {
  readonly total: number
  readonly today: number
  readonly devices: readonly Breakdown[]
  readonly sources: readonly Breakdown[]
}

const ETIQUETA_DISPOSITIVO: Record<Device, string> = {
  mobile: 'Móvil',
  tablet: 'Tableta',
  desktop: 'Escritorio',
}

const ETIQUETA_FUENTE: Record<Source, string> = {
  whatsapp: 'WhatsApp',
  qr: 'Código QR',
  direct: 'Directo',
  other: 'Otras',
}

const porcentaje = (parte: number, total: number): number => (total === 0 ? 0 : Math.round((parte / total) * 100))

/**
 * El recuento de visitas. `now` entra como argumento y no se lee del reloj: contar «hoy»
 * con `Date.now()` dentro haría la función imposible de probar sin congelar el tiempo.
 */
export function tallyViews(rows: readonly ViewRow[], now: Date): ViewTally {
  const inicioDeHoy = new Date(now)
  inicioDeHoy.setHours(0, 0, 0, 0)

  const total = rows.length

  return {
    total,
    today: rows.filter((r) => r.viewedAt >= inicioDeHoy).length,
    devices: DEVICES.map((device) => {
      const count = rows.filter((r) => r.device === device).length
      return { label: ETIQUETA_DISPOSITIVO[device], count, percent: porcentaje(count, total) }
    }),
    sources: SOURCES.map((source) => {
      const count = rows.filter((r) => r.source === source).length
      return { label: ETIQUETA_FUENTE[source], count, percent: porcentaje(count, total) }
    }),
  }
}
