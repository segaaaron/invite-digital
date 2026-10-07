/**
 * La URL del sitio entra por argumento y no se lee de `env`: el dominio no depende del
 * entorno, igual que no depende del reloj.
 */
export const invitationUrl = (token: string, siteUrl: string): string => `${siteUrl.replace(/\/+$/, '')}/i/${token}`

/** Por qué canal sale un enlace. Lo lee la analítica (`classifySource`) al abrir la invitación. */
export type CanalDeEnvio = 'whatsapp' | 'qr' | 'correo' | 'sms' | 'enlace' | 'mensaje' | 'compartir' | 'general'

/**
 * El enlace marcado con su canal (`?utm_source=…`), para que «Por dónde les llega» sepa de dónde
 * vino la visita. **Hace falta marcarlo**: WhatsApp abre los enlaces sin decir de dónde vienen, y
 * sin marca todas las visitas contaban como «Directo» (6 de octubre). La puerta no se entera: el
 * escáner lee solo la ruta (`parsePass`).
 */
export const conCanal = (url: string, canal: CanalDeEnvio): string => `${url}${url.includes('?') ? '&' : '?'}utm_source=${canal}`
