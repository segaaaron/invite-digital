import type { EventoDelModelo, ModeloDeLenguaje } from '../application/conversar'

/**
 * Un modelo **guionizado** para las e2e (`ASISTENTE_MODELO=falso`): las pruebas recorren el camino
 * entero —ruta, cuota, herramientas, tarjeta, confirmar— sin llamar a OpenAI. Entiende cuatro pedidos:
 * «Crea a <nombre>, <teléfono>», «Agrega la tarea <título>», «¿quién falta?» y cualquier otra cosa, que rechaza como fuera de tema.
 */
export const modeloFalso: ModeloDeLenguaje = {
  async *responder({ entrada }): AsyncGenerator<EventoDelModelo> {
    const items = entrada as readonly { role?: string; content?: string; type?: string; output?: string }[]
    const pregunta = [...items].reverse().find((i) => i.role === 'user')?.content ?? ''
    const resultado = items.at(-1)?.type === 'function_call_output' ? items.at(-1)?.output : undefined
    const uso = { entrada: 900, enCache: 0, salida: 40 }

    const texto = (t: string): EventoDelModelo[] => [{ tipo: 'texto', delta: t }, { tipo: 'fin', uso }]
    const llamar = (nombre: string, argumentos: unknown): EventoDelModelo[] => {
      const item = { type: 'function_call', call_id: `call_${nombre}`, name: nombre, arguments: JSON.stringify(argumentos) }
      return [{ tipo: 'item', item }, { tipo: 'llamada', callId: item.call_id, nombre, argumentos: item.arguments }, { tipo: 'fin', uso }]
    }

    const alta = /^crea a ([^,]+?)(?:,\s*([\d +]+))?$/i.exec(pregunta.trim())
    let guion: EventoDelModelo[]
    if (alta !== null) {
      guion = resultado === undefined ? llamar('proponer_invitados', { invitaciones: [{ personas: [alta[1]!.trim()], telefono: alta[2]?.trim() ?? null }] }) : texto(`Te dejé a ${alta[1]!.trim()} listo para confirmar.`)
    } else if (/^agrega la tarea (.+)$/i.test(pregunta.trim())) {
      const titulo = /^agrega la tarea (.+)$/i.exec(pregunta.trim())![1]!
      guion = resultado === undefined ? llamar('proponer_tareas', { tareas: [{ titulo, vence: null, responsable: 'anfitrion' }] }) : texto('Te la dejé lista para confirmar.')
    } else if (/falta/i.test(pregunta)) {
      if (resultado === undefined) guion = llamar('buscar_invitados', { texto: null, estado: 'sin_responder' })
      else {
        const leido = JSON.parse(resultado) as { personas?: { nombre: string }[] }
        const nombres = (leido.personas ?? []).map((p) => p.nombre)
        guion = texto(nombres.length === 0 ? 'Ya respondieron todos.' : `Faltan por responder: ${nombres.join(', ')}.`)
      }
    } else {
      guion = texto('Eso no lo puedo resolver yo; lo mío es tu evento. ¿Seguimos con la lista de invitados?')
    }
    // Trozo a trozo, como llega de verdad.
    for (const evento of guion) {
      if (evento.tipo === 'texto') for (const trozo of evento.delta.match(/.{1,12}/g) ?? []) yield { tipo: 'texto', delta: trozo }
      else yield evento
    }
  },
}
