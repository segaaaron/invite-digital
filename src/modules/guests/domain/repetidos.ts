/**
 * Si alguien ya está en la lista (9 oct): Luxury registra al momento, y sin mirar la lista creaba otra invitación
 * para quien ya la tenía. Mismo nombre (sin tildes, mayúsculas ni espacios de más) o mismo WhatsApp (últimas 8
 * cifras). Las invitaciones revocadas no cuentan.
 */
// ponytail: igualdad exacta del nombre; un apellido partido por el dictado pasa. Parecidos (fuzzy) si hace falta.
import { comparable } from '@/shared/texto'

export type YaEsta = { readonly nombre: string; readonly invitacion: string; readonly por: 'nombre' | 'whatsapp' }

type Lista = {
  readonly grupos: readonly { readonly id: string; readonly label: string; readonly phone: string | null; readonly revokedAt: Date | null }[]
  readonly personas: readonly { readonly guestGroupId: string; readonly fullName: string }[]
}

const clave = comparable
const ultimas8 = (t: string | null) => {
  const d = (t ?? '').replace(/\D/g, '')
  return d.length >= 8 ? d.slice(-8) : null
}

export function yaEstaEnLaLista(nueva: { readonly personas: readonly string[]; readonly telefono: string | null }, lista: Lista): YaEsta | null {
  const activas = new Map(lista.grupos.filter((g) => g.revokedAt === null).map((g) => [g.id, g]))
  for (const nombre of nueva.personas) {
    const igual = lista.personas.find((p) => activas.has(p.guestGroupId) && clave(p.fullName) === clave(nombre))
    if (igual !== undefined) return { nombre, invitacion: activas.get(igual.guestGroupId)!.label, por: 'nombre' }
  }
  const tel = ultimas8(nueva.telefono)
  const mismo = tel === null ? undefined : [...activas.values()].find((g) => ultimas8(g.phone) === tel)
  return mismo === undefined ? null : { nombre: nueva.personas[0] ?? '', invitacion: mismo.label, por: 'whatsapp' }
}
