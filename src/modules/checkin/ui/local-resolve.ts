import { isErr } from '@/shared/result'
import type { DoorManifestGroup } from '../application/get-door-manifest'
import { parsePass } from '../domain/parse-pass'

export type LocalOutcome = {
  readonly kind: 'welcome' | 'already' | 'unknown'
  readonly group?: DoorManifestGroup
  readonly arrivedCount?: number
}

/**
 * Mismo algoritmo y misma entrada que `createTokenMinter().hashOf` en el servidor:
 * SHA-256 sobre los bytes UTF-8 del token. Web Crypto exige contexto seguro, que la
 * cámara ya exige de todas formas.
 */
export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * La puerta decide verde, ámbar o rojo sin servidor, con el mismo `parsePass` del
 * dominio. El manifiesto lleva hashes, nunca tokens: si roban el celular, de aquí no
 * salen enlaces utilizables.
 */
export async function resolveLocally(
  scanned: string,
  groups: readonly DoorManifestGroup[],
  arrivedIds: ReadonlySet<string>,
): Promise<LocalOutcome> {
  const token = parsePass(scanned)
  if (isErr(token)) return { kind: 'unknown' }

  const hash = await sha256Hex(token.value)
  const group = groups.find((g) => g.tokenHashHex === hash)
  if (!group) return { kind: 'unknown' }

  if (arrivedIds.has(group.id)) return { kind: 'already', group, arrivedCount: group.attending ?? 1 }
  return { kind: 'welcome', group, arrivedCount: group.attending ?? 1 }
}
