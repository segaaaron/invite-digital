import sharp from 'sharp'
import { mkdir } from 'fs/promises'

const SRC = '/Users/miguelangelsaraviabelmonte/Documents/vallhalla web images/Sitio Web Invitaciones Digitales/uploads'
const OUT = 'public/site'

const MAPA = [
  ['sinfondo_p3.png', 'hero/sobre-abierto', 1400, true],
  ['sinfondo_p2.png', 'hero/sobre-cerrado', 1000, true],
  ['sinfondo_p1.png', 'hero/invitacion', 1200, true],
  ['Gemini_Generated_Image_cmdynpcmdynpcmdy.jpeg', 'experiencia/acto-1', 900, false],
  ['Gemini_Generated_Image_w5g5jlw5g5jlw5g5.jpeg', 'experiencia/acto-2', 900, false],
  ['solicitado_p1.jpeg', 'experiencia/acto-3', 900, false],
  ['solicitado_p4.jpeg', 'movil/pantalla', 900, false],
  ['solicitado_p16.jpeg', 'movil/ambiente', 1200, false],
  ['Gemini_Generated_Image_b34z2ab34z2ab34z.jpeg', 'diferencia/suite', 1200, false],
  ['solicitado_p10.jpeg', 'contacto/atelier', 1200, false],
  ['colicitado_p2.jpeg', 'contacto/secuencia', 1200, false],
  ['solicitado_p9.jpeg', 'testimonios/daniela', 600, false],
  ['Gemini_Generated_Image_byvlewbyvlewbyvl.jpeg', 'colecciones/bodas-1', 1000, false],
  ['Gemini_Generated_Image_z02377z02377z023.jpeg', 'colecciones/bodas-2', 1000, false],
  ['Gemini_Generated_Image_uexl5zuexl5zuexl.jpeg', 'colecciones/xv-1', 1000, false],
  ['Gemini_Generated_Image_mlpomfmlpomfmlpo.jpeg', 'colecciones/xv-2', 1000, false],
  ['Gemini_Generated_Image_9xde499xde499xde.jpeg', 'colecciones/despedida-ella-1', 1000, false],
  ['solicitado_p14.jpeg', 'colecciones/despedida-ella-2', 1000, false],
  ['Gemini_Generated_Image_jy9ctejy9ctejy9c.jpeg', 'colecciones/despedida-el-1', 1000, false],
  ['solicitado_p15.jpeg', 'colecciones/despedida-el-2', 1000, false],
  ['Gemini_Generated_Image_ncurk6ncurk6ncur.jpeg', 'colecciones/graduacion-1', 1000, false],
]

for (const [origen, destino, ancho, alpha] of MAPA) {
  const ruta = `${OUT}/${destino}.avif`
  await mkdir(ruta.slice(0, ruta.lastIndexOf('/')), { recursive: true })
  const info = await sharp(`${SRC}/${origen}`)
    .resize({ width: ancho, withoutEnlargement: true })
    .avif({ quality: alpha ? 62 : 55, effort: 6 })
    .toFile(ruta)
  console.log(destino.padEnd(30), `${(info.size / 1024).toFixed(0)} kB`, `${info.width}×${info.height}`)
}
