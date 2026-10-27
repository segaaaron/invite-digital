/**
 * **El sello de lacre de la marca**, el mismo de la cabecera y de producción, servido desde
 * `public/site/marca`. Vive aquí para que la portada no lo escriba cuatro veces —la barra, el
 * pie, los tres sobres y la carta de la reserva— y para que cambiarlo sea cambiar un sitio.
 *
 * El `srcSet` va por **anchos reales** (`w`), no por densidades (`1x/2x/3x`): con densidades el
 * navegador elegía el de 96 px para pintarlo a 64 en una pantalla retina —128 px de verdad— y el
 * lacre salía blando. Con anchos y su `sizes`, cada sitio pide el que le toca.
 */
export const SELLO = {
  src: '/site/marca/sello-la-144-59259035.avif',
  srcSet: '/site/marca/sello-la-48-627a79b8.avif 48w, /site/marca/sello-la-96-56d82990.avif 96w, /site/marca/sello-la-144-59259035.avif 144w',
  /** Lo que mide en pantalla cada uso, para que el navegador no pida de más ni de menos. */
  sizes: { barra: '36px', pie: '52px', sobre: '64px', carta: '54px' },
} as const
