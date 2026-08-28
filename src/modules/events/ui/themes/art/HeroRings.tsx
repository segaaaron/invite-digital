type Props = {
  /** El oro de este diseño. Los demás tonos son el material, no el tema. */
  readonly accent: string
}

/**
 * Los dos anillos con su brillante, cabecera de cuatro diseños de boda.
 *
 * Vive en `art/` y no en `kit/`: los tonos del degradado de oro y del diamante son **el
 * material del dibujo**, no la paleta del tema —el mismo oro con un acento verde sigue
 * siendo oro—. Es la excepción que `CLAUDE.md` ya reconoce para los materiales de una
 * escena. Lo que sí entra por prop es el acento, que es lo que cambia entre diseños.
 *
 * Los identificadores de los degradados llevan el acento dentro: si dos ilustraciones
 * coincidieran en una página, con un `id` fijo la segunda pintaría con los degradados de
 * la primera.
 */
export function HeroRings({ accent }: Props) {
  const id = `hr${accent.replace(/[^a-z0-9]/gi, '')}`

  return (
    <svg aria-hidden className="theme-art" style={{ overflow: 'visible' }} viewBox="0 0 280 180" width="100%">
      <defs>
        <linearGradient id={`${id}gold`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff5cc" />
          <stop offset="0.25" stopColor="#f7d579" />
          <stop offset="0.5" stopColor={accent} />
          <stop offset="0.78" stopColor="#8c6432" />
          <stop offset="1" stopColor="#f4d894" />
        </linearGradient>
        <radialGradient cx="0.35" cy="0.3" id={`${id}diamond`}>
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.5" stopColor="#e8f4ff" />
          <stop offset="1" stopColor="#9ab4d4" />
        </radialGradient>
        <radialGradient cx="0.5" cy="0.5" id={`${id}shadow`}>
          <stop offset="0" stopColor="#000" stopOpacity="0.4" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="140" cy="160" fill={`url(#${id}shadow)`} rx="80" ry="6" />

      <g style={{ transformOrigin: '165px 90px', animation: 'theme-ringTilt2 6s ease-in-out infinite' }}>
        <ellipse cx="165" cy="90" fill="none" rx="46" ry="44" stroke={`url(#${id}gold)`} strokeWidth="7" />
        <ellipse cx="165" cy="90" fill="none" opacity="0.5" rx="42" ry="40" stroke="#5a3a18" strokeWidth="1.5" />
        <path d="M125,75 Q165,55 205,75" fill="none" opacity="0.85" stroke="#fff8d6" strokeLinecap="round" strokeWidth="2.5" />
      </g>

      <g style={{ transformOrigin: '115px 90px', animation: 'theme-ringTilt 6s ease-in-out infinite' }}>
        <ellipse cx="115" cy="90" fill="none" rx="46" ry="44" stroke={`url(#${id}gold)`} strokeWidth="7" />
        <ellipse cx="115" cy="90" fill="none" opacity="0.5" rx="42" ry="40" stroke="#5a3a18" strokeWidth="1.5" />
        <path d="M75,75 Q115,55 155,75" fill="none" opacity="0.9" stroke="#fff8d6" strokeLinecap="round" strokeWidth="2.5" />
        <polygon fill={`url(#${id}diamond)`} points="115,42 122,52 115,64 108,52" stroke="#7a90b0" strokeWidth="0.6" />
        <polygon fill="#fff" opacity="0.7" points="115,42 122,52 115,52 108,52" />
        <line stroke={accent} strokeWidth="1.5" x1="108" x2="106" y1="52" y2="58" />
        <line stroke={accent} strokeWidth="1.5" x1="122" x2="124" y1="52" y2="58" />
      </g>

      <text fill="#fff" fontSize="14" opacity="0.9" style={{ animation: 'theme-sparkleFade 2s ease-in-out infinite' }} x="60" y="40">
        ✦
      </text>
      <text fill="#fff" fontSize="12" opacity="0.9" style={{ animation: 'theme-sparkleFade 2s ease-in-out 0.6s infinite' }} x="220" y="50">
        ✦
      </text>
    </svg>
  )
}
