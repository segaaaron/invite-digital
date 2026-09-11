type Props = { readonly color: string; readonly width?: string }

/**
 * El ornamento de «Mascarada»: dos volutas, el abanico de líneas y el ramillete central.
 *
 * No es el filete de «Bajo el Mar» —126×24, dos círculos y una onda—, que es lo que esta
 * piel pintaba: en su maqueta, Mascarada separa la fecha, la tarjeta de regalos y el cierre
 * con este dibujo de 200×30 al 50 % del ancho, con su sombra.
 */
export function AbanicoOrnamental({ color, width = '50%' }: Props) {
  return (
    <svg
      aria-hidden
      style={{ display: 'block', margin: '22px auto', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,.6))' }}
      viewBox="0 0 200 30"
      width={width}
    >
      <g fill="none" stroke={color} strokeWidth="1" transform="translate(14,20)">
        <path d="M0,0 C4,-2.5 6.5,-0.5 5.5,2 C4.5,4.2 1.5,4 0.8,2 C0.2,0.5 1.5,-1 2.8,-0.8" />
      </g>
      <g fill="none" stroke={color} strokeWidth="1" transform="translate(186,20) scale(-1,1)">
        <path d="M0,0 C4,-2.5 6.5,-0.5 5.5,2 C4.5,4.2 1.5,4 0.8,2 C0.2,0.5 1.5,-1 2.8,-0.8" />
      </g>
      <path d="M18,20 Q60,7 100,10.5" fill="none" stroke={color} strokeWidth="1.2" />
      <path d="M18,22.3 Q60,10.5 100,13" fill="none" stroke={color} strokeWidth="1.2" />
      <path d="M182,20 Q140,7 100,10.5" fill="none" stroke={color} strokeWidth="1.2" />
      <path d="M182,22.3 Q140,10.5 100,13" fill="none" stroke={color} strokeWidth="1.2" />
      <g fill="none" stroke={color} strokeWidth="1" transform="translate(100,7)">
        <line strokeWidth="0.8" x1="-6" x2="6" y1="4" y2="4" />
        <path d="M0,-6 L0,3.4" />
        <circle cx="0" cy="-6" fill={color} r="0.7" />
        <path d="M-3.6,-4.6 L-1.6,3" />
        <circle cx="-3.6" cy="-4.6" fill={color} r="0.6" />
        <path d="M3.6,-4.6 L1.6,3" />
        <circle cx="3.6" cy="-4.6" fill={color} r="0.6" />
        <path d="M-5.8,-1.4 L-2.6,3.2" />
        <circle cx="-5.8" cy="-1.4" fill={color} r="0.55" />
        <path d="M5.8,-1.4 L2.6,3.2" />
        <circle cx="5.8" cy="-1.4" fill={color} r="0.55" />
      </g>
    </svg>
  )
}
