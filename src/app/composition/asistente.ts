import { fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { drizzleSettingsRepository } from '@/modules/admin/infrastructure/drizzle-settings-repository'
import { conversar, type Ejecutor, type Salida } from '@/modules/asistente/application/conversar'
import { CLAVE_DE_CONFIG, leerConfig, mesEnBolivia, type ConfigDelAsistente } from '@/modules/asistente/domain/config'
import { GUIAS } from '@/modules/asistente/domain/guias'
import { HERRAMIENTAS } from '@/modules/asistente/domain/herramientas'
import type { Mensaje } from '@/modules/asistente/domain/historial'
import { reglasDelSistema, type Idioma } from '@/modules/asistente/domain/reglas'
import { drizzleUsoDelAsistente } from '@/modules/asistente/infrastructure/drizzle-uso'
import { modeloFalso } from '@/modules/asistente/infrastructure/modelo-falso'
import { crearModeloOpenAI } from '@/modules/asistente/infrastructure/openai'
import { fiestaDeTema } from '@/modules/events'
import { categoriasDe, cuentasDePartida, estadoDeTarea, NOMBRE_DE_CLASE, NOMBRE_DE_ESTADO, pagosQueVencen, totalesDelPresupuesto } from '@/modules/planner'
import { hasFeature, type Allowance } from '@/modules/plans'
import { env } from '@/shared/config/env'
import { DEFAULT_CURRENCY, formatAmount } from '@/shared/money'
import { isErr } from '@/shared/result'
import { analytics, guests, planner, rsvp } from './eventos'

/**
 * El modelo: OpenAI con la clave de producción, o el guionizado de las e2e (`ASISTENTE_MODELO=falso`, que
 * el compose de producción no pasa). Sin ninguno de los dos, Luxury no existe: el botón no aparece.
 */
const modelo = env.ASISTENTE_MODELO === 'falso' ? modeloFalso : env.OPENAI_API_KEY === undefined ? null : crearModeloOpenAI({ clave: env.OPENAI_API_KEY, modelo: env.ASISTENTE_MODELO })

const FIESTA: Record<string, string> = { boda: 'boda', xv: 'XV años', cumple: 'cumpleaños' }
const bs = (cents: number) => formatAmount(cents, DEFAULT_CURRENCY)
const sinTildes = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

type EventoDelAsistente = { readonly id: string; readonly slug: string; readonly title: string; readonly eventDate: string; readonly rsvpDeadline: string; readonly themeKey: string }

/** Las herramientas de lectura sobre **este** evento: el `eventId` lo pone el servidor, nunca el modelo. */
function ejecutorDe(evento: EventoDelAsistente, capacidad: Allowance, ahora: Date): Ejecutor {
  const hoy = fechaEnBolivia(ahora)
  const ruta = (r: string) => `/panel/eventos/${evento.slug}${r}`
  return async (llamada) => {
    switch (llamada.nombre) {
      case 'resumen_del_evento': {
        const [cuenta, grupos, personas, visitas] = await Promise.all([rsvp.tally(evento.id), guests.list(evento.id), guests.listPeople(evento.id), analytics.tally(evento.id)])
        const t = isErr(cuenta) ? null : cuenta.value
        const activos = isErr(grupos) ? [] : grupos.value.filter((g) => g.revokedAt === null)
        const dias = Math.round((Date.parse(`${evento.eventDate}T12:00:00Z`) - Date.parse(`${hoy}T12:00:00Z`)) / 86_400_000)
        return {
          evento: evento.title,
          fecha: evento.eventDate,
          dias_que_faltan: dias,
          invitaciones: activos.length,
          invitaciones_enviadas: activos.filter((g) => g.invitationSentAt !== null).length,
          personas_en_la_lista: isErr(personas) ? null : personas.value.length,
          lugares_invitados: t?.seatsInvited ?? null,
          lugares_confirmados: t?.seatsConfirmed ?? null,
          invitaciones_que_respondieron: t?.groupsResponded ?? null,
          invitaciones_sin_responder: t?.groupsPending ?? null,
          visitas_a_la_invitacion: isErr(visitas) ? null : visitas.value.total,
          enlaces: { invitados: ruta('/invitados'), resumen: ruta('') },
        }
      }
      case 'buscar_invitados': {
        const [grupos, personas, ultimas] = await Promise.all([guests.list(evento.id), guests.listPeople(evento.id), rsvp.latestByEvent(evento.id)])
        if (isErr(grupos) || isErr(personas)) return { error: 'No se pudo leer la lista ahora.' }
        const porId = new Map(grupos.value.filter((g) => g.revokedAt === null).map((g) => [g.id, g]))
        const estadoDe = (asiste: string | null, grupoId: string) => {
          if (asiste === 'yes') return 'confirmados'
          if (asiste === 'no') return 'no_vienen'
          const respuesta = ultimas.get(grupoId)?.attending
          return respuesta === undefined || respuesta === null ? 'sin_responder' : respuesta === 0 ? 'no_vienen' : 'confirmados'
        }
        const buscado = llamada.texto === null ? '' : sinTildes(llamada.texto.trim())
        const filas = personas.value
          .filter((p) => porId.has(p.guestGroupId))
          .map((p) => {
            const g = porId.get(p.guestGroupId)!
            return { nombre: p.fullName, invitacion: g.label, estado: estadoDe(p.attending, g.id), invitacion_enviada: g.invitationSentAt !== null, vip: p.vip }
          })
          .filter((f) => (llamada.estado === null || f.estado === llamada.estado) && (buscado === '' || sinTildes(`${f.nombre} ${f.invitacion}`).includes(buscado)))
        return { total: filas.length, personas: filas.slice(0, 40), enlace: ruta('/invitados') }
      }
      case 'tareas': {
        const tareas = (await planner.listTasks(evento.id)).map((t) => ({ t, estado: estadoDeTarea(t, hoy) }))
        const elegidas = tareas.filter(({ estado }) =>
          llamada.filtro === 'hechas' ? estado === 'hecha' : llamada.filtro === 'semana' ? estado === 'semana' : llamada.filtro === 'atrasadas' ? estado === 'atrasada' : estado !== 'hecha',
        )
        return {
          total_de_tareas: tareas.length,
          hechas: tareas.filter((x) => x.estado === 'hecha').length,
          tareas: elegidas.slice(0, 40).map(({ t, estado }) => ({ tarea: t.title, vence: t.dueDate, estado, responsable: t.assignee })),
          enlace: ruta('/planner/tareas'),
        }
      }
      case 'presupuesto': {
        const partidas = await planner.listBudget(evento.id)
        const t = totalesDelPresupuesto(partidas)
        return {
          previsto: bs(t.previsto),
          comprometido: bs(t.comprometido),
          pagado: bs(t.pagado),
          falta_pagar: bs(t.falta),
          partidas: partidas.slice(0, 40).map((p) => {
            const c = cuentasDePartida(p)
            return { concepto: p.concept, categoria: p.category, previsto: bs(c.previsto), pagado: bs(c.pagado), falta: bs(c.falta) }
          }),
          pagos_que_vencen: pagosQueVencen(partidas, hoy).map((g) => ({ concepto: g.concepto, importe: bs(g.amountCents), vence: g.dueDate })),
          // Para `proponer_partidas`: la clave de cada categoría de esta fiesta.
          categorias_disponibles: categoriasDe(fiestaDeTema(evento.themeKey)).map((c) => ({ clave: c.clave, nombre: c.nombre })),
          enlace: ruta('/planner/presupuesto'),
        }
      }
      case 'proveedores': {
        if (!hasFeature(capacidad, 'plannerCompleto')) return { error: 'El plan de este evento no incluye proveedores.' }
        const proveedores = await planner.dia.listVendors(evento.id)
        return { proveedores: proveedores.map((v) => ({ servicio: v.service, empresa: v.company, estado: NOMBRE_DE_ESTADO[v.status], llega: v.arrivalTime })), enlace: ruta('/planner/proveedores') }
      }
      case 'cronograma': {
        if (!hasFeature(capacidad, 'plannerCompleto')) return { error: 'El plan de este evento no incluye el cronograma.' }
        const momentos = await planner.dia.listMoments(evento.id)
        return { momentos: momentos.map((m) => ({ hora: m.startsAt, momento: m.title, lugar: m.place, sale_en_la_invitacion: m.enInvitacion })), enlace: ruta('/planner/cronograma') }
      }
      case 'como_se_hace':
        return { como: GUIAS[llamada.tema].texto, enlace: ruta(GUIAS[llamada.tema].ruta) }
      case 'agenda': {
        const desde = llamada.desde ?? hoy
        const hasta = llamada.hasta ?? new Date(Date.parse(`${desde}T00:00:00Z`) + 30 * 86_400_000).toISOString().slice(0, 10)
        const entradas = (await planner.dia.agenda(evento)).filter((e) => e.dia >= desde && e.dia <= hasta)
        return {
          desde,
          hasta,
          agenda: entradas.slice(0, 60).map((e) => ({ dia: e.dia, hora: e.hora, que: e.titulo, tipo: NOMBRE_DE_CLASE[e.clase], detalle: e.detalle, hecho: e.hecha })),
          enlace: ruta('/planner/agenda'),
        }
      }
      case 'proponer_citas':
      case 'proponer_invitados':
      case 'proponer_tareas':
      case 'proponer_partidas':
      case 'proponer_momentos':
        // Lo resuelve `conversar` sin llegar aquí: proponer no guarda.
        return { error: 'No disponible.' }
    }
  }
}

async function leerLaConfig(): Promise<ConfigDelAsistente> {
  const ajustes = await drizzleSettingsRepository.readAll()
  return leerConfig(ajustes[CLAVE_DE_CONFIG])
}

/** **Luxury**, el asistente del panel del evento. */
export const asistente = {
  /** Si hay modelo (clave de OpenAI en producción). Sin él, ni botón ni ruta. */
  disponible: modelo !== null,
  config: leerLaConfig,
  guardarConfig: (config: ConfigDelAsistente) => drizzleSettingsRepository.write({ [CLAVE_DE_CONFIG]: JSON.stringify(config) }),
  usoDe: (eventId: string, ahora: Date) => drizzleUsoDelAsistente.usoDe(eventId, mesEnBolivia(ahora)),
  resumenDelMes: (ahora: Date) => drizzleUsoDelAsistente.resumenDelMes(mesEnBolivia(ahora)),
  /** Una respuesta, en trozos. Quien llama ya comprobó sesión, evento, plan y cuota. */
  responder(p: { evento: EventoDelAsistente; capacidad: Allowance; nombreDelPlan: string; rol: string; mensajes: readonly Mensaje[]; ahora: Date; idioma: Idioma; porVoz: boolean }): AsyncGenerator<Salida> {
    if (modelo === null) throw new Error('Luxury no tiene modelo configurado')
    const mes = mesEnBolivia(p.ahora)
    const instrucciones = reglasDelSistema({
      evento: p.evento.title,
      fiesta: FIESTA[fiestaDeTema(p.evento.themeKey)] ?? 'evento',
      fecha: p.evento.eventDate,
      plan: p.nombreDelPlan,
      rol: p.rol,
      hoy: fechaEnBolivia(p.ahora),
      slug: p.evento.slug,
      idioma: p.idioma,
      porVoz: p.porVoz,
    })
    return conversar({
      modelo,
      herramientas: HERRAMIENTAS,
      ejecutar: ejecutorDe(p.evento, p.capacidad, p.ahora),
      registrarUso: (uso) => drizzleUsoDelAsistente.registrar(p.evento.id, mes, uso),
    })({ instrucciones, mensajes: p.mensajes })
  },
}
