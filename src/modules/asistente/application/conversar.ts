import type { UsoDeTokens } from '../domain/config'
import { ESCRITURAS, interpretarLlamada, type DefinicionDeHerramienta, type LlamadaValida, type Propuesta } from '../domain/herramientas'
import type { Mensaje } from '../domain/historial'
import { registrarFallo } from '@/shared/observability/fallos'

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

/**
 * Lo que devuelve una herramienta del servidor que además **enseña una tarjeta** (preparar el envío: la
 * tarjeta lleva el enlace de cada invitado, que solo tiene el servidor). El modelo recibe `resultado`.
 */
export type ConTarjeta = { readonly tarjeta: Propuesta; readonly resultado: unknown }
const esConTarjeta = (valor: unknown): valor is ConTarjeta => typeof valor === 'object' && valor !== null && 'tarjeta' in valor && 'resultado' in valor

/** Lo que devuelve «ir_a»: adónde va el navegador (9 oct). El modelo recibe `resultado`. */
export type ConNavegacion = { readonly navegar: string; readonly resultado: unknown }
const esConNavegacion = (valor: unknown): valor is ConNavegacion => typeof valor === 'object' && valor !== null && 'navegar' in valor && 'resultado' in valor

/** Lo que ve el navegador. */
export type Salida =
  | { readonly tipo: 'texto'; readonly delta: string }
  | { readonly tipo: 'consultando'; readonly herramienta: string }
  | { readonly tipo: 'propuesta'; readonly propuesta: Propuesta }
  /** Algo cambió en el evento: el panel se vuelve a pintar para enseñarlo. */
  | { readonly tipo: 'hecho'; readonly herramienta: string }
  /** Abrir esa pantalla del panel. */
  | { readonly tipo: 'navegar'; readonly href: string }
  | { readonly tipo: 'error'; readonly mensaje: string }
  | { readonly tipo: 'fin' }

/** Rondas de herramientas por mensaje: un techo al gasto y a un modelo que se enrede. */
export const MAX_RONDAS = 8

const ERROR_GENERICO = 'No pude responder ahora. Vuelve a intentarlo en un momento.'

/**
 * Una respuesta de Luxury: manda la conversación al modelo; si pide herramientas, las valida, las ejecuta
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
            resultado = await deps.ejecutar(interpretada.llamada).catch((causa: unknown) => {
              registrarFallo('asistente/conversar', 'herramienta del asistente %s:', llamada.nombre, causa)
              return { error: 'No se pudo hacer ahora. Vuelve a intentarlo en un momento.' }
            })
            if (esConTarjeta(resultado)) {
              yield { tipo: 'propuesta', propuesta: resultado.tarjeta }
              resultado = resultado.resultado
            }
            if (esConNavegacion(resultado)) {
              yield { tipo: 'navegar', href: resultado.navegar }
              resultado = resultado.resultado
            }
            if (ESCRITURAS.has(llamada.nombre)) yield { tipo: 'hecho', herramienta: llamada.nombre }
          }
          entrada.push({ type: 'function_call_output', call_id: llamada.callId, output: JSON.stringify(resultado) })
        }
      }
      yield { tipo: 'texto', delta: 'Necesito que me lo pidas de otra forma: esto se me hizo largo.' }
      yield { tipo: 'fin' }
    } catch (causa) {
      registrarFallo('asistente/conversar', 'el asistente no respondió:', causa)
      yield { tipo: 'error', mensaje: ERROR_GENERICO }
    } finally {
      await deps.registrarUso(uso).catch((causa: unknown) => registrarFallo('asistente/conversar', 'no se pudo registrar el uso del asistente:', causa))
    }
  }
