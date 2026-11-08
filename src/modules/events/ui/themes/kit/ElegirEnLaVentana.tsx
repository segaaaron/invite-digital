'use client'

/**
 * «Elegir este diseño» **dentro de la capa de la portada**. El enlace de siempre cargaba la portada entera
 * (`target="_top"`), la dejaba arriba y el diseño no llegaba a ninguna parte (documento del 6 nov, error 4).
 * Ahora le avisa a la portada, que cierra la capa, baja a Precios y deja el diseño en el formulario.
 *
 * Si no hay portada alrededor (el modelo abierto aparte), el enlace funciona como siempre.
 */
export function ElegirEnLaVentana({ href, label, clave }: { readonly href: string; readonly label: string; readonly clave: string }) {
  return (
    <a
      className="theme-phone-cta"
      href={href}
      onClick={(e) => {
        if (window.parent === window) return
        e.preventDefault()
        window.parent.postMessage({ tipo: 'elegir-diseno', clave }, window.location.origin)
      }}
      target="_top"
    >
      {label}
    </a>
  )
}
