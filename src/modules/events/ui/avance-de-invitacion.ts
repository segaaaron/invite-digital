import type { InvitationContent, SectionKey } from '../domain/invitation-content'

/**
 * El mapa va **dentro** de la recepción: es el mismo lugar, y en dos tarjetas se leía como
 * dos sitios distintos. Solo si el diseño pinta las dos.
 */
export const anexoDe = (sections: readonly SectionKey[], seccion: SectionKey): SectionKey | undefined =>
  seccion === 'reception' && sections.includes('map') ? 'map' : undefined

/** Las secciones que se editan una a una, en el orden de la invitación. */
export const visibles = (sections: readonly SectionKey[]): readonly SectionKey[] => (sections.includes('reception') ? sections.filter((s) => s !== 'map') : sections)

/** Si el bloque tiene algo escrito. */
export const escrito = (content: InvitationContent, seccion: SectionKey): boolean => {
  const bloque = content[seccion]
  if (bloque === undefined || bloque === null) return false
  if (Array.isArray(bloque)) return bloque.length > 0
  return Object.values(bloque as Record<string, unknown>).some((v) => (typeof v === 'string' && v.trim() !== '') || (Array.isArray(v) && v.length > 0))
}

/** Cuántas secciones están listas de cuántas: la barra de «Mi invitación». */
export const avanceDeLaInvitacion = (sections: readonly SectionKey[], content: InvitationContent) => {
  const todas = visibles(sections)
  return { listas: todas.filter((s) => escrito(content, s)).length, total: todas.length }
}
