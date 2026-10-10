import { fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { drizzleSettingsRepository } from '@/modules/admin/infrastructure/drizzle-settings-repository'
import { conversar, type Ejecutor, type Salida } from '@/modules/asistente/application/conversar'
import { CLAVE_DE_CONFIG, leerConfig, mesEnBolivia, type ConfigDelAsistente } from '@/modules/asistente/domain/config'
import { GUIAS } from '@/modules/asistente/domain/guias'
import { ESCRITURAS, HERRAMIENTAS, PANTALLAS_DEL_EVENTO, type LlamadaValida } from '@/modules/asistente/domain/herramientas'
import type { Mensaje } from '@/modules/asistente/domain/historial'
import { reglasDelSistema, type Idioma } from '@/modules/asistente/domain/reglas'
import { drizzleUsoDelAsistente } from '@/modules/asistente/infrastructure/drizzle-uso'
import { modeloFalso } from '@/modules/asistente/infrastructure/modelo-falso'
import { crearModeloOpenAI } from '@/modules/asistente/infrastructure/openai'
import { fiestaDeTema, preguntasDelEncargo, topeDeTexto, yaSeCelebro, type SectionKey } from '@/modules/events'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { TIPOS_DE_CORTEJO, atrasadasDeLaAgenda, categoriasDe, diasHasta, cuentasDePartida, estadoDeTarea, NOMBRE_DE_CLASE, NOMBRE_DE_ESTADO, pagosQueVencen, totalesDelPresupuesto } from '@/modules/planner'
import { extraDisponible, hasFeature, NOMBRE_DE_EFECTO, seccionesFueraDelPlan, type Allowance } from '@/modules/plans'
import { env } from '@/shared/config/env'
import { hora } from '@/shared/format/fecha'
import { DEFAULT_CURRENCY, formatAmount } from '@/shared/money'
import { isErr } from '@/shared/result'
import { analytics, diseno, events, guestbook, guests, planner, reminders, rsvp } from './eventos'
import { checkin, porters, registry, venue } from './dia-del-evento'
import { plans } from './negocio'
import { conCanal, invitationUrl, renderMessage } from '@/modules/guests'
import { reminderMessage } from '@/modules/reminders/domain/reminder-message'
import type { ConTarjeta } from '@/modules/asistente/application/conversar'
import type { FilaDeEnvio } from '@/modules/asistente/domain/herramientas'

/**
 * El modelo: OpenAI con la clave de producción, o el guionizado de las e2e (`ASISTENTE_MODELO=falso`, que
 * el compose de producción no pasa). Sin ninguno de los dos, Luxury no existe: el botón no aparece.
 */
const modelo = env.ASISTENTE_MODELO === 'falso' ? modeloFalso : env.OPENAI_API_KEY === undefined ? null : crearModeloOpenAI({ clave: env.OPENAI_API_KEY, modelo: env.ASISTENTE_MODELO })

const FIESTA: Record<string, string> = { boda: 'boda', xv: 'XV años', cumple: 'cumpleaños' }
const bs = (cents: number) => formatAmount(cents, DEFAULT_CURRENCY)
const sinTildes = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

type EventoDelAsistente = {
  readonly id: string
  readonly slug: string
  readonly title: string
  readonly eventDate: string
  readonly rsvpDeadline: string
  readonly themeKey: string
  readonly locale: string
  readonly messageTemplate: string | null
}

/** Las herramientas de lectura sobre **este** evento: el `eventId` lo pone el servidor, nunca el modelo. */
/** Lo que cambia algo lo hacen las acciones de las pantallas; se inyecta desde la ruta (ver `escritura.ts`). */
export type Escritor = (llamada: LlamadaValida, evento: { id: string; slug: string }) => Promise<unknown>

function ejecutorDe(evento: EventoDelAsistente, capacidad: Allowance, ahora: Date, escribir: Escritor, destinos?: readonly string[]): Ejecutor {
  const hoy = fechaEnBolivia(ahora)
  const ruta = (r: string) => `/panel/eventos/${evento.slug}${r}`
  return async (llamada) => {
    if (ESCRITURAS.has(llamada.nombre)) {
      // Lo celebrado queda para mirar (8 de octubre): solo se agradecen los mensajes.
      if (yaSeCelebro(evento.eventDate, ahora) && llamada.nombre !== 'agradecer_mensajes') {
        return { hecho: [], no_se_pudo: ['El evento ya se celebró: queda para mirar y ya no se cambia ni se borra nada. Solo se pueden agradecer los mensajes del libro de firmas.'] }
      }
      return escribir(llamada, evento)
    }
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
        const [grupos, personas, ultimas, manifiesto] = await Promise.all([guests.list(evento.id), guests.listPeople(evento.id), rsvp.latestByEvent(evento.id), checkin.manifest(evento.id)])
        if (isErr(grupos) || isErr(personas)) return { error: 'No se pudo leer la lista ahora.' }
        // La puerta: código del pase, mesa y quién entró (para hacer de recepción).
        const deLaPuerta = new Map((isErr(manifiesto) ? [] : manifiesto.value.groups).map((g) => [g.id, g]))
        const llegadas = new Map((isErr(manifiesto) ? [] : manifiesto.value.arrivals).map((a) => [a.guestGroupId, a]))
        const codigo = (s: string) => s.toUpperCase().replace(/[^0-9A-Z]/g, '')
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
            return {
              persona_id: p.id,
              nombre: p.fullName,
              invitacion_id: g.id,
              invitacion: g.label,
              estado: estadoDe(p.attending, g.id),
              invitacion_enviada: g.invitationSentAt !== null,
              vip: p.vip,
              restriccion: p.dietaryNote,
              acompanante: p.isCompanion,
              whatsapp: g.phone ?? null,
              codigo_pase: deLaPuerta.get(g.id)?.passCode ?? null,
              mesa: deLaPuerta.get(g.id)?.tableLabel ?? null,
              ingreso: ((): string => {
                const a = llegadas.get(g.id)
                if (a === undefined) return 'por llegar'
                const entro = a.personas[p.id] ?? (Object.keys(a.personas).length === 0 ? a.arrivedAt : undefined)
                return entro === undefined ? 'por llegar' : `dentro desde las ${hora(entro)}`
              })(),
            }
          })
          .filter(
            (f) =>
              (llamada.estado === null || f.estado === llamada.estado) &&
              (buscado === '' || sinTildes(`${f.nombre} ${f.invitacion}`).includes(buscado) || (f.codigo_pase !== null && codigo(f.codigo_pase) === codigo(llamada.texto ?? ''))),
          )
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
          tareas: elegidas.slice(0, 40).map(({ t, estado }) => ({ tarea_id: t.id, tarea: t.title, vence: t.dueDate, estado, responsable: t.assignee })),
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
            return {
              partida_id: p.id,
              concepto: p.concept,
              categoria: p.category,
              previsto: bs(c.previsto),
              pagado: bs(c.pagado),
              falta: bs(c.falta),
              pagos: p.pagos.map((g) => ({ pago_id: g.id, importe: bs(g.amountCents), vence: g.dueDate, pagado: g.paidAt !== null })),
            }
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
        return { proveedores: proveedores.map((v) => ({ proveedor_id: v.id, servicio: v.service, empresa: v.company, contacto: v.contactName, whatsapp: v.whatsapp, estado: NOMBRE_DE_ESTADO[v.status], llega: v.arrivalTime })), enlace: ruta('/planner/proveedores') }
      }
      case 'cronograma': {
        if (!hasFeature(capacidad, 'plannerCompleto')) return { error: 'El plan de este evento no incluye el cronograma.' }
        const momentos = await planner.dia.listMoments(evento.id)
        return { momentos: momentos.map((m) => ({ momento_id: m.id, hora: m.startsAt, momento: m.title, lugar: m.place, sale_en_la_invitacion: m.enInvitacion })), enlace: ruta('/planner/cronograma') }
      }
      case 'ir_a': {
        // Lo que el plan o la fiesta no traen da 404: se le dice al modelo en vez de mandar a la persona allí.
        const destino = PANTALLAS_DEL_EVENTO[llamada.pantalla]
        if (destino === '/planner/cortejo' && TIPOS_DE_CORTEJO[fiestaDeTema(evento.themeKey)].length === 0) return { error: 'Esta fiesta no tiene cortejo.' }
        if (seccionesFueraDelPlan(capacidad).includes(destino.split('?')[0]!)) return { error: 'El plan de este evento no trae esa pantalla.' }
        // Lo que su papel no abre (Equipo para el co-anfitrión…) tampoco: el modelo no puede creer que la abrió.
        if (destinos !== undefined && !destinos.includes(ruta(destino).split('?')[0]!)) return { error: 'Esa pantalla no está en tu panel.' }
        return { navegar: ruta(destino), resultado: { hecho: `La persona ya está viendo la pantalla ${llamada.pantalla.replace(/_/g, ' ')}.` } }
      }
      case 'como_se_hace':
        return { como: GUIAS[llamada.tema].texto, enlace: ruta(GUIAS[llamada.tema].ruta) }
      case 'agenda': {
        const desde = llamada.desde ?? hoy
        const hasta = llamada.hasta ?? new Date(Date.parse(`${desde}T00:00:00Z`) + 30 * 86_400_000).toISOString().slice(0, 10)
        const [todas, citas] = await Promise.all([planner.dia.agenda(evento), planner.dia.listCitas(evento.id)])
        const entradas = todas.filter((e) => e.dia >= desde && e.dia <= hasta)
        return {
          faltan_dias_para_el_evento: diasHasta(hoy, evento.eventDate),
          atrasado: atrasadasDeLaAgenda(todas, hoy).map((e) => ({ dia: e.dia, que: e.titulo, tipo: NOMBRE_DE_CLASE[e.clase], detalle: e.detalle })),
          citas: citas.map((c) => ({ cita_id: c.id, titulo: c.title, cuando: c.startsAt, minutos: c.durationMin, lugar: c.place })),
          desde,
          hasta,
          agenda: entradas.slice(0, 60).map((e) => ({ dia: e.dia, hora: e.hora, que: e.titulo, tipo: NOMBRE_DE_CLASE[e.clase], detalle: e.detalle, hecho: e.hecha })),
          enlace: ruta('/planner/agenda'),
        }
      }
      case 'mi_invitacion': {
        const c = await events.contenidoEscrito(evento.id)
        const lugarDe = (l: typeof c.ceremony) => (l === undefined ? null : { lugar: l.place ?? null, direccion: l.address ?? null, hora: l.time ?? null })
        return {
          escrito: {
            nombre_a: c.hero?.nameA ?? null,
            nombre_b: c.hero?.nameB ?? null,
            texto_sobre_nombres: c.hero?.eyebrow ?? null,
            iniciales: c.hero?.monogram ?? null,
            texto_bajo_nombres: c.hero?.serial ?? null,
            ubicacion: c.map?.href ?? null,
            colores_vestimenta: c.dressCode?.colors ?? [],
            anfitriones: c.hosts === undefined ? null : { titulo: c.hosts.label ?? null, ...(c.hosts.roles ?? { nombres: c.hosts.names }) },
            cancion: c.music?.track === undefined ? null : { titulo: c.music.track, artista: c.music.artist ?? null, archivo_subido: c.music.audioMediaId !== undefined },
            frase: c.quote?.text ?? null,
            fecha_hora: c.schedule?.startsAt ?? null,
            ceremonia: lugarDe(c.ceremony),
            recepcion: lugarDe(c.reception),
            vestimenta: c.dressCode === undefined ? null : { titulo: c.dressCode.title ?? null, nota: c.dressCode.note ?? null },
            cierre: c.closing?.text ?? null,
            avisos: (c.notes ?? []).map((n) => ({ titulo: n.title ?? null, texto: n.text ?? null })),
            itinerario: (c.itinerary ?? []).map((r) => ({ hora: r.time, momento: r.label })),
            fotos: {
              retrato: c.hero?.portraitImageId === undefined ? 'sin foto' : 'con foto',
              galeria: (c.gallery ?? []).map((g, i) => ({ casilla: i + 1, rotulo: g.label, con_foto: g.imageId !== undefined })),
            },
          },
          diseno: disenoParaRedactar(evento.themeKey),
          nota: 'Lo que está en null no se escribió: la invitación enseña ahí el ejemplo del diseño.',
          opciones: await opcionesDeInvitacion(evento.id),
          enlace: ruta('/configuracion'),
        }
      }
      case 'preparar_envio':
        return prepararEnvio(evento, llamada.incluir_enviadas, ruta)
      case 'preparar_recordatorios': {
        const cola = await reminders.due({ id: evento.id, locale: evento.locale, rsvpDeadline: new Date(`${evento.rsvpDeadline}T00:00:00Z`) })
        if (isErr(cola)) return { error: 'No se pudo calcular a quién recordar ahora.' }
        if (cola.value.length === 0) return { total: 0, nota: 'Hoy no hay a quién recordar: o ya respondieron o es pronto para insistir.' }
        const filas: FilaDeEnvio[] = cola.value.map((f) => ({
          id: f.groupId,
          nombre: f.label,
          telefono: f.phone,
          mensaje: reminderMessage({ kind: f.kind, locale: evento.locale, groupLabel: f.label, deadline: new Date(`${evento.rsvpDeadline}T00:00:00Z`) }),
          conEnlace: true,
          recordatorio: f.kind,
        }))
        const tarjeta: ConTarjeta = {
          tarjeta: { clase: 'envio', tipo: 'recordatorio', filas },
          resultado: { total: filas.length, sin_whatsapp: filas.filter((f) => f.telefono === null).map((f) => f.nombre), nota: 'La persona ve un botón de WhatsApp por invitado.' },
        }
        return tarjeta
      }
      case 'mesas': {
        if (!hasFeature(capacidad, 'seating')) return { error: 'El plan de este evento no incluye mesas.' }
        const salon = await venue.seating(evento.id)
        if (isErr(salon)) return { error: 'No se pudo leer el salón ahora.' }
        return {
          mesas: salon.value.tables.map((t) => ({ mesa_id: t.id, mesa: t.label, lugares: t.capacity, ocupados: t.taken, libres: t.free, invitaciones: t.groups.map((g) => ({ invitacion_id: g.id, invitacion: g.label, personas: g.seats })) })),
          sin_mesa: salon.value.unseated.map((g) => ({ invitacion_id: g.id, invitacion: g.label, personas: g.seats })),
          zonas: salon.value.zones.map((z) => ({ zona_id: z.id, zona: z.label, tipo: z.kind })),
          enlace: ruta('/mesas'),
        }
      }
      case 'regalos': {
        if (!hasFeature(capacidad, 'registry')) return { error: 'El plan de este evento no incluye la mesa de regalos.' }
        const mesa = await registry.list(evento.id)
        if (isErr(mesa)) return { error: 'No se pudo leer la mesa de regalos ahora.' }
        const ESTADO: Record<string, string> = { available: 'libre', reserved: 'reservado', purchased: 'comprado' }
        return {
          regalos: mesa.value.gifts.map((g) => ({ regalo_id: g.id, regalo: g.name, precio: bs(g.priceCents), tienda: g.store, estado: ESTADO[g.status] ?? g.status })),
          fondos: mesa.value.funds.map((f) => ({ fondo_id: f.fund.id, fondo: f.fund.name, meta: bs(f.fund.goalCents), descripcion: f.fund.description })),
          enlace: ruta('/regalos'),
        }
      }
      case 'mensajes': {
        const libro = await guestbook.list(evento.id)
        if (isErr(libro)) return { error: 'No se pudo leer el libro de firmas ahora.' }
        return {
          total: libro.value.length,
          mensajes: libro.value.slice(0, 40).map((m) => ({ mensaje_id: m.responseId, quien: m.responderName ?? m.groupLabel, texto: m.body, agradecido: m.reply !== null })),
          enlace: ruta('/mensajes'),
        }
      }
      case 'cortejo': {
        if (!hasFeature(capacidad, 'plannerCompleto')) return { error: 'El plan de este evento no incluye el cortejo.' }
        const [miembros, ensayos] = await Promise.all([planner.dia.listCourt(evento.id), planner.dia.listRehearsals(evento.id)])
        const nombreDe = new Map(miembros.map((m) => [m.id, m.name]))
        return {
          cortejo: miembros.map((m) => ({ miembro_id: m.id, tipo: m.kind, nombre: m.name, whatsapp: m.whatsapp, apadrina: m.sponsors, confirmado: m.confirmed })),
          ensayos: ensayos.map((e) => ({ ensayo_id: e.id, dia: fechaEnBolivia(e.date), hora: hora(e.date), lugar: e.place, asistentes: e.asistentes.map((id) => nombreDe.get(id) ?? '').filter(Boolean) })),
          enlace: ruta('/planner/cortejo'),
        }
      }
      case 'recepcion': {
        const [lista, actividad, equipo] = await Promise.all([porters.list(evento.id), porters.activity(evento.id), events.team.list(evento.id)])
        return {
          planner: equipo.filter((m) => m.membership === 'planner').map((m) => ({ usuario_id: m.userId, correo: m.email, nombre: m.fullName })),
          recepcion: lista.map((p) => ({ recepcion_id: p.id, nombre: p.name, whatsapp: p.phone, puerta: p.gate, ingresos_registrados: actividad[p.id]?.registradas ?? 0 })),
          cupo_del_plan: capacidad.maxDoorPorters,
          enlace: ruta('/equipo'),
        }
      }
      case 'puerta': {
        const estado = await checkin.state(evento.id)
        if (isErr(estado)) return { error: 'No se pudo leer el ingreso ahora.' }
        const { tally, arrivals, nombres, personas } = estado.value
        const dentro = new Set(arrivals.flatMap((a) => Object.keys(a.personas)))
        const etiqueta = new Map(estado.value.groups.map((g) => [g.id, g.label]))
        return {
          personas_dentro: tally.headsInside,
          personas_esperadas: tally.expectedHeads,
          invitaciones_llegadas: tally.arrivedGroups,
          invitaciones_esperadas: tally.expectedGroups,
          ultimas_llegadas: [...arrivals]
            .sort((a, b) => b.arrivedAt.getTime() - a.arrivedAt.getTime())
            .slice(0, 10)
            .map((a) => ({ invitacion_id: a.guestGroupId, invitacion: etiqueta.get(a.guestGroupId) ?? '', quienes: Object.keys(a.personas).map((id) => nombres[id] ?? '').filter(Boolean), hora: hora(a.arrivedAt), personas: a.arrivedCount })),
          vip_por_llegar: Object.entries(personas).flatMap(([grupo, lista]) => lista.filter((x) => x.vip === true && !dentro.has(x.id)).map((x) => ({ nombre: x.fullName, invitacion_id: grupo }))),
          enlace: ruta('/checkin'),
        }
      }
      case 'encargo': {
        const d = await diseno.leer(evento.id)
        if (d === null) return { encargo: 'Este evento no es de diseño por encargo: la invitación la escribe la persona en Mi invitación.' }
        const PASO: Record<string, string> = { esperando_datos: 'esperando sus datos', en_diseno: 'el atelier la está diseñando', version_enviada: 'hay una versión para revisar', aprobada: 'aprobada' }
        return {
          paso: PASO[d.estado] ?? d.estado,
          rondas_incluidas: d.rondasIncluidas,
          rondas_usadas: d.rondasUsadas,
          entrega_hasta: d.entregaHasta,
          preguntas: preguntasDelEncargo({ estilo: hasFeature(capacidad, 'estilo'), creadoParaTi: hasFeature(capacidad, 'plannerTotal') }),
          ya_respondido: d.brief ?? null,
          enlace: ruta('/configuracion'),
        }
      }
      case 'documentos': {
        if (!hasFeature(capacidad, 'plannerCompleto')) return { error: 'El plan de este evento no incluye documentos.' }
        const [docs, proveedores] = await Promise.all([planner.dia.listDocuments(evento.id), planner.dia.listVendors(evento.id)])
        return {
          documentos: docs.map((d) => ({ documento_id: d.id, tipo: d.kind, nombre: d.originalName, proveedor: proveedores.find((v) => v.id === d.vendorId)?.service ?? null })),
          enlace: ruta('/planner/documentos'),
        }
      }
      case 'extras': {
        const extras = await plans.listActiveExtras()
        return {
          extras: extras.map((x) => {
            const d = extraDisponible(capacidad, x.effect)
            return { extra: x.slug, nombre: x.name, que_hace: NOMBRE_DE_EFECTO[x.effect], precio: formatAmount(x.priceCents, x.currency), disponible: d.ok ? true : d.motivo === 'incluido' ? 'ya lo tiene' : 'pide otro plan' }
          }),
          nota: 'Pedir un extra crea un pedido que se paga por transferencia; se aplica al aprobarse.',
          enlace: ruta('/extras'),
        }
      }
      default:
        return { error: 'No disponible.' }
    }
  }
}

/**
 * La tarjeta del envío: cada invitación pendiente con su mensaje **y su enlace**, que solo tiene el servidor
 * (guardado cifrado). Sin enlace guardado (invitaciones de antes de guardarlo, o nunca preparadas) el mensaje
 * lleva «{enlace}» y la tarjeta lo prepara al tocar, con la misma acción que «Enviar invitaciones».
 */
async function prepararEnvio(evento: EventoDelAsistente, incluirEnviadas: boolean, ruta: (r: string) => string): Promise<ConTarjeta | { error: string } | { total: 0; nota: string }> {
  const [grupos, enlaces, contenido] = await Promise.all([guests.list(evento.id), guests.enlaces(evento.id), events.contenidoEscrito(evento.id)])
  if (isErr(grupos)) return { error: 'No se pudo leer la lista ahora.' }
  const elegidos = grupos.value.filter((g) => g.revokedAt === null && (incluirEnviadas || g.invitationSentAt === null))
  if (elegidos.length === 0) return { total: 0, nota: incluirEnviadas ? 'No hay invitaciones en la lista.' : 'Todas las invitaciones ya salieron. Si quieres reenviar alguna, dímelo.' }
  const fecha = new Intl.DateTimeFormat(evento.locale === 'en' ? 'en-GB' : 'es-BO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(`${(contenido.schedule?.startsAt ?? evento.eventDate).slice(0, 10)}T12:00:00Z`),
  )
  const filas: FilaDeEnvio[] = elegidos.slice(0, 40).map((g) => {
    const token = enlaces.get(g.id)
    const url = token === undefined ? '{enlace}' : conCanal(invitationUrl(token, env.SITE_URL), 'whatsapp')
    return {
      id: g.id,
      nombre: g.label,
      telefono: g.phone ?? null,
      mensaje: renderMessage({ template: evento.messageTemplate, locale: evento.locale, groupLabel: g.label, url, seats: g.seats, fecha, evento: evento.title }),
      conEnlace: token !== undefined,
    }
  })
  return {
    tarjeta: { clase: 'envio', tipo: 'invitacion', filas },
    resultado: {
      total: filas.length,
      quedan_fuera: Math.max(0, elegidos.length - filas.length),
      sin_whatsapp: filas.filter((f) => f.telefono === null).map((f) => f.nombre),
      nota: 'La persona ve un botón de WhatsApp por invitado; al tocarlo se abre su chat con el mensaje y queda marcada enviada.',
      enlace: ruta('/invitados?panel=envio'),
    },
  }
}

/** Lo que rodea a la invitación, para «mi_invitacion»: lo que hay hoy, para no pisarlo al cambiarlo. */
/** Las secciones como las nombra el editor del panel. */
const NOMBRE_DE_SECCION: Record<SectionKey, string> = {
  hero: 'Portada y nombres',
  quote: 'Frase',
  hosts: 'Padres y padrinos',
  schedule: 'Fecha y hora',
  ceremony: 'Ceremonia',
  reception: 'Recepción',
  map: 'Ubicación',
  itinerary: 'Itinerario',
  dressCode: 'Vestimenta',
  music: 'Canción',
  gallery: 'Galería',
  notes: 'Avisos',
  closing: 'Cierre',
}

/**
 * Lo que Luxury necesita para **redactar** la invitación (9 oct): qué secciones pinta este diseño y en qué
 * orden (proponer texto para una que no pinta sería trabajo perdido), su texto de ejemplo como referencia de
 * tono, y el tope de caracteres de cada campo (un texto más largo no se guarda).
 */
function disenoParaRedactar(themeKey: string) {
  const tema = themeFor(themeKey)
  const d = tema.defaultContent
  return {
    nombre: tema.label,
    secciones_en_orden: tema.sections.map((s) => NOMBRE_DE_SECCION[s]),
    ejemplo_del_diseno: {
      texto_sobre_nombres: d.hero?.eyebrow ?? null,
      texto_bajo_nombres: d.hero?.serial ?? null,
      frase: d.quote?.text ?? null,
      vestimenta: d.dressCode === undefined ? null : { titulo: d.dressCode.title ?? null, nota: d.dressCode.note ?? null },
      avisos: (d.notes ?? []).map((n) => ({ titulo: n.title ?? null, texto: n.text ?? null })),
      cierre: d.closing?.text ?? null,
    },
    maximo_de_caracteres: {
      texto_sobre_nombres: topeDeTexto('hero', 'eyebrow'),
      texto_bajo_nombres: topeDeTexto('hero', 'serial'),
      frase: topeDeTexto('quote', 'text'),
      vestimenta_titulo: topeDeTexto('dressCode', 'title'),
      vestimenta_nota: topeDeTexto('dressCode', 'note'),
      aviso_titulo: topeDeTexto('notes', 'title', ['title', 'text']),
      aviso_texto: topeDeTexto('notes', 'text', ['title', 'text']),
      cierre: topeDeTexto('closing', 'text'),
    },
  }
}

async function opcionesDeInvitacion(eventId: string) {
  const [preguntas, formas, general, saveTheDate, comprado, estilo] = await Promise.all([
    rsvp.preguntas.leer(eventId),
    registry.formas(eventId),
    guests.general.leer(eventId),
    events.saveTheDate.leer(eventId),
    events.saveTheDate.comprado(eventId),
    events.estilo.leer(eventId),
  ])
  return {
    preguntas_al_confirmar: { pedir_cancion: preguntas.cancion, menus: preguntas.menus, actos: preguntas.actos },
    formas_de_regalar: { sobres: formas.sobres, sobres_texto: formas.sobresTexto, transferencia: formas.transferencia, banco: formas.banco, titular: formas.titular, cuenta: formas.cuenta, nota: formas.nota, tiene_qr: formas.tieneQr },
    enlace_general: general === null ? 'no hay' : 'activo',
    save_the_date: saveTheDate !== null ? 'activo' : comprado ? 'comprado, sin crear' : 'no comprado (es un extra)',
    estilo: estilo.acento === null && estilo.caligrafia === null && estilo.titulares === null ? 'el del diseño' : estilo,
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
  responder(p: { evento: EventoDelAsistente; capacidad: Allowance; nombreDelPlan: string; rol: string; mensajes: readonly Mensaje[]; ahora: Date; idioma: Idioma; porVoz: boolean; canal?: 'panel' | 'siri'; escribir: Escritor; destinos?: readonly string[] }): AsyncGenerator<Salida> {
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
      canal: p.canal ?? 'panel',
    })
    return conversar({
      modelo,
      // Por Siri no hay pantalla que abrir.
      herramientas: p.canal === 'siri' ? HERRAMIENTAS.filter((h) => h.name !== 'ir_a') : HERRAMIENTAS,
      ejecutar: ejecutorDe(p.evento, p.capacidad, p.ahora, p.escribir, p.destinos),
      registrarUso: (uso) => drizzleUsoDelAsistente.registrar(p.evento.id, mes, uso),
    })({ instrucciones, mensajes: p.mensajes })
  },
}
