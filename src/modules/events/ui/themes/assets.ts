/**
 * Las imágenes que trae cada diseño.
 *
 * Son **el aspecto del tema**, como un SVG del kit: viven versionadas en `public/temas/`,
 * no en el almacén de medios del evento, que es para lo que sube el atelier. Vienen de la
 * maqueta, con el nombre normalizado y reencodeadas a AVIF —de 148 MB a 6,6 MB—; lo hacen
 * `scripts/import-theme-assets.ts` y `scripts/optimize-theme-assets.ts`.
 *
 * El manifiesto está aquí y no se descubre leyendo el disco a propósito: así una imagen
 * que se renombra o se pierde rompe una prueba, y no una invitación abierta el día de la
 * boda. Cinco diseños de boda no aparecen porque no usan ninguna: son SVG y CSS.
 *
 * **Una imagen que cambia de contenido cambia de nombre.** Estas se sirven por el
 * optimizador de Next, que las cachea por su dirección y durante mucho tiempo: reescribir
 * el archivo dejando el mismo nombre no llega a quien ya la tenía —ni a su navegador, ni a
 * la caché del contenedor—, y la invitación sigue enseñando la de antes sin que nada falle.
 * Pasó al quitarle el nombre rotulado a la portada del cumpleaños: en producción estaba la
 * nueva y en el navegador seguía la vieja, con los dos nombres encima.
 */
export const THEME_ASSETS = {
  'cumple-beer': [
    'cerveza-pastel.avif',
    'karaoke-beer.avif',
    'portada-medallon.avif',
    'reloj-beer.avif',
  ],
  'boda-bot': [
    'boda-01-pareja.avif',
    // La portada de la maqueta (`wedding-variants-2.jsx`): el sobre lacrado sobre las rosas.
    'portada-rosas.avif',
    'boda-02-arreglo.avif',
    'boda-03-anillos.avif',
    'boda-04-pastel.avif',
    'marmol-flores-optimized.avif',
    'taco-gato-sf.avif',
    'trajes-dorados-sf.avif',
    'wedding-couple.avif',
  ],
  esencia: [
    'portada-lino.avif',
    'pareja-1.avif',
    'pareja-2.avif',
    'pareja-3.avif',
    'pareja-4.avif',
    'pareja-5.avif',
  ],
  'boda-cin': ['portada-negra-dorada.avif'],
  'boda-royal': [
    'portada-royal.avif',
    'pareja-1.avif',
    'pareja-2.avif',
    'pareja-3.avif',
    'pareja-4.avif',
    'pareja-5.avif',
    'anillos.avif',
    'reloj.avif',
    'iglesia.avif',
    'mesero.avif',
    'vals.avif',
    'cena.avif',
    'torta.avif',
    'despedida.avif',
    'vestimenta.avif',
    'tacon-y-corbata.avif',
    'regalo.avif',
    'camara.avif',
  ],
  'boda-serenidad': [
    'portada-flores.avif',
    'pareja-1.avif',
    'pareja-2.avif',
    'pareja-3.avif',
    'pareja-4.avif',
    'pareja-5.avif',
    'pareja-6.avif',
    'reloj.avif',
    'iglesia.avif',
    'copas.avif',
    'vestimenta.avif',
    'tacon-y-corbatin.avif',
    'regalo.avif',
    'camara.avif',
  ],
  'boda-sello': [
    'portada-sobre.avif',
    'pareja-fecha.avif',
    'pareja-historia.avif',
    'pareja-invitacion.avif',
    'pareja-anillos.avif',
    'pareja-musica.avif',
    'pareja-cierre.avif',
    'esquina-izquierda.avif',
    'esquina-derecha.avif',
    'reloj-de-arena.avif',
    'iglesia.avif',
    'copas.avif',
    'brindis.avif',
    'cena.avif',
    'bouquet.avif',
    'pareja-baile.avif',
    'vestido-y-saco.avif',
    'tacon-y-corbata.avif',
    'regalo.avif',
    'camara.avif',
  ],
  'boda-ed': [
    'aros-sf.avif',
    'camara-dorada-sf.avif',
    'copas-doradas-sf.avif',
    'fondo-verde-hojas.avif',
    'fondo-verde.avif',
    'iconos-dorados-sf.avif',
    'novios-fotos.avif',
    'novios-verde.avif',
    'regalo-sf.avif',
    'taco-gato-sf.avif',
    'templo-dorado-sf.avif',
    'trajes-dorados-sf.avif',
  ],
  'flora': [
    'orange-spray.avif',
    'pink-corner-left.avif',
    'pink-corner-right.avif',
    'pink-spray.avif',
    'red-corner-left.avif',
    'red-corner-right.avif',
    'violet-spray.avif',
    'white-corner-left.avif',
    'white-corner-right.avif',
    'white-spray.avif',
  ],
  'xv': [
    'bajo-el-mar1.avif',
    'castillo-purpura.avif',
    'concha-recortada.avif',
    'corona-icono1.avif',
    'despedida-icono.avif',
    'fiesta-icono.avif',
    'fondo-musical.avif',
    'icono-vestimenta.avif',
    'invitacion-recepcion.avif',
    'mar-bg-a.avif',
    'mar-bg-b.avif',
    'mar-corona-purple.avif',
    'mar-corona.avif',
    'nota-sol-dorado-sf.avif',
    'vestido-solo.avif',
    'xv3.avif',
  ],
  'xv-fantasia': [
    'borde.avif',
    'flores-sin-fondo.avif',
    'luna-estrella-opt.avif',
    'noche-estrellada-bg.avif',
    'noche-estrellada-portada.avif',
    'reloj-dorado-opt.avif',
    'sobre-corona-recortado.avif',
    'tiara-vino-sf.avif',
  ],
  'xv-isabelle': [
    'busto-marmol-optimized.avif',
    'estilo-griego-bg.avif',
    'isabelle-cover.avif',
    'marmol-flores-optimized.avif',
    'piramide-hoja-optimized.avif',
    'portada-griega.avif',
  ],
  'xv-luciana': [
    'borde.avif',
    'bosque-verdee.avif',
    'faro-verde.avif',
    'quinceanera-verde.avif',
    'reloj1.avif',
    'traje1.avif',
  ],
  'xv-mariana': [
    'auto-plata-opt.avif',
    'baile-plata-opt.avif',
    'bola-sola-opt.avif',
    'borde-plata-sf.avif',
    'castillo-guindo-opt.avif',
    'corona-plata-opt.avif',
    'fondo-disco-mariana-opt.avif',
    'fondo-disco-tacones-opt.avif',
    'menu-plata-opt.avif',
    'micro-notas-opt.avif',
    'reloj-plata-opt.avif',
    'sobre-plata-opt.avif',
    'traje-plata-opt.avif',
  ],
  'xv-natalia': [
    'bajo-el-mar1.avif',
    'castillo-purpura.avif',
    'concha-recortada.avif',
    'corona-icono1.avif',
    'despedida-icono.avif',
    'fiesta-icono.avif',
    'fondo-musical.avif',
    'fondo-notas-dorado.avif',
    'guitarra-y-saxo-dorado-sf.avif',
    'icono-vestimenta.avif',
    'invitacion-recepcion.avif',
    'mar-corona-purple.avif',
    'nota-sol-dorado-sf.avif',
    'nota-sol-sf.avif',
  ],
  'xv-valentina': [
    'castillo2sf.avif',
    'corona-icono1.avif',
    'despedida-icono.avif',
    'fiesta-icono.avif',
    'icono-vestimenta.avif',
    'invitacion-recepcion.avif',
    'mascara-sin-fondo.avif',
    'mascarada-morada.avif',
    'xv3.avif',
  ],
  'xv-valeria': [
    'baile-guindo-round.avif',
    'bienvenida-guindo-round.avif',
    'borde.avif',
    'candelabro-guindo-sf.avif',
    'castillo-guindo-opt.avif',
    'cierre-guinda-round.avif',
    'corona-plata-opt.avif',
    'fondo-vino-guindo-bg.avif',
    'marco-guindo-portada.avif',
    'menu-guindo-round.avif',
    'reloj-plata-opt.avif',
    'tiara-vino-sf.avif',
    'torta-guinda-round.avif',
    'traje1-opt.avif',
    'xv-guindo-photo.avif',
  ],
} as const satisfies Record<string, readonly string[]>

export type ThemeAssetKey = keyof typeof THEME_ASSETS

/**
 * La ruta pública de una imagen del tema.
 *
 * Tipada contra el manifiesto: `themeAsset('xv-valeria', 'corona-plata-opt.avif')` compila
 * y con el nombre mal escrito no. Un `<img>` con la ruta cambiada no falla al compilar ni
 * en ninguna prueba de render — falla en el teléfono de un invitado, en silencio y con un
 * hueco donde iba la corona.
 */
export function themeAsset<K extends ThemeAssetKey>(
  tema: K,
  archivo: (typeof THEME_ASSETS)[K][number],
): string {
  return `/temas/${tema}/${archivo}`
}
