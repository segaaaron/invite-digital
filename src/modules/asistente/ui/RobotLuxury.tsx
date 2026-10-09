import { useId } from 'react'

/**
 * **Luxury en persona** (8 de octubre, elegido por el usuario: acabado champán). Un personaje con volumen, como los
 * asistentes que mejor se ven hoy: casco de champán, cara de cristal negro con ojos y boca de luz dorada, orejas de
 * auricular, una perla de antena y un cuerpo pequeño que flota sobre su sombra. Parpadea siempre; con `hablando`
 * mueve la boca y saluda. Los colores salen de `tokens.css`; las animaciones, de `globals.css` (`luxury-*`), y todas
 * se quedan quietas con «reducir movimiento».
 */
export function RobotLuxury({ hablando = false, className = '' }: { hablando?: boolean; className?: string }) {
  // Solo letras, cifras y guiones: el id va dentro de `url(#…)` y React lo devuelve con «:» o «»».
  const k = `luxury${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const color = (token: string) => ({ stopColor: `var(--color-${token})` })
  return (
    <svg aria-hidden className={`overflow-visible ${hablando ? 'luxury-hablando' : ''} ${className}`} viewBox="0 0 84 100">
      <defs>
        <radialGradient cx=".32" cy=".25" id={`${k}c`} r=".95">
          <stop offset="0" style={color('champan-brillo')} />
          <stop offset=".55" style={color('champan')} />
          <stop offset="1" style={color('champan-sombra')} />
        </radialGradient>
        <linearGradient id={`${k}o`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" style={color('oro-brillo')} />
          <stop offset=".5" style={color('gold')} />
          <stop offset="1" style={color('oro-sombra')} />
        </linearGradient>
        <linearGradient id={`${k}v`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" style={color('cristal')} />
          <stop offset="1" style={color('cristal-fondo')} />
        </linearGradient>
        <linearGradient id={`${k}b`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" style={color('champan-brillo')} />
          <stop offset="1" style={color('champan')} />
        </linearGradient>
        <filter height="260%" id={`${k}g`} width="260%" x="-80%" y="-80%">
          <feGaussianBlur result="b" stdDeviation="1.6" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <ellipse className="luxury-sombra" cx="42" cy="95" rx="17" ry="3.2" style={{ fill: 'var(--color-ink)' }} />
      <g className="luxury-flota">
        <g transform="rotate(18 22 58)">
          <rect fill={`url(#${k}b)`} height="16" rx="4" stroke={`url(#${k}o)`} strokeWidth=".6" width="8" x="18" y="57" />
        </g>
        <g transform="rotate(-18 62 58)">
          <rect className="luxury-saluda" fill={`url(#${k}b)`} height="16" rx="4" stroke={`url(#${k}o)`} strokeWidth=".6" width="8" x="58" y="57" />
        </g>
        <rect fill={`url(#${k}b)`} height="30" rx="15" width="32" x="26" y="54" />
        <rect fill="none" height="30" rx="15" stroke={`url(#${k}o)`} strokeOpacity=".8" strokeWidth=".8" width="32" x="26" y="54" />
        <path d="M27.5 67 Q42 71 56.5 67" fill="none" stroke={`url(#${k}o)`} strokeWidth="1.4" />
        <path d="M42 72.5 l2.4 2.4 -2.4 2.4 -2.4 -2.4z" fill={`url(#${k}o)`} />
        <rect fill={`url(#${k}v)`} height="6" rx="3" width="12" x="36" y="50" />
        <line stroke={`url(#${k}o)`} strokeLinecap="round" strokeWidth="1.6" x1="42" x2="42" y1="10" y2="4" />
        <circle className="luxury-faro" cx="42" cy="3.4" fill={`url(#${k}o)`} filter={`url(#${k}g)`} r="3" />
        <circle cx="9" cy="32" fill={`url(#${k}o)`} r="7.5" />
        <circle cx="9" cy="32" fill={`url(#${k}c)`} r="4.2" />
        <circle cx="75" cy="32" fill={`url(#${k}o)`} r="7.5" />
        <circle cx="75" cy="32" fill={`url(#${k}c)`} r="4.2" />
        <rect fill={`url(#${k}c)`} height="46" rx="23" width="64" x="10" y="9" />
        <rect fill="none" height="46" rx="23" stroke={`url(#${k}o)`} strokeOpacity=".75" strokeWidth="1" width="64" x="10" y="9" />
        <path d="M19 19 Q27 11.5 40 11.5" fill="none" stroke="white" strokeLinecap="round" strokeOpacity=".55" strokeWidth="2.6" />
        <rect fill={`url(#${k}v)`} height="30" rx="15" width="49" x="17.5" y="18" />
        <rect fill="none" height="30" rx="15" stroke={`url(#${k}o)`} strokeOpacity=".6" strokeWidth=".6" width="49" x="17.5" y="18" />
        <path d="M22 26 Q26 20.5 34 20.5" fill="none" stroke="white" strokeLinecap="round" strokeOpacity=".22" strokeWidth="2" />
        <g filter={`url(#${k}g)`}>
          <rect className="luxury-ojo" fill={`url(#${k}o)`} height="11" rx="3.2" width="6.4" x="30" y="25.5" />
          <rect className="luxury-ojo" fill={`url(#${k}o)`} height="11" rx="3.2" width="6.4" x="47.6" y="25.5" />
          <rect className="luxury-boca" fill={`url(#${k}o)`} height="2.2" rx="1.1" width="7" x="38.5" y="40.5" />
        </g>
      </g>
    </svg>
  )
}

/**
 * **La tarjeta en la que habla Luxury**: marfil con doble filete dorado, firmada «Luxury» en cursiva, que se despliega
 * como una tarjeta de invitación; las perlas doradas la unen a su boca (`perlas`: hacia dónde está el robot).
 */
export function TarjetaDeLuxury({ children, perlas = 'derecha', className = '' }: { children: React.ReactNode; perlas?: 'derecha' | 'izquierda' | null; className?: string }) {
  return (
    <div className={`luxury-tarjeta relative ${className}`}>
      <div className="luxury-tarjeta-caja relative rounded-[4px] bg-tarjeta px-[18px] pt-4 pb-[15px] text-ink">
        <span className="mb-0.5 block font-display text-[15px] font-semibold tracking-[0.02em] text-gold-deep italic">Luxury</span>
        {children}
      </div>
      {perlas === null ? null : (
        <span aria-hidden className={`luxury-perlas absolute bottom-1.5 flex items-center gap-[5px] ${perlas === 'derecha' ? '-right-[30px]' : '-left-[30px] flex-row-reverse'}`}>
          <i className="size-[9px]" />
          <i className="size-1.5" />
          <i className="size-1" />
        </span>
      )}
    </div>
  )
}
