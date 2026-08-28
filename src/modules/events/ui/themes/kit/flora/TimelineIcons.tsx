type IconProps = { readonly color: string; readonly size?: number }

/**
 * Los iconos del itinerario botánico: iglesia, sobre, copas, cena, ramo, disco, anillos,
 * cámara y pastel.
 *
 * Son **siluetas macizas de un solo color**, no dibujos con material propio, así que sí
 * viven en el kit: reciben el color por prop y el mismo icono sirve para el verde de la
 * boda botánica y para el dorado del palacio griego. Los blancos son los huecos calados
 * del propio dibujo —el ojo de la cerradura, el brillo del pétalo—, no un color de tema.
 */
const OJAL = 'white'

function Church({ color, size = 36 }: IconProps) {
  return (
    <svg aria-hidden fill={color} height={size} viewBox="0 0 48 48" width={size}>
      <path d="M22 4h4v3h3v3h-3v3l11 9v22H11V22l11-9v-3h-3V7h3V4zm-9 22v18h6v-9q0-3 3-3t3 3v9h2v-9q0-3 3-3t3 3v9h6V26L24 17 13 26z" />
      <circle cx="24" cy="23" fill={OJAL} r="2" />
    </svg>
  )
}

function Envelope({ color, size = 36 }: IconProps) {
  return (
    <svg aria-hidden fill={color} height={size} viewBox="0 0 48 48" width={size}>
      <path d="M4 12h40v26H4V12zm2 4v2l18 13 18-13v-2L24 28 6 16zm0 4v16h36V20L24 32 6 20z" />
      <circle cx="24" cy="32" r="3.5" />
    </svg>
  )
}

function Flutes({ color, size = 36 }: IconProps) {
  return (
    <svg aria-hidden fill={color} height={size} viewBox="0 0 48 48" width={size}>
      <g transform="rotate(-15 17 24)">
        <path d="M12 5h10l-2 16q-.5 4-3 4t-3-4L12 5zm2 2l1.8 14q.3 2 2.2 2t2.2-2L20 7H14z" />
        <path d="M17 25h1v15h4v2H13v-2h4V25z" />
      </g>
      <g transform="rotate(15 31 24)">
        <path d="M26 5h10l-2 16q-.5 4-3 4t-3-4L26 5zm2 2l1.8 14q.3 2 2.2 2t2.2-2L34 7h-6z" />
        <path d="M31 25h1v15h4v2H27v-2h4V25z" />
      </g>
      <path d="M22 11l2-3 2 3-2 2-2-2zm0 0" fill={color} opacity="0.8" />
    </svg>
  )
}

function Dinner({ color, size = 36 }: IconProps) {
  return (
    <svg aria-hidden fill={color} height={size} viewBox="0 0 48 48" width={size}>
      <path
        d="M20 5h2v3l-1 1 1 1v2h-2v-2l-1-1 1-1V5zm6 0h2v3l-1 1 1 1v2h-2v-2l-1-1 1-1V5z"
        opacity="0.55"
      />
      <circle cx="24" cy="14" r="2" />
      <path d="M24 16q-15 0-15 16h30q0-16-15-16zm-13 17h26q-.5-14-13-14T11 33z" />
      <rect height="3" rx="1.5" width="36" x="6" y="33" />
    </svg>
  )
}

function Bouquet({ color, size = 36 }: IconProps) {
  return (
    <svg aria-hidden fill={color} height={size} viewBox="0 0 48 48" width={size}>
      <circle cx="15" cy="14" r="5" />
      <circle cx="33" cy="14" r="5" />
      <circle cx="24" cy="20" r="6" />
      <circle cx="15" cy="14" fill={OJAL} r="1.5" />
      <circle cx="33" cy="14" fill={OJAL} r="1.5" />
      <circle cx="24" cy="20" fill={OJAL} r="2" />
      <path d="M9 17q-3 1-4 4l3 .5q1-2 3-3l-2-1.5zm30 0q3 1 4 4l-3 .5q-1-2-3-3l2-1.5z" opacity="0.55" />
      <path d="M22 27h4v15h-4V27z" />
      <path d="M16 32q-2-2 0-4t6 0v3l-6 1zm16 0q2-2 0-4t-6 0v3l6 1z" />
      <rect height="2" rx="1" width="12" x="18" y="42" />
    </svg>
  )
}

function Disco({ color, size = 36 }: IconProps) {
  return (
    <svg aria-hidden fill={color} height={size} viewBox="0 0 48 48" width={size}>
      <rect height="6" rx="1" width="2" x="23" y="4" />
      <circle cx="24" cy="26" r="14" />
      <circle cx="19" cy="21" fill={OJAL} opacity="0.65" r="2.5" />
      <circle cx="28" cy="20" fill={OJAL} opacity="0.4" r="1.8" />
      <circle cx="30" cy="30" fill={OJAL} opacity="0.3" r="2.2" />
      <path d="M10 26h28M24 12v28" opacity="0.25" stroke={OJAL} strokeWidth="1.2" />
    </svg>
  )
}

function Rings({ color, size = 36 }: IconProps) {
  return (
    <svg aria-hidden fill="none" height={size} stroke={color} strokeWidth="2.2" viewBox="0 0 48 48" width={size}>
      <circle cx="18" cy="28" r="10" />
      <circle cx="30" cy="28" r="10" />
      <polygon fill={color} points="18,10 22,15 18,20 14,15" />
    </svg>
  )
}

function Camera({ color, size = 36 }: IconProps) {
  return (
    <svg aria-hidden fill={color} height={size} viewBox="0 0 48 48" width={size}>
      <path d="M17 9l2-3h10l2 3h8q3 0 3 3v22q0 3-3 3H8q-3 0-3-3V12q0-3 3-3h9zm15 16q0-5-3.5-8.5T20 13q-5 0-8.5 3.5T8 25q0 5 3.5 8.5T20 37q5 0 8.5-3.5T32 25z" />
      <circle cx="20" cy="25" fill={OJAL} r="5.5" />
      <circle cx="20" cy="25" r="2.5" />
      <circle cx="38" cy="14" r="1.5" />
    </svg>
  )
}

function Cake({ color, size = 36 }: IconProps) {
  return (
    <svg aria-hidden fill={color} height={size} viewBox="0 0 48 48" width={size}>
      <path d="M23 4q1-1 1.5 0t0 2l-1 1.5-1-1.5q-.5-1 .5-2z" />
      <rect height="6" width="2" x="23" y="6" />
      <path d="M14 14h20v8H14v-8zm0 10h20v3H14v-3z" opacity="0.85" />
      <path d="M8 25h32v15H8V25zm0 4h32v3H8v-3z" opacity="0.85" />
      <circle cx="19" cy="18" fill={OJAL} r="1.5" />
      <circle cx="24" cy="18" fill={OJAL} r="1.5" />
      <circle cx="29" cy="18" fill={OJAL} r="1.5" />
    </svg>
  )
}

export const TIMELINE_ICONS = {
  church: Church,
  envelope: Envelope,
  flutes: Flutes,
  dinner: Dinner,
  bouquet: Bouquet,
  disco: Disco,
  rings: Rings,
  camera: Camera,
  cake: Cake,
} as const

export type TimelineIconKey = keyof typeof TIMELINE_ICONS

/**
 * El icono de una fila del itinerario, por su clave.
 *
 * Una clave desconocida cae al ramo, no a nada: el contenido lo escribe el atelier desde
 * el panel, y una fila sin icono deja un hueco en la columna que descuadra la línea
 * central de la que cuelgan todos.
 */
export const timelineIcon = (clave: string | undefined) =>
  TIMELINE_ICONS[(clave ?? '') as TimelineIconKey] ?? TIMELINE_ICONS.bouquet
