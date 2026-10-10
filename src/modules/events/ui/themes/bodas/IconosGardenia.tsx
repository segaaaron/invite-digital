import type { ReactNode } from 'react'

/**
 * Los seis dibujos de línea del itinerario de «Gardenia», copiados trazo a trazo de la maqueta V5
 * (`ItinIcon*` de `wedding-variants-2.jsx`): iglesia, copa, brindis, cena, ramo y fiesta. Un solo
 * color (`color`), trazo fino, sin relleno.
 */
const DIBUJOS: Record<string, (c: string) => ReactNode> = {
  church: () => (
    <>
      <path d="M24 2 L24 8" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M21.5 4 L26.5 4" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M24 8 L18 14 L18 20 L30 20 L30 14 Z" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="24" cy="16.5" r="2.6" strokeWidth="1" />
      <path d="M24 13.9 L24 19.1 M21.4 16.5 L26.6 16.5" strokeWidth="0.7" />
      <path d="M12 44 L12 20 L36 20 L36 44 Z" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M21 44 L21 33 L27 33 L27 44" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M15.5 27 L18.5 27 L18.5 31 L15.5 31 Z M29.5 27 L32.5 27 L32.5 31 L29.5 31 Z" strokeWidth="1" />
      <path d="M10 44 L38 44" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  coupe: (c) => (
    <>
      <path d="M18 4 L20 26 C20 30 28 30 28 26 L30 4 Z" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M19.2 8 L28.8 8 M19.7 12 L28.3 12" strokeWidth="0.8" opacity="0.7" />
      <circle cx="23" cy="16" r="0.7" fill={c} stroke="none" />
      <circle cx="25.5" cy="20" r="0.6" fill={c} stroke="none" />
      <circle cx="22.5" cy="22" r="0.5" fill={c} stroke="none" />
      <path d="M24 28 L24 40" strokeWidth="1.3" />
      <path d="M15 44 L33 44" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M24 40 C20 40 18 42 17.5 44 M24 40 C28 40 30 42 30.5 44" strokeWidth="1.1" />
    </>
  ),
  toast: (c) => (
    <>
      <g transform="rotate(-22 15 18)">
        <path d="M8 4 C8 13 15 16 15 16 C15 16 22 13 22 4 Z" strokeWidth="1.3" strokeLinejoin="round" />
        <circle cx="13" cy="9" r="0.6" fill={c} stroke="none" />
        <circle cx="16" cy="11.5" r="0.5" fill={c} stroke="none" />
        <path d="M15 16 L15 32" strokeWidth="1.3" />
      </g>
      <g transform="rotate(22 33 18)">
        <path d="M26 4 C26 13 33 16 33 16 C33 16 40 13 40 4 Z" strokeWidth="1.3" strokeLinejoin="round" />
        <circle cx="31" cy="9" r="0.6" fill={c} stroke="none" />
        <circle cx="35" cy="12" r="0.5" fill={c} stroke="none" />
        <path d="M33 16 L33 32" strokeWidth="1.3" />
      </g>
      <path d="M10 42 L20 42 M28 42 L38 42" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M20 26 L22 28 M28 26 L26 28" strokeWidth="1" strokeLinecap="round" />
    </>
  ),
  dinner: () => (
    <>
      <circle cx="24" cy="24" r="15.5" strokeWidth="1.3" />
      <circle cx="24" cy="24" r="12.5" strokeWidth="0.7" strokeDasharray="1.5 2.4" />
      <circle cx="24" cy="24" r="6.5" strokeWidth="1" />
      <path d="M8 6 L8 17 M5.5 6 L5.5 13.5 M10.5 6 L10.5 13.5 M5.5 13.5 C5.5 16 8 16 8 17 L8 30" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M41 6 C36.5 6 36.5 11 36.5 13 L36.5 30" strokeWidth="1.1" strokeLinecap="round" />
    </>
  ),
  bouquet: () => (
    <>
      <path d="M24 26 L24 36" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M24 26 L17 36 M24 26 L31 36" strokeWidth="1" strokeLinecap="round" />
      <g strokeWidth="1.1">
        <circle cx="24" cy="13" r="5.2" />
        <circle cx="24" cy="13" r="2" strokeWidth="0.7" />
        <circle cx="14.5" cy="18" r="4.4" />
        <circle cx="14.5" cy="18" r="1.6" strokeWidth="0.7" />
        <circle cx="33.5" cy="18" r="4.4" />
        <circle cx="33.5" cy="18" r="1.6" strokeWidth="0.7" />
      </g>
      <path d="M17 24 C13 25 12 22 13.5 20 M31 24 C35 25 36 22 34.5 20" strokeWidth="1" />
      <path d="M24 36 C20 37 19 41 21 43 C22 41 22.5 39 24 38 C25.5 39 26 41 27 43 C29 41 28 37 24 36 Z" strokeWidth="1.1" strokeLinejoin="round" />
    </>
  ),
  party: () => (
    <>
      <path d="M16 34 L16 12 L30 9 L30 30" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12.5" cy="34" r="3.5" strokeWidth="1.2" />
      <circle cx="26.5" cy="30" r="3.5" strokeWidth="1.2" />
      <path d="M16 12 L30 9" strokeWidth="1.2" />
      <path d="M38 14 L38 18 M36 16 L40 16 M9 8 L9 11.5 M7.2 9.7 L10.8 9.7 M39 26 L39 28.5 M37.7 27.2 L40.3 27.2" strokeWidth="1" strokeLinecap="round" />
    </>
  ),
}

/**
 * Las claves que el editor ofrece para este diseño (las del kit floral) caen en el dibujo de la
 * maqueta que les corresponde; una clave desconocida, en el ramo.
 */
const EQUIVALENCIA: Record<string, string> = {
  church: 'church',
  envelope: 'coupe',
  flutes: 'toast',
  dinner: 'dinner',
  bouquet: 'bouquet',
  disco: 'party',
  rings: 'church',
  cake: 'dinner',
  camera: 'party',
  attire: 'bouquet',
  heels: 'party',
}

export function IconoGardenia({ clave, color, size = 52 }: { readonly clave: string | undefined; readonly color: string; readonly size?: number }) {
  const dibujo = DIBUJOS[EQUIVALENCIA[clave ?? ''] ?? 'bouquet'] ?? DIBUJOS.bouquet!
  return (
    <svg aria-hidden fill="none" height={size} stroke={color} viewBox="0 0 48 48" width={size}>
      {dibujo(color)}
    </svg>
  )
}
