import { notFound } from 'next/navigation'
import { events } from '@/app/composition/container'
import { eventUnlocked } from '@/modules/events/actions'

/**
 * Sirve una imagen de una invitación.
 *
 * **Sin sesión, y es a propósito**: quien la mira es un invitado, y nunca va a tener una.
 * Lo que la protege es que el identificador es un UUID que no está publicado en ninguna
 * parte y que solo aparece dentro de una invitación a la que ya se llegó por su token.
 *
 * **Con la misma puerta que la invitación.** Si el evento lleva contraseña y la cookie de
 * desbloqueo no está, responde 404. Un `<img>` no puede ser el agujero por el que se rodea
 * el candado, igual que `respondAction` no podía serlo: la puerta cierra las lecturas, no
 * solo el render.
 *
 * Un identificador desconocido responde **404, nunca 403**: un 403 confirmaría que esa
 * imagen existe.
 *
 * `Cache-Control: private`. Nunca `public`: una imagen de un evento con contraseña no
 * puede quedarse en una caché compartida, donde la serviría sin volver a preguntar.
 */
export const dynamic = 'force-dynamic'

/**
 * El trozo que pide una cabecera `Range`, o `null` si no pide ninguno.
 *
 * Devuelve `'invalido'` cuando el trozo cae fuera del fichero: eso se contesta con un 416 y
 * su `Content-Range: bytes *​/total`, no con el fichero entero.
 *
 * Solo se atiende **un** rango. La forma de varios rangos existe en la norma y la usan los
 * descargadores, pero ni un `<img>` ni un `<audio>` la piden, y responderla obliga a montar
 * un `multipart/byteranges` entero.
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

export async function GET(peticion: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const archivo = await events.media.read(id)
  if (archivo === null) notFound()

  if (!(await eventUnlocked(archivo.eventId))) notFound()

  const total = archivo.bytes.byteLength
  const comunes = {
    'Content-Type': archivo.contentType,
    'Cache-Control': 'private, max-age=3600',
    // **Siempre**, también en la respuesta completa: es como el navegador averigua que
    // puede pedir trozos. Sin esta cabecera ni siquiera lo intenta.
    'Accept-Ranges': 'bytes',
    // Sin `Content-Disposition: attachment`, al revés que el comprobante: esto se pinta o
    // se escucha dentro de la invitación, no se descarga.
    'X-Content-Type-Options': 'nosniff',
  }

  /**
   * **Sin esto, la música no suena en iPhone.** Safari parte la petición en dos: primero
   * pide los dos primeros bytes y, si el servidor contesta `200` en vez de `206`, se niega
   * a reproducir — sin un solo error en consola, que es lo que lo vuelve difícil de ver.
   *
   * Y es lo que permite mover la aguja: un `200` con el fichero entero se reproduce de
   * principio a fin y no deja saltar a la mitad.
   */
  const rango = rangoDe(peticion.headers.get('range'), total)

  if (rango === 'invalido') {
    return new Response(null, {
      status: 416,
      headers: { ...comunes, 'Content-Range': `bytes */${total}` },
    })
  }

  if (rango !== null) {
    const trozo = archivo.bytes.subarray(rango.desde, rango.hasta + 1)
    return new Response(trozo as BodyInit, {
      status: 206,
      headers: {
        ...comunes,
        // `Content-Length` es el del **trozo**, nunca el del fichero.
        'Content-Length': String(trozo.byteLength),
        'Content-Range': `bytes ${rango.desde}-${rango.hasta}/${total}`,
      },
    })
  }

  return new Response(archivo.bytes as BodyInit, {
    headers: { ...comunes, 'Content-Length': String(total) },
  })
}
