/**
 * Comprobación previa al despliegue. Los marcadores de relleno se ven idénticos a datos
 * reales en producción: el sitio compila, arranca y sirve, y nadie se entera de que el
 * botón de WhatsApp lleva a un número inventado. Esto convierte esa lista de pendientes
 * en algo que falla ruidosamente antes de publicar.
 *
 * Puro a propósito: sin `process.env` ni entrada/salida, para poder probarlo entero.
 */

/** Valores de relleno que viajan en el repositorio. Ninguno puede llegar a producción. */
export const PLACEHOLDERS = {
  whatsapp: '+59170012345',
  email: 'atelier@invitepremium.bo',
  domain: 'invitepremium.bo',
  /** Los datos de transferencia del Plan B nacen así, y así no cobran a nadie. */
  payment: ['BANCO PENDIENTE', 'TITULAR PENDIENTE', 'CUENTA PENDIENTE'] as readonly string[],
} as const

/** Contraseñas que aparecen en el repositorio o en la documentación. */
const KNOWN_WEAK_PASSWORDS = ['invite', 'postgres', 'password', 'prueba-local-no-produccion', 'changeme']

const MIN_PASSWORD_LENGTH = 16

export type ReleaseConfig = {
  /** Los sellos del hero. Vacío es válido: la banda no se pinta. */
  trustBrands: readonly string[]
  whatsapp: string
  email: string
  siteUrl: string
  siteDomain: string
  postgresPassword: string
  /** Banco, titular y cuenta que se le enseñan a quien hace un pedido. */
  payment: { bank: string; accountHolder: string; accountNumber: string }
}

export function checkReleaseReadiness(config: ReleaseConfig): string[] {
  const blockers: string[] = []

  if (config.whatsapp.trim() === PLACEHOLDERS.whatsapp) {
    blockers.push(`WhatsApp sigue siendo el marcador ${PLACEHOLDERS.whatsapp}: todos los botones de precio llevan a un número que no existe.`)
  }

  if (config.email.trim().toLowerCase() === PLACEHOLDERS.email) {
    blockers.push(`El correo sigue siendo el marcador ${PLACEHOLDERS.email}.`)
  }

  blockers.push(...checkSiteUrl(config.siteUrl))

  if (config.siteDomain.trim().toLowerCase() === PLACEHOLDERS.domain) {
    blockers.push(`SITE_DOMAIN sigue siendo el marcador ${PLACEHOLDERS.domain}: Caddy pediría un certificado para un dominio que no es tuyo.`)
  }

  if (config.trustBrands.some((marca) => /^marca aliada/i.test(marca.trim()))) {
    blockers.push(
      'La banda de confianza del hero sigue con marcadores «Marca aliada N»: pon las marcas reales o deja la lista vacía para que no se pinte.',
    )
  }

  const pago = [config.payment.bank, config.payment.accountHolder, config.payment.accountNumber]
  if (pago.some((dato) => PLACEHOLDERS.payment.includes(dato.trim().toUpperCase())) || pago.some((d) => d.trim() === '')) {
    blockers.push(
      'Los datos de transferencia del Plan B siguen siendo marcadores: un pedido enseñaría un número de cuenta que no existe, y el cliente se entera cuando ya transfirió.',
    )
  }

  blockers.push(...checkPassword(config.postgresPassword))

  return blockers
}

function checkSiteUrl(rawSiteUrl: string): string[] {
  const siteUrl = rawSiteUrl.trim()
  let parsed: URL

  try {
    parsed = new URL(siteUrl)
  } catch {
    return [`SITE_URL no es una URL absoluta: ${siteUrl}`]
  }

  const host = parsed.hostname.toLowerCase()

  if (host === PLACEHOLDERS.domain || host.endsWith(`.${PLACEHOLDERS.domain}`)) {
    return [`SITE_URL apunta al dominio de marcador ${PLACEHOLDERS.domain}.`]
  }

  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
    return [`SITE_URL apunta a ${host}: los enlaces de invitado y el sitemap saldrían con esa dirección.`]
  }

  // La cookie de sesión se emite con `secure` en producción. Sin HTTPS el navegador la
  // descarta y nadie puede entrar al panel.
  if (parsed.protocol !== 'https:') {
    return [`SITE_URL debe usar HTTPS en producción, no ${parsed.protocol.replace(':', '')}.`]
  }

  return []
}

function checkPassword(rawPassword: string): string[] {
  const password = rawPassword.trim()

  if (KNOWN_WEAK_PASSWORDS.includes(password.toLowerCase())) {
    return ['POSTGRES_PASSWORD es una contraseña que aparece en el repositorio: genera una nueva.']
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return [`POSTGRES_PASSWORD tiene ${password.length} caracteres; usa al menos ${MIN_PASSWORD_LENGTH}.`]
  }

  return []
}
