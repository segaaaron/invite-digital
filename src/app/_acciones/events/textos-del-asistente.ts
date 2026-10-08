import type { InvitationContent } from '@/modules/events'
import type { TextosPropuestos } from '@/modules/asistente/domain/herramientas'
import { COLORES_DE_VESTIMENTA } from '@/modules/events/domain/paleta-vestimenta'
import { enlaceDeUbicacion } from '@/modules/events/domain/ubicacion'

type Bloques = {
  -readonly [K in 'hero' | 'quote' | 'schedule' | 'ceremony' | 'reception' | 'map' | 'dressCode' | 'hosts' | 'notes' | 'closing' | 'music']?: InvitationContent[K]
}

const comparable = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
/** Un color dicho por su nombre de la paleta («verde salvia») o en `#rrggbb`; lo demás no se guarda. */
const colorDe = (dicho: string): string | null => {
  if (/^#[0-9a-f]{6}$/i.test(dicho.trim())) return dicho.trim().toLowerCase()
  return COLORES_DE_VESTIMENTA.find((c) => comparable(c.nombre) === comparable(dicho))?.hex ?? null
}
/** Los colores que no se reconocen: la acción no guarda si alguno se perdería. */
export const coloresDesconocidos = (t: TextosPropuestos): string[] => (t.colores_vestimenta ?? []).filter((c) => colorDe(c) === null)

/** Quita las claves `undefined`: el bloque se guarda como JSON y una clave vacía no es «sin cambio». */
const limpio = <T>(o: Record<string, unknown>): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T
const si = (v: string | null): string | undefined => (v === null || v.trim() === '' ? undefined : v.trim())

/**
 * Los bloques de la invitación que cambian con los textos que propuso Luxury, **mezclados con lo escrito**:
 * solo se tocan los campos que trae la propuesta (los `null` no cambian), así que la foto de la portada, el
 * monograma, la imagen de la vestimenta o el mapa siguen donde estaban. Un bloque que no cambia no se
 * devuelve: no se reescribe.
 */
export function bloquesDeTextos(actual: InvitationContent, t: TextosPropuestos): Bloques {
  const b: Bloques = {}
  if (t.nombre_a !== null || t.nombre_b !== null || t.texto_sobre_nombres !== null || t.iniciales !== null || t.texto_bajo_nombres !== null) {
    const cambia = (v: string | null, antes: string | undefined) => (v === null ? antes : si(v))
    b.hero = limpio<NonNullable<InvitationContent['hero']>>({
      ...actual.hero,
      nameA: si(t.nombre_a) ?? actual.hero?.nameA,
      nameB: cambia(t.nombre_b, actual.hero?.nameB),
      eyebrow: cambia(t.texto_sobre_nombres, actual.hero?.eyebrow),
      monogram: cambia(t.iniciales, actual.hero?.monogram),
      serial: cambia(t.texto_bajo_nombres, actual.hero?.serial),
    })
  }
  if (si(t.frase) !== undefined) b.quote = { text: si(t.frase)! }
  if (t.fecha_hora !== null) b.schedule = { startsAt: t.fecha_hora }
  const lugar = (antes: InvitationContent['ceremony'], nuevo: TextosPropuestos['ceremonia']) =>
    nuevo === null ? undefined : limpio<NonNullable<InvitationContent['ceremony']>>({ ...antes, place: si(nuevo.lugar) ?? antes?.place, address: si(nuevo.direccion) ?? antes?.address, time: nuevo.hora ?? antes?.time })
  const ceremonia = lugar(actual.ceremony, t.ceremonia)
  if (ceremonia !== undefined) b.ceremony = ceremonia
  const recepcion = lugar(actual.reception, t.recepcion)
  if (recepcion !== undefined) b.reception = recepcion
  if (t.vestimenta !== null || t.colores_vestimenta !== null) {
    b.dressCode = limpio<NonNullable<InvitationContent['dressCode']>>({
      ...actual.dressCode,
      ...(t.vestimenta === null ? {} : { title: t.vestimenta.titulo.trim(), note: t.vestimenta.nota === null ? actual.dressCode?.note : si(t.vestimenta.nota) }),
      ...(t.colores_vestimenta === null ? {} : { colors: t.colores_vestimenta.map(colorDe).filter((c): c is string => c !== null) }),
    })
  }
  if (si(t.ubicacion) !== undefined) b.map = limpio<NonNullable<InvitationContent['map']>>({ ...actual.map, href: enlaceDeUbicacion(t.ubicacion!), coords: undefined })
  if (t.anfitriones !== null) {
    const a = t.anfitriones
    const antes = actual.hosts?.roles ?? {}
    const cambia = (v: string | null, previo: string | undefined) => (v === null ? previo : si(v))
    const roles = limpio<NonNullable<NonNullable<InvitationContent['hosts']>['roles']>>({
      father: cambia(a.padre, antes.father),
      mother: cambia(a.madre, antes.mother),
      brideFather: cambia(a.padre_novia, antes.brideFather),
      brideMother: cambia(a.madre_novia, antes.brideMother),
      groomFather: cambia(a.padre_novio, antes.groomFather),
      groomMother: cambia(a.madre_novio, antes.groomMother),
      godparents: a.padrinos === null ? antes.godparents : a.padrinos.map((n) => n.trim()).filter(Boolean),
    })
    // `names` lo compone el lector desde los papeles.
    b.hosts = limpio<NonNullable<InvitationContent['hosts']>>({ label: a.titulo === null ? actual.hosts?.label : si(a.titulo), names: [], roles })
  }
  if (t.cancion !== null) b.music = limpio<NonNullable<InvitationContent['music']>>({ ...actual.music, track: t.cancion.titulo.trim(), artist: si(t.cancion.artista ?? '') })
  if (t.avisos !== null) b.notes = t.avisos.map((a) => limpio<{ title?: string; text?: string }>({ title: a.titulo.trim(), text: si(a.texto) }))
  if (si(t.cierre) !== undefined) b.closing = limpio<NonNullable<InvitationContent['closing']>>({ ...actual.closing, text: si(t.cierre) })
  return b
}
