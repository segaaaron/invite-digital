/**
 * La torta de tres pisos de «Gala Real», con su vela.
 *
 * Es el único icono de ese itinerario que su maqueta **dibuja** en vez de traer como
 * imagen (`ChromeIcon3D`, rama `cake3d`, `invites-1.jsx:2214-2220`): los otros cuatro —el
 * sobre, el menú, la pareja bailando y el coche— son PNG de plata que sí están en
 * `public/temas/xv-mariana/`. Por eso faltaba: no había fichero que importar, y la fila de
 * la torta se quedó fuera del itinerario entero.
 *
 * Los dos degradados son los de `ChromeIcon3D`: `c1` en diagonal —blanco, plata, gris
 * hondo— para los pisos primero y tercero, y `c2` vertical y más suave para el del medio,
 * que es lo que da el escalón de luz entre pisos.
 */
export function TortaDePlata({ size = 54 }: { readonly size?: number }) {
  return (
    <svg aria-hidden fill="none" height={size} viewBox="0 0 46 46" width={size}>
      <defs>
        <linearGradient id="torta-plata-1" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#C0C6CD" />
          <stop offset="100%" stopColor="#6E7580" />
        </linearGradient>
        <linearGradient id="torta-plata-2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#B8BFC7" />
        </linearGradient>
      </defs>
      <rect fill="url(#torta-plata-1)" height="9" rx="2" width="30" x="8" y="26" />
      <rect fill="url(#torta-plata-2)" height="9" rx="2" stroke="#8B929B" strokeWidth="0.5" width="24" x="11" y="18" />
      <rect fill="url(#torta-plata-1)" height="8" rx="2" width="16" x="15" y="11" />
      <rect fill="#B8BFC7" height="6" width="2" x="22" y="5" />
      <path d="M20 5c0-2 3-2 3 0s3 2 3 0" fill="none" stroke="#E4E7EB" strokeLinecap="round" strokeWidth="1" />
    </svg>
  )
}
