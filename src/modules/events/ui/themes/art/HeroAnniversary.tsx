type Props = {
  readonly accent: string
  /** Los años que se celebran. Del contenido, no del código: no toda boda de oro son 50. */
  readonly years: string
}

/**
 * El sol dorado del aniversario, con sus rayos girando.
 *
 * Los veintidós rayos alternan largo y grosor, como en la maqueta: con todos iguales el
 * disco se lee como un engranaje.
 */
export function HeroAnniversary({ accent, years }: Props) {
  const id = `ha${accent.replace(/[^a-z0-9]/gi, '')}`

  return (
    <svg aria-hidden className="theme-art" viewBox="0 0 280 180" width="100%">
      <defs>
        <radialGradient cx="0.5" cy="0.5" id={`${id}sun`}>
          <stop offset="0" stopColor="#fff8de" />
          <stop offset="0.4" stopColor="#fbeaa8" />
          <stop offset="0.75" stopColor={accent} />
          <stop offset="1" stopColor="#8a5e1c" />
        </radialGradient>
        <radialGradient cx="0.5" cy="0.5" id={`${id}glow`}>
          <stop offset="0" stopColor={accent} stopOpacity="0.5" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="140" cy="90" fill={`url(#${id}glow)`} r="80" style={{ animation: 'theme-haloPulse 3s ease-in-out infinite' }} />

      <g style={{ transformOrigin: '140px 90px', animation: 'theme-spinSlow 30s linear infinite' }}>
        {Array.from({ length: 22 }, (_, indice) => {
          const angulo = (indice / 22) * Math.PI * 2
          const largo = indice % 2 === 0
          const r1 = largo ? 44 : 38
          const r2 = largo ? 82 : 70
          return (
            <line
              key={indice}
              opacity={largo ? 0.7 : 0.45}
              stroke={accent}
              strokeWidth={largo ? 1.5 : 0.8}
              x1={140 + r1 * Math.cos(angulo)}
              x2={140 + r2 * Math.cos(angulo)}
              y1={90 + r1 * Math.sin(angulo)}
              y2={90 + r2 * Math.sin(angulo)}
            />
          )
        })}
      </g>

      <circle cx="140" cy="90" fill={`url(#${id}sun)`} r="40" stroke="#8a5e1c" strokeWidth="1" />
      <ellipse cx="128" cy="78" fill="#fff" opacity="0.5" rx="14" ry="9" />
      <text
        fill="#3a1f0a"
        fontFamily="var(--font-cormorant)"
        fontSize="42"
        fontStyle="italic"
        fontWeight="400"
        textAnchor="middle"
        x="140"
        y="102"
      >
        {years}
      </text>
    </svg>
  )
}
