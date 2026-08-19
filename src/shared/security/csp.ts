/**
 * Strict CSP with a per-request nonce, as the spec's section 12 requires.
 *
 * `strict-dynamic` is what lets Next's own bootstrap scripts load the chunks they
 * need: the browser trusts anything a nonce-carrying script loads, so the chunk URLs
 * do not have to be enumerated. `unsafe-inline` stays in `style-src` because Next and
 * framer-motion both write inline styles — CSS injection without script execution is a
 * far smaller risk than leaving script-src open.
 */
export function buildContentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
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
