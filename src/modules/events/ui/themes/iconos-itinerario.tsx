import type { ReactNode } from 'react'
import type { InvitationContent } from '../../domain/invitation-content'
import { themeAsset } from './assets'
import { TIMELINE_ICONS, type TimelineIconKey } from './kit/flora/TimelineIcons'
import type { PielXv } from './xv/piel-xv'
import { PIEL_XV } from './xv/xv.skin'
import { CONTENIDO_DE_MUESTRA as XV } from './xv/xv.content'
import { PIEL as FANTASIA } from './xv/xv-fantasia.skin'
import { CONTENIDO_DE_MUESTRA as XV_FANTASIA } from './xv/xv-fantasia.content'
import { PIEL as MARIANA } from './xv/xv-mariana.skin'
import { CONTENIDO_DE_MUESTRA as XV_MARIANA } from './xv/xv-mariana.content'
import { PIEL as VALENTINA } from './xv/xv-valentina.skin'
import { CONTENIDO_DE_MUESTRA as XV_VALENTINA } from './xv/xv-valentina.content'

/** Un icono que se puede elegir para un momento del itinerario, dibujado como lo pinta el diseño. */
export type OpcionDeIcono = { readonly clave: string; readonly nombre: string; readonly dibujo: ReactNode }

const NOMBRES: Record<string, string> = {
  recepcion: 'Recepción',
  corona: 'Acto central',
  fiesta: 'Fiesta',
  despedida: 'Despedida',
  cena: 'Cena',
  baile: 'Baile',
  torta: 'Torta',
  cierre: 'Cierre',
  church: 'Ceremonia',
  envelope: 'Recepción',
  flutes: 'Brindis',
  dinner: 'Cena',
  bouquet: 'Ramo',
  disco: 'Fiesta',
  rings: 'Anillos',
  camera: 'Fotos',
  cake: 'Torta',
  attire: 'Vestido',
  heels: 'Zapatos',
}

/** Las claves que usa el diseño en su propio itinerario de muestra, sin repetir. */
const clavesDe = (contenido: InvitationContent): string[] => [...new Set((contenido.itinerary ?? []).flatMap((f) => (f.imageId === undefined ? [] : [f.imageId])))]

const deXv = (piel: PielXv, muestra: InvitationContent): OpcionDeIcono[] =>
  clavesDe(muestra).map((clave) => ({
    clave,
    nombre: NOMBRES[clave] ?? clave,
    dibujo: piel.iconoNodo?.(clave) ?? (
      // eslint-disable-next-line @next/next/no-img-element -- miniatura del arte del diseño, fuera del optimizador
      <img alt="" className="size-10 object-contain" src={piel.icono(clave)} style={{ filter: piel.iconoFiltro?.(clave) }} />
    ),
  }))

const botanicos = (): OpcionDeIcono[] =>
  (Object.keys(TIMELINE_ICONS) as TimelineIconKey[]).map((clave) => {
    const Icono = TIMELINE_ICONS[clave]
    return { clave, nombre: NOMBRES[clave] ?? clave, dibujo: <Icono color="currentColor" size={32} /> }
  })

/**
 * «Cinemática»: la casilla `0` a `5` de la lámina dorada de tres por dos, o las dos piezas
 * sueltas, `copas` y `auto`.
 */
const cinematica = (): OpcionDeIcono[] => [
  ...['Ceremonia', 'Recepción', 'Baile', 'Cena', 'Torta', 'Novios'].map((nombre, casilla) => ({
    clave: String(casilla),
    nombre,
    dibujo: (
      <span
        aria-hidden
        className="block size-10"
        style={{
          backgroundImage: `url(${themeAsset('boda-cin', 'iconos-dorados-sf.avif')})`,
          backgroundSize: '300% 200%',
          backgroundPosition: `${(casilla % 3) * 50}% ${Math.floor(casilla / 3) * 100}%`,
        }}
      />
    ),
  })),
  ...([
    ['copas', 'Brindis', 'copas-black-sf.avif'],
    ['auto', 'Despedida', 'auto-dorado-sf.avif'],
  ] as const).map(([clave, nombre, archivo]) => ({
    clave,
    nombre,
    dibujo: (
      <span
        aria-hidden
        className="block size-10"
        style={{ backgroundImage: `url(${themeAsset('boda-cin', archivo)})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}
      />
    ),
  })),
]

const POR_DISENO: Record<string, () => OpcionDeIcono[]> = {
  xv: () => deXv(PIEL_XV, XV),
  'xv-fantasia': () => deXv(FANTASIA, XV_FANTASIA),
  'xv-mariana': () => deXv(MARIANA, XV_MARIANA),
  'xv-valentina': () => deXv(VALENTINA, XV_VALENTINA),
  'xv-isabelle': botanicos,
  'boda-bot': botanicos,
  'boda-cin': cinematica,
}

/** Los iconos que este diseño sabe pintar en su itinerario, o vacío si no pinta iconos. */
export function iconosDelItinerario(temaKey: string): readonly OpcionDeIcono[] {
  return POR_DISENO[temaKey]?.() ?? []
}
