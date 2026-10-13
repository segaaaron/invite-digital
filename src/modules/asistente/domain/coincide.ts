import { comoSuena } from './como-suena'

/** Palabras que no distinguen a nadie: «la familia Torres» busca a los Torres. */
const VACIAS = new Set(['familia', 'flia', 'fam', 'los', 'las', 'el', 'la', 'de', 'del', 'y', 'a', 'al', 'sr', 'sra', 'don', 'dona', 'doña'])

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const palabras = (s: string) => sinTildes(s).split(/[^a-z0-9ñ]+/).filter((p) => p !== '' && !VACIAS.has(p))

/**
 * Si lo buscado nombra a esta persona (13 oct: «borra a la familia Torres» no encontraba la invitación «Pedro
 * Torres», porque se buscaba la frase entera). Cada palabra con significado tiene que estar, en cualquier orden;
 * `porSonido` compara además como suena (un dictado: «Peres» por «Pérez»). Sin palabras con significado, nada.
 */
export function coincide(donde: string, buscado: string, { porSonido = false }: { porSonido?: boolean } = {}): boolean {
  const buscadas = palabras(buscado)
  if (buscadas.length === 0) return sinTildes(donde).includes(sinTildes(buscado).trim())
  const enDonde = palabras(donde)
  const igual = porSonido ? (a: string, b: string) => comoSuena(a).includes(comoSuena(b)) : (a: string, b: string) => a.includes(b)
  return buscadas.every((b) => enDonde.some((d) => igual(d, b)))
}
