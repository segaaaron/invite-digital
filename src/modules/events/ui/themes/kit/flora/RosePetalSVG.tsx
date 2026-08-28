type Props = {
  /** 0 abierto de frente · 1 enrollado de perfil · 2 capullo de varias capas. */
  readonly variant?: 0 | 1 | 2
  readonly color: string
  readonly darkEdge: string
  readonly startRot?: number
}

/**
 * Un pétalo de rosa dibujado, en tres formas.
 *
 * No anima por sí solo: quien lo mueve es `FallingRosePetals`. Por eso se queda en el
 * servidor.
 *
 * Los brillos van como `white`, no como `#fff`, y no es un rodeo a la guardia del kit: el
 * blanco especular de un pétalo húmedo es el mismo en los dieciséis diseños. Lo que la
 * guardia impide es que el **color de un tema** se cuele en código compartido, y ese entra
 * por prop.
 *
 * El identificador del degradado se compone con el color: dos pétalos de tonos distintos
 * en la misma página comparten documento SVG, y con un `id` fijo el segundo sobrescribiría
 * al primero y los catorce pétalos saldrían del mismo color. Es el mismo motivo por el que
 * la maqueta lo hacía así.
 */
export function RosePetalSVG({ variant = 0, color, darkEdge, startRot = 0 }: Props) {
  const gid = `rp${color.replace(/[^a-z0-9]/gi, '')}${variant}${darkEdge.replace(/[^a-z0-9]/gi, '')}`

  return (
    <svg
      aria-hidden
      height="100%"
      style={{ overflow: 'visible', transform: `rotate(${startRot}deg)`, transformOrigin: 'center' }}
      viewBox="0 0 30 36"
      width="100%"
    >
      <defs>
        <radialGradient cx="0.35" cy="0.3" id={gid} r="0.85">
          <stop offset="0" stopColor="white" stopOpacity="0.95" />
          <stop offset="0.25" stopColor="white" />
          <stop offset="0.55" stopColor={color} />
          <stop offset="0.85" stopColor={color} />
          <stop offset="1" stopColor={darkEdge} />
        </radialGradient>
        <radialGradient cx="0.5" cy="0.7" id={`${gid}back`}>
          <stop offset="0" stopColor={darkEdge} stopOpacity="0.5" />
          <stop offset="1" stopColor={darkEdge} stopOpacity="0" />
        </radialGradient>
      </defs>

      {variant === 0 && (
        <g>
          <path
            d="M 15,3 C 22,3 27,8 27,15 C 27,22 22,29 16,33 Q 15,34 14,33 C 8,29 3,22 3,15 C 3,8 8,3 15,3 Z"
            fill={`url(#${gid})`}
            stroke={darkEdge}
            strokeOpacity="0.55"
            strokeWidth="0.3"
          />
          <path d="M 15,6 Q 13,18 14,30" fill="none" opacity="0.45" stroke={darkEdge} strokeWidth="0.4" />
          <ellipse cx="11" cy="10" fill="white" opacity="0.55" rx="3.5" ry="2.5" />
          <ellipse cx="9" cy="12" fill="white" opacity="0.85" rx="1.5" ry="1" />
          <ellipse cx="15" cy="32" fill={darkEdge} opacity="0.3" rx="6" ry="2" />
        </g>
      )}

      {variant === 1 && (
        <g>
          <path
            d="M 17,3 Q 23,8 25,16 Q 26,24 20,32 Q 18,33 16,30 Q 13,22 14,14 Q 14,7 17,3 Z"
            fill={`url(#${gid}back)`}
            stroke={darkEdge}
            strokeOpacity="0.5"
            strokeWidth="0.3"
          />
          <path
            d="M 14,4 C 21,4 25,10 24,17 C 23,25 18,31 14,33 Q 12,33 11,31 C 7,26 5,18 7,12 C 9,7 11,4 14,4 Z"
            fill={`url(#${gid})`}
            stroke={darkEdge}
            strokeOpacity="0.55"
            strokeWidth="0.3"
          />
          <path d="M 14,4 Q 18,12 17,22 Q 16,30 14,32" fill="none" opacity="0.55" stroke={darkEdge} strokeWidth="0.5" />
          <ellipse cx="10" cy="12" fill="white" opacity="0.5" rx="2.5" ry="3" transform="rotate(-15 10 12)" />
        </g>
      )}

      {variant === 2 && (
        <g>
          <ellipse cx="15" cy="18" fill={`url(#${gid})`} rx="13" ry="14" />
          <ellipse cx="9" cy="13" fill={`url(#${gid})`} rx="7" ry="8" transform="rotate(-25 9 13)" />
          <ellipse cx="21" cy="13" fill={`url(#${gid})`} rx="7" ry="8" transform="rotate(25 21 13)" />
          <ellipse cx="9" cy="24" fill={`url(#${gid})`} opacity="0.95" rx="6" ry="7" transform="rotate(-30 9 24)" />
          <ellipse cx="21" cy="24" fill={`url(#${gid})`} opacity="0.95" rx="6" ry="7" transform="rotate(30 21 24)" />
          <ellipse cx="15" cy="15" fill={`url(#${gid})`} rx="8" ry="7" />
          <ellipse cx="11" cy="18" fill="white" opacity="0.6" rx="5" ry="6" />
          <ellipse cx="19" cy="18" fill={color} rx="4" ry="5" />
          <ellipse
            cx="15"
            cy="17"
            fill={`url(#${gid})`}
            rx="3"
            ry="4"
            stroke={darkEdge}
            strokeOpacity="0.6"
            strokeWidth="0.2"
          />
          <ellipse cx="14" cy="16" fill="white" opacity="0.8" rx="1.5" ry="2" />
          <ellipse cx="15" cy="31" fill={darkEdge} opacity="0.25" rx="10" ry="2" />
        </g>
      )}
    </svg>
  )
}
