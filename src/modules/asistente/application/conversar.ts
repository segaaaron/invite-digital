import type { UsoDeTokens } from '../domain/config'
import { interpretarLlamada, type DefinicionDeHerramienta, type InvitacionPropuesta, type LlamadaValida } from '../domain/herramientas'
import type { Mensaje } from '../domain/historial'

/** Lo que va diciendo el modelo mientras responde. `item` es cada pieza de su salida, que se le devuelve tal cual. */
export type EventoDelModelo =
  | { readonly tipo: 'texto'; readonly delta: string }
  | { readonly tipo: 'item'; readonly item: unknown }
  | { readonly tipo: 'llamada'; readonly callId: string; readonly nombre: string; readonly argumentos: string }
  | { readonly tipo: 'fin'; readonly uso: UsoDeTokens }

/**
 * El modelo de lenguaje. En producción OpenAI (Responses API); en las pruebas, un doble. **Nunca** se
 * llama a OpenAI en la suite ni en el CI. Lanza si la llamada falla.
 */
export interface ModeloDeLenguaje {
  responder(peticion: { instrucciones: string; entrada: readonly unknown[]; herramientas: readonly DefinicionDeHerramienta[] }): AsyncIterable<EventoDelModelo>
}

/** Lo que ejecuta una herramienta ya validada, con los permisos de quien pregunta. */
export type Ejecutor = (llamada: LlamadaValida) => Promise<unknown>

/** Lo que ve el navegador. */
export type Salida =
  | { readonly tipo: 'texto'; readonly delta: string }
  | { readonly tipo: 'consultando'; readonly herramienta: string }
  | { readonly tipo: 'propuesta'; readonly invitaciones: readonly InvitacionPropuesta[] }
  | { readonly tipo: 'error'; readonly mensaje: string }
  | { readonly tipo: 'fin' }

/** Rondas de herramientas por mensaje: un techo al gasto y a un modelo que se enrede. */
export const MAX_RONDAS = 5

const ERROR_GENERICO = 'No pude responder ahora. Vuelve a intentarlo en un momento.'

/**
 * Una respuesta de Arturo: manda la conversación al modelo; si pide herramientas, las valida, las ejecuta
 * y le devuelve el resultado, hasta que responde con texto (o se acaban las rondas). Lo que escribe llega
 * al navegador según sale. `registrarUso` recibe los tokens de todas las rondas, **también si algo falla**:
 * lo gastado se cuenta.
 */
export const conversar = (deps: { modelo: ModeloDeLenguaje; herramientas: readonly DefinicionDeHerramienta[]; ejecutar: Ejecutor; registrarUso: (uso: UsoDeTokens) => Promise<void> }) =>
  async function* (peticion: { instrucciones: string; mensajes: readonly Mensaje[] }): AsyncGenerator<Salida> {
    const entrada: unknown[] = peticion.mensajes.map((m) => ({ role: m.rol === 'usuario' ? 'user' : 'assistant', content: m.texto }))
    const uso = { entrada: 0, enCache: 0, salida: 0 }
    try {
      for (let ronda = 0; ronda < MAX_RONDAS; ronda++) {
        const llamadas: { callId: string; nombre: string; argumentos: string }[] = []
        for await (const evento of deps.modelo.responder({ instrucciones: peticion.instrucciones, entrada, herramientas: deps.herramientas })) {
          if (evento.tipo === 'texto') yield { tipo: 'texto', delta: evento.delta }
          else if (evento.tipo === 'item') entrada.push(evento.item)
          else if (evento.tipo === 'llamada') llamadas.push(evento)
          else {
            uso.entrada += evento.uso.entrada
            uso.enCache += evento.uso.enCache
            uso.salida += evento.uso.salida
          }
        }
        if (llamadas.length === 0) {
          yield { tipo: 'fin' }
          return
        }
        for (const llamada of llamadas) {
          const interpretada = interpretarLlamada(llamada.nombre, llamada.argumentos)
          let resultado: unknown
          if (!interpretada.ok) resultado = { error: interpretada.error }
          else {
            yield { tipo: 'consultando', herramienta: llamada.nombre }
            if (interpretada.llamada.nombre === 'proponer_invitados') {
              // No guarda nada: la tarjeta la confirma la persona.
              yield { tipo: 'propuesta', invitaciones: interpretada.llamada.invitaciones }
              resultado = { mostrada: true, nota: 'La persona ve una tarjeta con Confirmar. Todavía no se guardó nada.' }
            } else {
              resultado = await deps.ejecutar(interpretada.llamada).catch((causa: unknown) => {
                console.error('herramienta del asistente %s:', llamada.nombre, causa)
                return { error: 'No se pudo leer ese dato ahora.' }
              })
            }
          }
          entrada.push({ type: 'function_call_output', call_id: llamada.callId, output: JSON.stringify(resultado) })
        }
      }
      yield { tipo: 'texto', delta: 'Necesito que me lo pidas de otra forma: esto se me hizo largo.' }
      yield { tipo: 'fin' }
    } catch (causa) {
      console.error('el asistente no respondió:', causa)
      yield { tipo: 'error', mensaje: ERROR_GENERICO }
    } finally {
      await deps.registrarUso(uso).catch((causa: unknown) => console.error('no se pudo registrar el uso del asistente:', causa))
    }
  }
