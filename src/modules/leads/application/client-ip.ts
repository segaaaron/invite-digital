/**
 * The reverse proxy overwrites `x-forwarded-for` and sets `x-real-ip` with the socket
 * address (see docker/Caddyfile), so both are trustworthy in production. If a header
 * ever arrives with a client-supplied chain, the value appended by the closest proxy
 * is the rightmost one — never the leftmost, which anyone can forge.
 */
export function clientIpFrom(headers: { realIp: string | null; forwardedFor: string | null }): string {
  const realIp = headers.realIp?.trim()
  if (realIp !== undefined && realIp.length > 0) return realIp

  const chain = (headers.forwardedFor ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

  return chain[chain.length - 1] ?? 'desconocida'
}
