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
    <svg
      aria-hidden
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.1}
      viewBox="0 0 48 48"
      width={size * 1.15}
    >
      {/* De línea, como la maqueta: el cuerpo con su visor, el objetivo y el disparador.
          Rellena de color era una mancha oscura en mitad de una tarjeta clara. */}
      <path d="M17 12l2-4h10l2 4h8a3 3 0 013 3v20a3 3 0 01-3 3H9a3 3 0 01-3-3V15a3 3 0 013-3h8z" />
      <circle cx="24" cy="25" r="9" />
      <circle cx="24" cy="25" r="4" />
      <circle cx="38" cy="17" r="1.4" />
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

/**
 * El traje y el vestido del código de vestimenta, y los zapatos con la pajarita del aviso
 * de solo adultos.
 *
 * Estos dos van **de trazo** y no macizos: en la maqueta son dibujos de línea fina, y una
 * silueta rellena a ese tamaño se lee como una mancha.
 */
function Attire({ color, size = 36 }: IconProps) {
  return (
    <svg
      aria-hidden
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.1}
      viewBox="0 0 126 104"
      width={size * 2.4}
    >
      {/* El saco: hombros caídos, solapas en pico hasta el talle, faldón y dos botones. */}
      <path d="M24 14C14 18 9 26 9 36l-2 58h50l-2-58c0-10-5-18-15-22" />
      <path d="M24 14l8 30 8-30" />
      <path d="M24 14l8 30-9 8z" />
      <path d="M40 14l-8 30 9 8z" />
      <path d="M32 44v50" />
      <circle cx="32" cy="58" r="1.5" />
      <circle cx="32" cy="72" r="1.5" />
      {/* El vestido: tirantes finos en pico, escote, talle marcado y falda que se abre. */}
      <path d="M82 14l10 14 10-14" />
      <path d="M82 14c-3 6-5 12-5 19l-1 9-6 52h44l-6-52-1-9c0-7-2-13-5-19" />
      <path d="M76 42h32" />
    </svg>
  )
}

/**
 * Un zapato de tacón de perfil, mirando a la derecha.
 *
 * Tres trazos abiertos y no una silueta cerrada: cerrada, la curva de la suela y la del
 * empeine se juntaban en el talón y el dibujo se leía como una tumbona.
 */
function ZapatoDeTacon() {
  return (
    <>
      {/* Empeine y caña. */}
      <path d="M8 48c14 0 26-6 34-16l8-11c2-3 5-5 9-5h5" />
      {/* Suela. */}
      <path d="M8 48c0-5 4-8 10-9l20-5c8-2 14-7 17-14" />
      {/* Talón y tacón. */}
      <path d="M64 16v7c0 5-2 9-5 12" />
      <path d="M58 36l3 14" />
      <path d="M57 50h8" />
    </>
  )
}

function Heels({ color, size = 36 }: IconProps) {
  return (
    <svg
      aria-hidden
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1}
      viewBox="0 0 172 66"
      width={size * 2.5}
    >
      {/* El par: uno detrás del otro, como en el diseño. */}
      <g opacity="0.85" transform="translate(16 -4) scale(0.86)">
        <ZapatoDeTacon />
      </g>
      <g transform="translate(0 8)">
        <ZapatoDeTacon />
      </g>
      {/* La pajarita. */}
      <path d="M124 33 108 22v22l16-11z" />
      <path d="M136 33l16-11v22l-16-11z" />
      <rect height="13" rx="3" width="12" x="124" y="26.5" />
    </svg>
  )
}

export const TIMELINE_ICONS = {
  attire: Attire,
  heels: Heels,
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
