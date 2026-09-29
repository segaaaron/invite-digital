import type { EventoDelModelo, ModeloDeLenguaje } from '../application/conversar'

/**
 * OpenAI por la **Responses API**, con `fetch` y sin SDK: es una llamada. En streaming, para que la
 * respuesta se vea escribirse. `store: false`: OpenAI no guarda la conversación como estado (la
 * conserva 30 días solo para vigilar abusos y no entrena con ella); por eso se le devuelven cada ronda
 * todas las piezas de su salida —razonamiento incluido— junto al resultado de las herramientas.
 */
export function crearModeloOpenAI(opciones: { clave: string; modelo: string; maxTokensDeSalida?: number }): ModeloDeLenguaje {
  return {
    async *responder({ instrucciones, entrada, herramientas }) {
      const respuesta = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { authorization: `Bearer ${opciones.clave}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: opciones.modelo,
          instructions: instrucciones,
          input: entrada,
          tools: herramientas,
          stream: true,
          store: false,
          // Razonamiento corto: el trabajo pesado lo hace nuestro código, no el modelo.
          reasoning: { effort: 'low' },
          max_output_tokens: opciones.maxTokensDeSalida ?? 1200,
        }),
        signal: AbortSignal.timeout(60_000),
      })
      if (!respuesta.ok || respuesta.body === null) {
        const detalle = await respuesta.text().catch(() => '')
        throw new Error(`OpenAI respondió ${respuesta.status}: ${detalle.slice(0, 300)}`)
      }
      yield* leerEventos(respuesta.body)
    },
  }
}

type EventoDeOpenAI = {
  type?: string
  delta?: string
  item?: { type?: string; call_id?: string; name?: string; arguments?: string }
  response?: { usage?: { input_tokens?: number; output_tokens?: number; input_tokens_details?: { cached_tokens?: number } }; error?: { message?: string } }
  message?: string
}

/** Del flujo SSE de OpenAI a los eventos del caso de uso. Exportada para probarla sin red. */
export async function* leerEventos(cuerpo: ReadableStream<Uint8Array>): AsyncGenerator<EventoDelModelo> {
  const lector = cuerpo.getReader()
  const decodificador = new TextDecoder()
  let pendiente = ''
  let terminado = false
  while (!terminado) {
    const { value, done } = await lector.read()
    if (done) break
    pendiente += decodificador.decode(value, { stream: true })
    // Los eventos SSE se separan con una línea en blanco.
    let corte: number
    while ((corte = pendiente.indexOf('\n\n')) !== -1) {
      const bloque = pendiente.slice(0, corte)
      pendiente = pendiente.slice(corte + 2)
      const datos = bloque
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trimStart())
        .join('\n')
      if (datos === '' || datos === '[DONE]') continue
      const evento = JSON.parse(datos) as EventoDeOpenAI
      switch (evento.type) {
        case 'response.output_text.delta':
          if (evento.delta) yield { tipo: 'texto', delta: evento.delta }
          break
        case 'response.output_item.done':
          if (evento.item === undefined) break
          yield { tipo: 'item', item: evento.item }
          if (evento.item.type === 'function_call') {
            yield { tipo: 'llamada', callId: evento.item.call_id ?? '', nombre: evento.item.name ?? '', argumentos: evento.item.arguments ?? '' }
          }
          break
        case 'response.completed':
        case 'response.incomplete': {
          const u = evento.response?.usage
          yield { tipo: 'fin', uso: { entrada: u?.input_tokens ?? 0, enCache: u?.input_tokens_details?.cached_tokens ?? 0, salida: u?.output_tokens ?? 0 } }
          terminado = true
          break
        }
        case 'response.failed':
          throw new Error(`OpenAI falló: ${evento.response?.error?.message ?? 'sin detalle'}`)
        case 'error':
          throw new Error(`OpenAI: ${evento.message ?? 'error'}`)
      }
    }
  }
  await lector.cancel().catch(() => undefined)
}
