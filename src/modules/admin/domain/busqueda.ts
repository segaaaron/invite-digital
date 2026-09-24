/** Menos de esto no se busca: con una letra saldría media base. */
export const MINIMO_DE_BUSQUEDA = 2

/**
 * El patrón `ILIKE` de lo que escribió el admin, o `null` si no hay nada que buscar. Escapa
 * `%`, `_` y `\`: son comodines de SQL, y quien busca «50%» busca eso, no «50 y cualquier cosa».
 */
export function patronDeBusqueda(crudo: string): string | null {
  const texto = crudo.trim().replace(/\s+/g, ' ').slice(0, 80)
  if (texto.length < MINIMO_DE_BUSQUEDA) return null
  return `%${texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}

export type ResultadosDeBusqueda = {
  readonly eventos: readonly { readonly slug: string; readonly title: string; readonly eventDate: string }[]
  readonly pedidos: readonly { readonly ref: string; readonly customerName: string; readonly status: string }[]
  readonly consultas: readonly { readonly id: string; readonly name: string; readonly status: string }[]
  readonly usuarios: readonly { readonly email: string; readonly role: string }[]
}

export const SIN_RESULTADOS: ResultadosDeBusqueda = { eventos: [], pedidos: [], consultas: [], usuarios: [] }
