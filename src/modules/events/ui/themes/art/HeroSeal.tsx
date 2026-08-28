type Props = {
  readonly accent: string
  /** El monograma que va lacrado. Del contenido del evento. */
  readonly monogram: string
  /** El rótulo curvo sobre el monograma, del diccionario. */
  readonly label: string
}

/**
 * El sello de lacre de la boda civil, que cae y ondula.
 *
 * Los tonos del lacre —el violeta claro del brillo, el oscuro del borde grabado— son el
 * material del sello, no la paleta del tema, igual que el oro de los anillos.
 */
export function HeroSeal({ accent, monogram, label }: Props) {
  const id = `hs${accent.replace(/[^a-z0-9]/gi, '')}`

  return (
    <svg aria-hidden className="theme-art" viewBox="0 0 280 180" width="100%">
      <defs>
        <radialGradient cx="0.35" cy="0.3" id={`${id}wax`}>
          <stop offset="0" stopColor="#b89eff" />
          <stop offset="0.55" stopColor={accent} />
          <stop offset="1" stopColor="#3a1f8f" />
        </radialGradient>
        <radialGradient cx="0.5" cy="0.5" id={`${id}shadow`}>
          <stop offset="0" stopColor="#000" stopOpacity="0.4" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="140" cy="140" fill={`url(#${id}shadow)`} rx="55" ry="6" />
      <circle cx="140" cy="90" fill={accent} opacity="0.15" r="48" style={{ animation: 'theme-stampWave 3s ease-in-out infinite' }} />
      <circle
        cx="140"
        cy="90"
        fill="none"
        opacity="0.4"
        r="60"
        stroke={accent}
        strokeWidth="0.5"
        style={{ animation: 'theme-stampWave 3s ease-in-out 0.5s infinite' }}
      />

      <g style={{ transformOrigin: '140px 90px', animation: 'theme-stampDown 3s ease-in-out infinite' }}>
        <path
          d="M140,52 Q150,50 158,56 Q172,58 174,72 Q180,80 174,90 Q180,100 172,108 Q170,122 156,124 Q148,130 140,128 Q132,130 124,124 Q110,122 108,108 Q100,100 106,90 Q100,80 106,72 Q108,58 122,56 Q130,50 140,52Z"
          fill={`url(#${id}wax)`}
          stroke="#2a1062"
          strokeWidth="1"
        />
        <ellipse cx="125" cy="72" fill="#fff" opacity="0.25" rx="14" ry="8" />
        <circle cx="140" cy="90" fill="none" opacity="0.5" r="26" stroke="#2a1062" strokeWidth="1" />
        <circle cx="140" cy="90" fill="none" opacity="0.4" r="26" stroke="#fff" strokeWidth="0.5" />
        <text
          fill="#fff"
          fontFamily="var(--font-spectral)"
          fontSize="34"
          fontStyle="italic"
          fontWeight="300"
          textAnchor="middle"
          x="140"
          y="100"
        >
          {monogram}
        </text>
        <text
          fill="#fff"
          fontFamily="var(--font-jetbrains-mono)"
          fontSize="7"
          letterSpacing="2"
          opacity="0.85"
          textAnchor="middle"
          x="140"
          y="73"
        >
          {label}
        </text>
      </g>
    </svg>
  )
}
