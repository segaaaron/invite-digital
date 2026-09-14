import { NextResponse } from 'next/server'
import { admin } from '@/app/composition/container'
import { isErr } from '@/shared/result'

export const dynamic = 'force-dynamic'

/**
 * El trozo que pide una cabecera `Range`, o `null` si no pide ninguno.
 *
 * `'invalido'` es un rango fuera del fichero: eso se contesta con 416 y su
 * `Content-Range: bytes *​/total`, nunca con el fichero entero.
 *
 * Solo se atiende **un** rango. La forma de varios existe en la norma y la usan los
 * descargadores, pero ni un `<audio>` ni un `<img>` la piden, y responderla obliga a
 * montar un `multipart/byteranges` entero.
 */
function rangoDe(cabecera: string | null, total: number): { desde: number; hasta: number } | 'invalido' | null {
  if (cabecera === null) return null

  const trozos = /^bytes=(\d*)-(\d*)$/.exec(cabecera.trim())
  if (trozos === null) return 'invalido'

  const [, crudoDesde = '', crudoHasta = ''] = trozos
  if (crudoDesde === '' && crudoHasta === '') return 'invalido'

  // `bytes=-500` son los **últimos** 500 bytes, no los primeros.
  const desde = crudoDesde === '' ? Math.max(0, total - Number(crudoHasta)) : Number(crudoDesde)
  const hasta = crudoDesde === '' || crudoHasta === '' ? total - 1 : Math.min(Number(crudoHasta), total - 1)

  if (!Number.isFinite(desde) || !Number.isFinite(hasta) || desde > hasta || desde >= total) return 'invalido'
  return { desde, hasta }
}

/**
 * Sirve la música de un modelo del escaparate. **Sin sesión, y a propósito.**
 *
 * Es la web pública: estos dieciséis los mira cualquiera antes de comprar. Esconderla tras
 * una sesión la volvería inútil, igual que el QR de cobro.
 *
 * **Sin la rama de `Range` no suena en iPhone.** Safari parte la petición en dos: pide
 * primero unos pocos bytes y, si el servidor contesta `200` en vez de `206`, se niega a
 * reproducir — sin un solo error en consola, que es lo que lo vuelve difícil de ver.
 *
 * Un modelo sin música responde **404**, que es lo que el reproductor necesita para
 * quedarse como estaba en vez de romperse.
 */
export async function GET(peticion: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const musica = await admin.showcaseMusic()
  if (isErr(musica)) return new NextResponse('Sin música', { status: 404 })

  const fichero = musica.value[slug]
  if (fichero === undefined || fichero === '') return new NextResponse('Sin música', { status: 404 })

  const bytes = await admin.readShowcaseFile(fichero)
  if (bytes === null) return new NextResponse('Sin música', { status: 404 })

  const total = bytes.byteLength
  const comunes = {
    'Content-Type': 'audio/mpeg',
    // **Siempre**, también en la respuesta completa: es como el navegador averigua que
    // puede pedir trozos. Sin esta cabecera ni lo intenta.
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
    // Pública y corta: es la misma canción para todo el mundo, y cambiarla desde el panel
    // tiene que oírse enseguida, no cuando caduque una caché de un día.
    'Cache-Control': 'public, max-age=300',
  }

  const rango = rangoDe(peticion.headers.get('range'), total)

  if (rango === 'invalido') {
    return new NextResponse(null, { status: 416, headers: { ...comunes, 'Content-Range': `bytes */${total}` } })
  }

  if (rango !== null) {
    const trozo = bytes.subarray(rango.desde, rango.hasta + 1)
    return new NextResponse(Buffer.from(trozo), {
      status: 206,
      headers: {
        ...comunes,
        // `Content-Length` es el del **trozo**, nunca el del fichero.
        'Content-Length': String(trozo.byteLength),
        'Content-Range': `bytes ${rango.desde}-${rango.hasta}/${total}`,
      },
    })
  }

  return new NextResponse(Buffer.from(bytes), {
    headers: { ...comunes, 'Content-Length': String(total) },
  })
}
