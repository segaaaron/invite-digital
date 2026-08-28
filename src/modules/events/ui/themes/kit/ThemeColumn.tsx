import type { CSSProperties, ReactNode } from 'react'

/**
 * La columna en la que se compone la invitación.
 *
 * Estos dieciséis diseños están dibujados como una columna de teléfono —la maqueta los
 * enseña dentro de un marco de unos 420 puntos— y sus tamaños están elegidos para ese
 * ancho: un nombre de 56 píxeles y una rejilla de dos columnas para la ceremonia y la
 * recepción. Sin tope, en un portátil se despliegan a 1900 píxeles y el diseño se
 * deshace: los dos bloques quedan a un palmo el uno del otro y la caligrafía se lee como
 * un cartel.
 *
 * El tope va **en el contenido, no en el `<article>`**, para que los fondos —el degradado,
 * los pétalos, el cielo estrellado— sigan ocupando la pantalla entera. Es lo que hace la
 * maqueta con su marco.
 */
export function ThemeColumn({ children, style }: { readonly children: ReactNode; readonly style?: CSSProperties }) {
  return (
    <div style={{ position: 'relative', maxWidth: 480, marginInline: 'auto', ...style }}>{children}</div>
  )
}
