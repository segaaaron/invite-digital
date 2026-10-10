import type { EventoDelModelo, ModeloDeLenguaje } from '../application/conversar'

/**
 * Un modelo **guionizado** para las e2e (`ASISTENTE_MODELO=falso`): las pruebas recorren el camino
 * entero —ruta, cuota, herramientas que escriben de verdad, tarjeta de envío— sin llamar a OpenAI. Entiende los
 * pedidos de abajo; cualquier otra cosa la rechaza como fuera de tema.
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

    // Tras escribir, dice lo que la herramienta devolvió (hecho o no_se_pudo), como pide la regla 3.
    const informe = (r: string): EventoDelModelo[] => {
      const leido = JSON.parse(r) as { hecho?: string | string[]; no_se_pudo?: string[]; ya_estaban?: string[]; error?: string; pin?: string }
      const hecho = [leido.hecho ?? []].flat()
      const partes = [hecho.length > 0 ? `Hecho: ${hecho.join('; ')}.` : '', leido.pin ? `PIN ${leido.pin}.` : '', leido.no_se_pudo ? `No se pudo: ${leido.no_se_pudo.join('; ')}.` : '', leido.ya_estaban ? `Ya estaba: ${leido.ya_estaban.join('; ')}.` : '', leido.error ? `No se pudo: ${leido.error}` : '']
      return texto(partes.filter(Boolean).join(' '))
    }
    const salidas = items.filter((i) => i.type === 'function_call_output').length
    const q = pregunta.trim()

    const alta = /^crea a ([^,]+?)(?:,\s*([\d +]+))?$/i.exec(q)
    const adjunto = /foto_id (\S+?)\]/.exec(q)
    const noViene = /^(.+) no viene$/i.exec(q)
    const puerta = /^suma a (.+) a la puerta, (\d+)$/i.exec(q)
    let guion: EventoDelModelo[]
    if (adjunto !== null) {
      const accion = /qr|banco/i.test(q) ? llamar('qr_de_transferencia', { foto_id: adjunto[1] }) : llamar('poner_foto', { foto_id: adjunto[1], donde: /retrato/i.test(q) ? 'retrato' : 'galeria', casilla: null, rotulo: null })
      guion = resultado === undefined ? accion : informe(resultado)
    } else if (noViene !== null) {
      if (resultado === undefined) guion = llamar('buscar_invitados', { texto: noViene[1]!.trim(), estado: null })
      else if (salidas === 1) {
        const p = (JSON.parse(resultado) as { personas?: { persona_id: string }[] }).personas?.[0]
        guion = p === undefined ? texto(`No encontré a ${noViene[1]}.`) : llamar('cambiar_invitados', { operaciones: [{ accion: 'asistencia', persona_id: p.persona_id, invitacion_id: null, nombre: null, telefono: null, vip: null, restriccion: null, asiste: 'no' }] })
      } else guion = informe(resultado)
    } else if (puerta !== null) {
      guion = resultado === undefined ? llamar('gestionar_recepcion', { accion: 'sumar', recepcion_id: null, persona: puerta[1]!.trim(), whatsapp: puerta[2], puerta: null }) : informe(resultado)
    } else if (/^llegó el pase (\S+)$/i.test(q)) {
      const codigo = /^llegó el pase (\S+)$/i.exec(q)![1]!
      if (resultado === undefined) guion = llamar('buscar_invitados', { texto: codigo, estado: null })
      else if (salidas === 1) {
        const p = (JSON.parse(resultado) as { personas?: { invitacion_id: string; invitacion: string }[] }).personas?.[0]
        guion = p === undefined ? texto(`No encontré el pase ${codigo}.`) : llamar('registrar_ingreso', { invitacion_id: p.invitacion_id, personas: null })
      } else guion = informe(resultado)
    } else if (/cuántos faltan por llegar/i.test(q)) {
      if (resultado === undefined) guion = llamar('puerta', {})
      else {
        const l = JSON.parse(resultado) as { personas_dentro?: number; personas_esperadas?: number }
        guion = texto(`Dentro ${l.personas_dentro ?? 0} de ${l.personas_esperadas ?? 0}.`)
      }
    } else if (/^llévame a (.+)$/i.test(q)) {
      const pantalla = /^llévame a (.+)$/i.exec(q)![1]!.trim().toLowerCase().replace(/ /g, '_')
      guion = resultado === undefined ? llamar('ir_a', { pantalla }) : texto((JSON.parse(resultado) as { error?: string }).error ?? 'Te llevo.')
    } else if (alta !== null) {
      guion = resultado === undefined ? llamar('registrar_invitados', { invitaciones: [{ personas: [alta[1]!.trim()], telefono: alta[2]?.trim() ?? null, aun_si_existe: false }] }) : informe(resultado)
    } else if (/^agrega la tarea (.+)$/i.test(q)) {
      const titulo = /^agrega la tarea (.+)$/i.exec(q)![1]!
      guion = resultado === undefined ? llamar('gestionar_tareas', { operaciones: [{ accion: 'crear', tarea_id: null, titulo, vence: null, responsable: 'anfitrion' }] }) : informe(resultado)
    } else if (/^borra la tarea (.+)$/i.test(q)) {
      const titulo = /^borra la tarea (.+)$/i.exec(q)![1]!
      if (resultado === undefined) guion = llamar('tareas', { filtro: null })
      else if (salidas === 1) {
        const t = (JSON.parse(resultado) as { tareas?: { tarea_id: string; tarea: string }[] }).tareas?.find((x) => x.tarea === titulo)
        guion = t === undefined ? texto(`No encontré la tarea ${titulo}.`) : llamar('gestionar_tareas', { operaciones: [{ accion: 'borrar', tarea_id: t.tarea_id, titulo: null, vence: null, responsable: null }] })
      } else guion = informe(resultado)
    } else if (/^manda las invitaciones/i.test(q)) {
      guion = resultado === undefined ? llamar('preparar_envio', { incluir_enviadas: false }) : texto('Te dejé un botón de WhatsApp por cada uno.')
    } else if (/^quita a (.+)$/i.test(q)) {
      const quien = /^quita a (.+)$/i.exec(q)![1]!
      if (resultado === undefined) guion = llamar('buscar_invitados', { texto: quien, estado: null })
      else if (salidas === 1) {
        const p = (JSON.parse(resultado) as { personas?: { persona_id: string }[] }).personas?.[0]
        guion = p === undefined ? texto(`No encontré a ${quien}.`) : llamar('cambiar_invitados', { operaciones: [{ accion: 'quitar', persona_id: p.persona_id, invitacion_id: null, nombre: null, telefono: null, vip: null, restriccion: null, asiste: null }] })
      } else guion = informe(resultado)
    } else if (/^escribe la invitación de (\S+) y (\S+)$/i.test(q)) {
      const [, a, b] = /^escribe la invitación de (\S+) y (\S+)$/i.exec(q)!
      guion =
        resultado === undefined
          ? llamar('escribir_invitacion', { texto_sobre_nombres: null, iniciales: null, texto_bajo_nombres: null, ubicacion: null, colores_vestimenta: null, anfitriones: null, cancion: null, nombre_a: a, nombre_b: b, frase: 'Juntos para siempre', fecha_hora: null, ceremonia: null, recepcion: null, vestimenta: { titulo: 'Formal', nota: null }, avisos: null, cierre: null })
          : informe(resultado)
    } else if (/^crea (\d+) mesas de (\d+)$/i.test(q)) {
      const [, n, lugares] = /^crea (\d+) mesas de (\d+)$/i.exec(q)!
      const ops = Array.from({ length: Number(n) }, (_, i) => ({ accion: 'crear', mesa_id: null, invitacion_id: null, nombre: `Mesa Luxury ${i + 1}`, lugares: Number(lugares), zona: null, zona_id: null }))
      guion = resultado === undefined ? llamar('gestionar_mesas', { operaciones: ops }) : informe(resultado)
    } else if (/^agrega el regalo (.+) de (\d+)$/i.test(q)) {
      const [, nombre, precio] = /^agrega el regalo (.+) de (\d+)$/i.exec(q)!
      guion = resultado === undefined ? llamar('gestionar_regalos', { operaciones: [{ accion: 'crear', regalo_id: null, nombre, precio_bs: Number(precio), tienda: null, enlace: null, descripcion: null, fondo_id: null, quien: null, metodo: null }] }) : informe(resultado)
    } else if (/^agradece los mensajes$/i.test(q)) {
      if (resultado === undefined) guion = llamar('mensajes', {})
      else if (salidas === 1) {
        const leido = JSON.parse(resultado) as { mensajes?: { mensaje_id: string; agradecido: boolean }[] }
        const pendientes = (leido.mensajes ?? []).filter((m) => !m.agradecido)
        guion = pendientes.length === 0 ? texto('Ya agradeciste todos.') : llamar('agradecer_mensajes', { agradecimientos: pendientes.map((m) => ({ mensaje_id: m.mensaje_id, respuesta: '¡Gracias por tus palabras!' })) })
      } else guion = informe(resultado)
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
