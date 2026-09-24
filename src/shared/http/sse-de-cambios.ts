import { escucharCambios, versionDe, type TipoDeCambio } from '@/shared/db/cambios-en-vivo'

/**
 * El stream SSE de los cambios de un evento, para quien ya pasó su guardia.
 *
 * - Sin sondeo ni latido: en reposo no se escribe nada. Solo sale algo cuando Postgres avisa.
 * - Solo viaja el tipo (`rsvp`, `ingreso`…), nunca datos: al recibirlo, la página se vuelve a
 *   pintar en el servidor con sus permisos de siempre.
 * - Cada aviso lleva `id:` con la versión del evento. Si la conexión se corta, el navegador
 *   reconecta con `Last-Event-ID` y solo se le avisa si en el corte cambió algo.
 * - Los tipos que este lector no debe ver (la puerta no ve respuestas) viajan como `id:` sin
 *   datos: mueven su versión sin disparar nada (así lo define el estándar de SSE).
 * - `no-transform` evita que la compresión de Next lo retenga; `X-Accel-Buffering: no`, los
 *   proxies que lo respetan.
 */
export function respuestaDeCambios(request: Request, eventId: string, permitidos: ReadonlySet<TipoDeCambio>): Response {
  const codificar = new TextEncoder()
  let baja: () => void = () => {}
  let abierto = true

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const escribir = (texto: string) => {
        if (!abierto) return
        try {
          controller.enqueue(codificar.encode(texto))
        } catch {
          abierto = false
        }
      }
      const cerrar = () => {
        if (!abierto) return
        abierto = false
        baja()
        try {
          controller.close()
        } catch {
          // Ya cerrado por el otro lado.
        }
      }

      const version = versionDe(eventId)
      const ultima = request.headers.get('last-event-id')
      // Reconexión con algo perdido en medio (o el servidor se reinició): que se ponga al día una vez.
      if (ultima !== null && ultima !== String(version)) escribir(`id: ${version}\nevent: cambio\ndata: {"tipo":"resync"}\n\n`)
      else escribir(`retry: 3000\nid: ${version}\n\n`)

      baja = escucharCambios(eventId, (tipo, nueva) => {
        escribir(permitidos.has(tipo) || tipo === 'resync' ? `id: ${nueva}\nevent: cambio\ndata: ${JSON.stringify({ tipo })}\n\n` : `id: ${nueva}\n\n`)
      })
      request.signal.addEventListener('abort', cerrar, { once: true })
    },
    // Next cancela el stream cuando el navegador cierra la conexión (`pipeTo` con aborto).
    cancel() {
      abierto = false
      baja()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
