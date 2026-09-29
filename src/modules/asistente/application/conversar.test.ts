import { describe, expect, it } from 'vitest'
import { HERRAMIENTAS } from '../domain/herramientas'
import { conversar, MAX_RONDAS, type EventoDelModelo, type ModeloDeLenguaje, type Salida } from './conversar'

const USO = { entrada: 100, enCache: 0, salida: 10 }
const llamada = (nombre: string, args: unknown, id = `c-${nombre}`): EventoDelModelo[] => [
  { tipo: 'item', item: { type: 'function_call', call_id: id, name: nombre, arguments: JSON.stringify(args) } },
  { tipo: 'llamada', callId: id, nombre, argumentos: JSON.stringify(args) },
  { tipo: 'fin', uso: USO },
]

/** Un modelo que responde lo guionizado ronda a ronda y guarda lo que recibió. */
function guionizado(rondas: EventoDelModelo[][]) {
  const entradas: unknown[][] = []
  const modelo: ModeloDeLenguaje = {
    async *responder({ entrada }) {
      entradas.push([...entrada])
      const ronda = rondas[entradas.length - 1]
      if (ronda === undefined) throw new Error('sin guion')
      yield* ronda
    },
  }
  return { modelo, entradas }
}

async function correr(rondas: EventoDelModelo[][], ejecutar = async () => ({ ok: true }) as unknown) {
  const { modelo, entradas } = guionizado(rondas)
  const usos: (typeof USO)[] = []
  const ejecutadas: string[] = []
  const salidas: Salida[] = []
  for await (const s of conversar({
    modelo,
    herramientas: HERRAMIENTAS,
    ejecutar: async (l) => {
      ejecutadas.push(l.nombre)
      return ejecutar()
    },
    registrarUso: async (u) => void usos.push(u),
  })({ instrucciones: 'reglas', mensajes: [{ rol: 'usuario', texto: 'hola' }] }))
    salidas.push(s)
  return { salidas, usos, ejecutadas, entradas }
}

describe('conversar', () => {
  it('ejecuta la herramienta, le devuelve el resultado al modelo y deja pasar su texto', async () => {
    const { salidas, ejecutadas, entradas, usos } = await correr(
      [llamada('resumen_del_evento', {}), [{ tipo: 'texto', delta: 'Tienes ' }, { tipo: 'texto', delta: '12.' }, { tipo: 'fin', uso: USO }]],
      async () => ({ invitaciones: 12 }),
    )
    expect(ejecutadas).toEqual(['resumen_del_evento'])
    expect(entradas[1]).toContainEqual({ type: 'function_call_output', call_id: 'c-resumen_del_evento', output: '{"invitaciones":12}' })
    expect(salidas.filter((s) => s.tipo === 'texto').map((s) => (s as { delta: string }).delta).join('')).toBe('Tienes 12.')
    expect(salidas.at(-1)).toEqual({ tipo: 'fin' })
    expect(usos).toEqual([{ entrada: 200, enCache: 0, salida: 20 }])
  })

  it('proponer invitados NO ejecuta nada: manda la tarjeta al navegador', async () => {
    const invitaciones = [{ personas: ['Ramón Pérez'], telefono: '70012345' }]
    const { salidas, ejecutadas } = await correr([llamada('proponer_invitados', { invitaciones }), [{ tipo: 'texto', delta: 'Listo para confirmar.' }, { tipo: 'fin', uso: USO }]])
    expect(ejecutadas).toEqual([])
    expect(salidas).toContainEqual({ tipo: 'propuesta', invitaciones })
  })

  it('una herramienta inventada o con argumentos malos vuelve como error al modelo, sin ejecutarse', async () => {
    const { ejecutadas, entradas } = await correr([llamada('borrar_evento', {}), [{ tipo: 'texto', delta: 'No puedo.' }, { tipo: 'fin', uso: USO }]])
    expect(ejecutadas).toEqual([])
    expect(JSON.stringify(entradas[1])).toContain('No existe la herramienta borrar_evento')
  })

  it('no da más de cinco vueltas, y si el modelo falla dice un error y cuenta lo gastado', async () => {
    const enBucle = await correr(Array.from({ length: MAX_RONDAS + 2 }, () => llamada('presupuesto', {})))
    expect(enBucle.ejecutadas).toHaveLength(MAX_RONDAS)
    expect(enBucle.usos[0]!.entrada).toBe(100 * MAX_RONDAS)

    const roto = await correr([llamada('presupuesto', {})])
    expect(roto.salidas.at(-1)).toMatchObject({ tipo: 'error' })
    expect(roto.usos).toEqual([USO])
  })
})
