import { FallingRosePetals } from '../flora/FallingRosePetals'

type Props = {
  /** Los cinco tonos del degradado de fondo, en orden. */
  readonly palette: readonly string[]
  readonly petalColors: readonly string[]
  readonly petalEdges: readonly [string, string]
  /** Los dos tonos de los halos. Sin ellos se usan los del degradado, como en la maqueta. */
  readonly glowColors?: readonly string[]
  readonly intensity?: number
  readonly petals?: number
  /** En los diseños oscuros los halos van en `screen`: en `normal` los apagaría el fondo. */
  readonly dark?: boolean
}

/**
 * El fondo de los ocho diseños de boda: degradado que se desplaza, dos halos que laten y
 * la lluvia de pétalos.
 *
 * Las dos capas van en `sticky` con `marginBottom: -100vh`, como en la maqueta. No es un
 * truco: ancla el fondo a la ventana para que **no se repinte al desplazarse**. Con un
 * degradado de 300 % animado, repintarlo en cada fotograma de scroll es lo que convierte
 * estas invitaciones en un tirón continuo en un teléfono de gama media, que es en lo que
 * se abren.
 *
 * No lleva `'use client'`: son dos divs y una animación de CSS. Quien sí lo lleva es la
 * capa de pétalos, que decide según la preferencia de movimiento.
 */
export function WeddingMagicBg({
  palette,
  petalColors,
  petalEdges,
  glowColors,
  intensity = 0.55,
  petals = 14,
  dark = false,
}: Props) {
  const degradado = `linear-gradient(135deg, ${palette.join(', ')})`
  const halos = glowColors ?? palette
  const halo1 = halos[1] ?? palette[1] ?? 'transparent'
  const halo2 = halos[2] ?? palette[2] ?? 'transparent'
  const base = palette[0] ?? 'transparent'

  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          height: '100vh',
          marginBottom: '-100vh',
          background: degradado,
          backgroundSize: '300% 300%',
          animation: 'theme-wedGradientShift 22s ease-in-out infinite',
          opacity: intensity,
          zIndex: 0,
          pointerEvents: 'none',
          willChange: 'background-position',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          height: '100vh',
          marginBottom: '-100vh',
          background: `radial-gradient(ellipse 60% 40% at 20% 10%, ${halo1}88, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 70%, ${halo2}77, transparent 60%), radial-gradient(ellipse 40% 30% at 50% 95%, ${base}55, transparent 60%)`,
          animation: 'theme-wedGlowPulse 8s ease-in-out infinite',
          mixBlendMode: dark ? 'screen' : 'normal',
          zIndex: 0,
          pointerEvents: 'none',
          willChange: 'opacity, transform',
        }}
      />
      <FallingRosePetals count={petals} darkEdges={petalEdges} palette={petalColors} />
    </>
  )
}
