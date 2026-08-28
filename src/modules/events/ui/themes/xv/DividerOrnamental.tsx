type Props = { readonly color: string }

/**
 * El filete ornamental que varios diseños de XV ponen encima y debajo de la fecha.
 *
 * Vive con los XV y no en el kit porque solo lo usan ellos: subirlo al kit sería una pieza
 * más que mantener para nueve temas que no la llaman.
 */
export function DividerOrnamental({ color }: Props) {
  return (
    <svg aria-hidden height="24" style={{ display: 'block', margin: '0 auto' }} viewBox="0 0 126 24" width="126">
      <path d="M4 12 H45 M81 12 H122" stroke={color} strokeWidth="1" />
      <path d="M45 12 C50 4, 58 4, 63 12 C68 4, 76 4, 81 12" fill="none" stroke={color} strokeWidth="1.2" />
      <circle cx="14" cy="12" fill="none" r="2.3" stroke={color} strokeWidth="1" />
      <circle cx="112" cy="12" fill="none" r="2.3" stroke={color} strokeWidth="1" />
    </svg>
  )
}
