import { headers } from 'next/headers'
import { NONCE_HEADER } from '@/shared/config/headers'

/** Lo más que se espera a las imágenes de una portada: pasado esto, se enseña igual (nunca se queda cargando). */
const ESPERA_MAXIMA_MS = 8000

/**
 * Quita la marca de una portada cuando todas sus imágenes han llegado (o fallado), o pasado el tope. Un
 * temporizador sin red: es el tope de la espera, no un sondeo. Las perezosas no se piden mientras la portada las
 * tapa: se piden ya.
 */
const GUION = `(function () {
  function esperar(portada) {
    if (portada.dataset.esperando === '1') return
    portada.dataset.esperando = '1'
    function listo() { portada.removeAttribute('data-cargando'); delete portada.dataset.esperando }
    var pendientes = Array.prototype.filter.call(portada.querySelectorAll('img'), function (img) { return !img.complete })
    if (pendientes.length === 0) return listo()
    var faltan = pendientes.length
    var tope = setTimeout(listo, ${ESPERA_MAXIMA_MS})
    function una() { faltan -= 1; if (faltan > 0) return; clearTimeout(tope); listo() }
    pendientes.forEach(function (img) {
      if (img.loading === 'lazy') img.loading = 'eager'
      img.addEventListener('load', una, { once: true })
      img.addEventListener('error', una, { once: true })
    })
  }
  function revisar() { document.querySelectorAll('[data-portada][data-cargando]').forEach(esperar) }
  revisar()
  new MutationObserver(revisar).observe(document.body, { childList: true, subtree: true })
})()`

/**
 * **La portada aparece entera, no a medias** (29 de septiembre). Cada portada de los diseños llega del servidor
 * con `data-cargando` —se ve su fondo con un indicador, `keyframes.css`— y esto quita la marca cuando sus
 * imágenes han llegado. Vigila también las portadas que aparecen después (la vista previa del panel se vuelve a
 * pintar al guardar). Un solo montaje por página, **al final del `<body>`**.
 *
 * **Es un guion en línea, no un efecto de React** (14 oct): como efecto, la portada esperaba a que bajara y
 * corriera todo el JavaScript de la página aunque sus imágenes ya estuvieran, y en un celular eso eran 6 s más de
 * LCP. En línea corre en cuanto el navegador lee el HTML. Lleva el nonce de la CSP.
 */
export async function PortadasQueEsperan() {
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined
  return <script dangerouslySetInnerHTML={{ __html: GUION }} nonce={nonce} />
}
