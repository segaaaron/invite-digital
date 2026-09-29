import { describe, expect, it } from 'vitest'
import type { EventoDelModelo } from '../application/conversar'
import { leerEventos } from './openai'

describe('leerEventos (OpenAI)', () => {
  it('traduce el flujo SSE de la Responses API: texto, llamadas, uso con caché; y lanza si falla', async () => {
    const sse = [
      { type: 'response.created' },
      { type: 'response.output_text.delta', delta: 'Ho' },
      { type: 'response.output_text.delta', delta: 'la' },
      { type: 'response.output_item.done', item: { type: 'function_call', call_id: 'c1', name: 'tareas', arguments: '{"filtro":null}' } },
      { type: 'response.completed', response: { usage: { input_tokens: 50, input_tokens_details: { cached_tokens: 20 }, output_tokens: 7 } } },
    ]
      .map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`)
      .join('')
    // En dos trozos cortados por la mitad de un evento, como llega por la red.
    const bytes = new TextEncoder().encode(sse)
    const cuerpo = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(bytes.slice(0, 90))
        c.enqueue(bytes.slice(90))
        c.close()
      },
    })
    const eventos: EventoDelModelo[] = []
    for await (const e of leerEventos(cuerpo)) eventos.push(e)
    expect(eventos).toEqual([
      { tipo: 'texto', delta: 'Ho' },
      { tipo: 'texto', delta: 'la' },
      { tipo: 'item', item: { type: 'function_call', call_id: 'c1', name: 'tareas', arguments: '{"filtro":null}' } },
      { tipo: 'llamada', callId: 'c1', nombre: 'tareas', argumentos: '{"filtro":null}' },
      { tipo: 'fin', uso: { entrada: 50, enCache: 20, salida: 7 } },
    ])

    const falla = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'response.failed', response: { error: { message: 'rate' } } })}\n\n`))
        c.close()
      },
    })
    await expect(async () => {
      for await (const _ of leerEventos(falla)) void _
    }).rejects.toThrow('rate')
  })
})
