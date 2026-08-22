import { err, ok, type Result } from '@/shared/result'

export const DEVICES = ['mobile', 'tablet', 'desktop'] as const
export const SOURCES = ['whatsapp', 'qr', 'direct', 'other'] as const

export type Device = (typeof DEVICES)[number]
export type Source = (typeof SOURCES)[number]

export type InvitationView = {
  readonly eventId: string
  readonly guestGroupId: string | null
  readonly device: Device
  readonly source: Source
  readonly viewedAt: Date
}

export type AnalyticsError = { readonly kind: 'invalid_view' | 'storage_failure'; readonly detail: string }

export const analyticsError = (kind: AnalyticsError['kind'], detail: string): AnalyticsError => ({ kind, detail })

/**
 * El dispositivo sale del agente de usuario **en el servidor** y se guarda ya
 * categorizado. La cadena completa no se escribe en ninguna parte: identifica a un
 * navegador concreto y no hace falta para contar tres columnas.
 *
 * El orden importa: un iPad dice «Macintosh» en algunos navegadores y un Android tableta
 * dice «Android» sin decir «Mobile». Se comprueba tableta antes que móvil y que
 * escritorio.
 */
export function classifyDevice(userAgent: string): Device {
  const ua = userAgent.toLowerCase()
  if (ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile')) || ua.includes('tablet')) return 'tablet'
  if (ua.includes('mobi') || ua.includes('iphone') || ua.includes('android')) return 'mobile'
  return 'desktop'
}

/**
 * La fuente sale de `utm_source` si viene, y del `Referer` si no. Sin ninguno de los dos
 * es `direct`: alguien pegó el enlace a mano o lo abrió desde una nota.
 */
export function classifySource(utmSource: string | null, referer: string | null): Source {
  const utm = utmSource?.trim().toLowerCase() ?? ''
  if (utm === 'whatsapp' || utm === 'wa') return 'whatsapp'
  if (utm === 'qr') return 'qr'
  if (utm !== '') return 'other'

  const ref = referer?.toLowerCase() ?? ''
  if (ref === '') return 'direct'
  if (ref.includes('whatsapp') || ref.includes('wa.me')) return 'whatsapp'
  return 'other'
}

export function createView(input: {
  eventId: string
  guestGroupId: string | null
  device: string
  source: string
  viewedAt: Date
}): Result<InvitationView, AnalyticsError> {
  if (!DEVICES.includes(input.device as Device)) {
    return err(analyticsError('invalid_view', `Dispositivo desconocido: ${input.device}`))
  }
  if (!SOURCES.includes(input.source as Source)) {
    return err(analyticsError('invalid_view', `Fuente desconocida: ${input.source}`))
  }
  return ok({
    eventId: input.eventId,
    guestGroupId: input.guestGroupId,
    device: input.device as Device,
    source: input.source as Source,
    viewedAt: input.viewedAt,
  })
}
