/**
 * Dónde es el evento, para el mapa de la invitación.
 *
 * El atelier pega el enlace de Google Maps o escribe la dirección; de ahí sale el mapa
 * incrustado —sin clave de API: el `output=embed` público— y el botón de cómo llegar. Puro:
 * los enlaces cortos (`maps.app.goo.gl`) los resuelve la acción al guardar.
 */

type Mapa = { readonly href?: string | undefined; readonly coords?: string | undefined; readonly label?: string | undefined }

const EMBED = (q: string) => `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`
const BUSQUEDA = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`

/** «19.32°N · 99.18°W» → «19.32,-99.18». */
function coordenadas(texto: string | undefined): string | null {
  if (texto === undefined) return null
  const m = /(-?\d+(?:\.\d+)?)\s*°?\s*([NS])?[^\d-]+(-?\d+(?:\.\d+)?)\s*°?\s*([EW])?/i.exec(texto)
  if (m === null) return null
  const lat = Number(m[1]) * (m[2]?.toUpperCase() === 'S' ? -1 : 1)
  const lng = Number(m[3]) * (m[4]?.toUpperCase() === 'W' ? -1 : 1)
  return Number.isFinite(lat) && Number.isFinite(lng) ? `${lat},${lng}` : null
}

/** Lo que Google Maps sabe buscar dentro de un enlace suyo. */
function consultaDeEnlace(href: string | undefined): string | null {
  if (href === undefined) return null
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  const arroba = /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(url.pathname)
  if (arroba !== null) return `${arroba[1]},${arroba[2]}`
  const param = url.searchParams.get('query') ?? url.searchParams.get('q')
  if (param !== null && param.trim() !== '') return param.trim()
  const sitio = /\/maps\/place\/([^/]+)/.exec(url.pathname)
  if (sitio?.[1] !== undefined) return decodeURIComponent(sitio[1].replace(/\+/g, ' '))
  return null
}

/** La dirección del mapa incrustado, o `null` si no hay nada que ubicar. */
export function mapaIncrustado(mapa: Mapa, respaldo?: string): string | null {
  const q = consultaDeEnlace(mapa.href) ?? coordenadas(mapa.coords) ?? (respaldo?.trim() || null)
  return q === null ? null : EMBED(q)
}

/** Lo que se guarda en `map.href`: el enlace tal cual, o la dirección escrita convertida en búsqueda. */
export function enlaceDeUbicacion(entrada: string): string {
  const limpio = entrada.trim()
  if (limpio === '') return ''
  return /^https?:\/\//i.test(limpio) ? limpio : BUSQUEDA(limpio)
}

/** Adónde lleva tocar el mapa: la aplicación de mapas del teléfono, o Google Maps en la web. */
export function comoLlegar(mapa: Mapa, respaldo?: string): string | null {
  if (mapa.href !== undefined && mapa.href !== '') return mapa.href
  const c = coordenadas(mapa.coords) ?? (respaldo?.trim() || null)
  return c === null ? null : BUSQUEDA(c)
}
