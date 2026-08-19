/**
 * La URL del sitio entra por argumento y no se lee de `env`: el dominio no depende del
 * entorno, igual que no depende del reloj.
 */
export const invitationUrl = (token: string, siteUrl: string): string => `${siteUrl.replace(/\/+$/, '')}/i/${token}`
