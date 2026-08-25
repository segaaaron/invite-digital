import localFont from 'next/font/local'

export const display = localFont({
  variable: '--font-display-raw',
  display: 'swap',
  src: [
    { path: '../../../public/fonts/cormorant-garamond-300.woff2', weight: '300', style: 'normal' },
    { path: '../../../public/fonts/cormorant-garamond-400.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/cormorant-garamond-500.woff2', weight: '500', style: 'normal' },
    { path: '../../../public/fonts/cormorant-garamond-600.woff2', weight: '600', style: 'normal' },
  ],
})

export const sans = localFont({
  variable: '--font-sans-raw',
  display: 'swap',
  src: [
    { path: '../../../public/fonts/jost-200.woff2', weight: '200', style: 'normal' },
    { path: '../../../public/fonts/jost-300.woff2', weight: '300', style: 'normal' },
    { path: '../../../public/fonts/jost-400.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/jost-500.woff2', weight: '500', style: 'normal' },
  ],
})

/**
 * Las dos tipografías del **panel**, que son las de `docs/design-reference/dashboard/`:
 * Space Grotesk para el texto y JetBrains Mono para cifras y rótulos.
 *
 * No alcanzan a la web pública ni a la invitación: la maqueta Ivory usa Jost, y son dos
 * piezas distintas del mismo atelier. Por eso `panelSans` reutiliza el mismo nombre de
 * variable que `sans` —solo cambia quién la define, y la define el layout del panel—.
 *
 * Los dos ficheros son **variables**: Google sirve un único woff2 por familia que cubre
 * todo el rango de pesos, así que bajar cuatro pesos descargaba cuatro veces el mismo
 * archivo.
 */
export const panelSans = localFont({
  variable: '--font-sans-raw',
  display: 'swap',
  src: [{ path: '../../../public/fonts/space-grotesk-variable.woff2', weight: '300 700', style: 'normal' }],
})

export const panelMono = localFont({
  variable: '--font-mono-raw',
  display: 'swap',
  src: [{ path: '../../../public/fonts/jetbrains-mono-variable.woff2', weight: '300 600', style: 'normal' }],
})
