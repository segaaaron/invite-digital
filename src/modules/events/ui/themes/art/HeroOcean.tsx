type Props = { readonly accent: string }

/**
 * El atardecer sobre el mar de la boda de destino, con su palmera y sus dos olas.
 *
 * Los azules del cielo y del agua son el material de la escena: cambiarlos por el acento
 * del tema convertiría el mar en dorado. Lo que el acento toca es el sol y su halo, que es
 * donde la maqueta lo usa.
 */
export function HeroOcean({ accent }: Props) {
  const id = `ho${accent.replace(/[^a-z0-9]/gi, '')}`

  return (
    <svg aria-hidden className="theme-art" viewBox="0 0 280 180" width="100%">
      <defs>
        <radialGradient cx="0.5" cy="0.5" id={`${id}sun`}>
          <stop offset="0" stopColor="#fff8e0" />
          <stop offset="0.4" stopColor="#ffd49a" />
          <stop offset="0.75" stopColor={accent} />
          <stop offset="1" stopColor="#cc6a3a" />
        </radialGradient>
        <linearGradient id={`${id}water`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1170a3" />
          <stop offset="1" stopColor="#06283d" />
        </linearGradient>
        <linearGradient id={`${id}sky`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#06283d" />
          <stop offset="0.6" stopColor="#1170a3" />
          <stop offset="1" stopColor="#f0a060" />
        </linearGradient>
      </defs>

      <rect fill={`url(#${id}sky)`} height="115" width="280" x="0" y="0" />
      <rect fill={`url(#${id}water)`} height="65" width="280" x="0" y="115" />

      <circle cx="140" cy="100" fill={accent} opacity="0.3" r="60" style={{ animation: 'theme-haloPulse 4s ease-in-out infinite' }} />
      <circle cx="140" cy="98" fill={`url(#${id}sun)`} r="36" style={{ animation: 'theme-sunRise 6s ease-in-out infinite' }} />
      <ellipse cx="140" cy="135" fill="#ffd49a" opacity="0.5" rx="42" ry="10" />

      <g style={{ animation: 'theme-waveScroll 4s ease-in-out infinite' }}>
        <path d="M-20,128 Q40,124 100,130 T220,128 T340,130" fill="none" opacity="0.7" stroke="#fff" strokeWidth="0.8" />
      </g>
      <g style={{ animation: 'theme-waveScroll 5s ease-in-out -1s infinite' }}>
        <path d="M-20,150 Q60,146 120,152 T240,148 T360,152" fill="none" opacity="0.6" stroke="#fff" strokeWidth="1" />
      </g>

      <path d="M-20,165 Q70,162 140,167 T280,167 V180 H-20Z" fill="#06283d" />

      <g transform="translate(40,120)">
        <line stroke="#06283d" strokeWidth="2" x1="0" x2="3" y1="0" y2="-40" />
        <path
          d="M3,-40 Q-12,-44 -18,-32 M3,-40 Q18,-44 24,-32 M3,-40 Q0,-52 -8,-50 M3,-40 Q6,-52 14,-50"
          fill="none"
          stroke="#06283d"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  )
}
