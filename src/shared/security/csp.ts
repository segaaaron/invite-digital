/**
 * Strict CSP with a per-request nonce, as the spec's section 12 requires.
 *
 * `strict-dynamic` is what lets Next's own bootstrap scripts load the chunks they
 * need: the browser trusts anything a nonce-carrying script loads, so the chunk URLs
 * do not have to be enumerated. `unsafe-inline` stays in `style-src` because Next and
 * framer-motion both write inline styles — CSS injection without script execution is a
 * far smaller risk than leaving script-src open.
 *
 * `dev` abre `unsafe-eval` y **solo** en el servidor de desarrollo: el runtime de
 * react-refresh evalúa una cadena al arrancar y, si la política se lo prohíbe, el
 * arranque del cliente muere entero. Nada hidrata, y las secciones que entran con
 * animación —que empiezan en `opacity: 0`— se quedan invisibles: la portada aparece sin
 * titular y parece rota. En producción no existe ese runtime y el permiso no se da.
 */
export function buildContentSecurityPolicy(nonce: string, { dev = false }: { dev?: boolean } = {}): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
}

/** 128 bits of randomness, base64 — regenerated for every request. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes))
}
