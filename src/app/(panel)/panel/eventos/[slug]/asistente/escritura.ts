import { randomUUID } from 'node:crypto'
import { events, planner, registry, rsvp, venue } from '@/app/composition/container'
import { aplicarTextosDelAsistenteAction, ponerFotoDelAsistenteAction, removeMediaAction, renombrarEventoAction } from '@/app/_acciones/events/actions'
import { guardarEstiloAction } from '@/app/_acciones/events/estilo-actions'
import { crearSaveTheDateAction, quitarSaveTheDateAction } from '@/app/_acciones/events/save-the-date-actions'
import { addTeamMemberAction, removeTeamMemberAction } from '@/app/_acciones/events/team-actions'
import { aprobarVersionAction, enviarADisenoAction, pedirCambiosAction } from '@/app/_acciones/events/diseno-actions'
import { addGuestsFromAssistantAction, addPersonAction, removePersonAction, reopenRsvpAction, resendInvitationAction, revokeInvitationAction, setGroupPhoneAction, updatePersonAction } from '@/app/_acciones/guests/actions'
import { crearEnlaceGeneralAction, quitarEnlaceGeneralAction } from '@/app/_acciones/guests/enlace-general-actions'
import { replyAction } from '@/app/_acciones/guestbook/actions'
import { addPaymentAction, addTaskAction, editTaskAction, removeItemAction, removePaymentAction, removeTaskAction, saveBudgetPlanAction, saveItemAction, seedTasksAction, setPaymentPaidAction, toggleTaskAction } from '@/app/_acciones/planner/actions'
import { emitirSuscripcionAction, removeCitaAction, saveCitaAction } from '@/app/_acciones/planner/agenda-actions'
import { emitVendorLinkAction, removeRehearsalAction, revokeVendorLinkAction, saveRehearsalAction, removeDocumentAction, removeCourtMemberAction, removeMomentAction, removeVendorAction, saveCourtMemberAction, saveMomentAction, saveVendorAction, setCourtConfirmedAction, setVendorArrivedAction } from '@/app/_acciones/planner/dia-actions'
import { orderExtraAction } from '@/app/_acciones/plans/extra-actions'
import { addFundAction, addGiftAction, markPurchasedAction, recordContributionAction, releaseGiftAsAtelierAction, removeFundAction, removeGiftAction, updateFundAction, updateGiftAction } from '@/app/_acciones/registry/actions'
import { guardarFormasDeRegalarAction } from '@/app/_acciones/registry/formas-actions'
import { guardarPreguntasAction } from '@/app/_acciones/rsvp/preguntas-actions'
import { addTableAction, addZoneAction, removeZoneAction, updateZoneAction, assignGroupAction, autoAssignAction, removeTableAction, unassignGroupAction, updateTableAction } from '@/app/_acciones/venue/actions'
import { checkInByGroupAction, undoCheckInAction } from '@/app/_acciones/checkin/actions'
import { addPorterAction, removePorterAction } from '@/app/_acciones/checkin/porter-actions'
import type { LlamadaValida } from '@/modules/asistente/domain/herramientas'
import { acentosPara, CALIGRAFIAS, COLORES_DE_ACENTO, TITULARES } from '@/modules/events/domain/estilo'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { isErr } from '@/shared/result'

/**
 * **Lo que Luxury escribe**, con **las mismas acciones de las pantallas** llamadas desde el servidor con la
 * sesión de quien conversa: sus permisos, los límites de su plan, sus validaciones y su auditoría, sin un
 * camino propio a la base. Vive junto a la ruta de Luxury, y no en la composición, porque las acciones
 * importan la composición (un ciclo).
 *
 * Cada operación se hace una por una y se cuenta: lo que salió y lo que no, con su motivo, vuelve al
 * modelo para que lo diga tal cual. Editar mezcla con lo que ya hay: solo cambia lo que se pidió.
 */

type Evento = { readonly id: string; readonly slug: string }
type Paso = { readonly ok: true; readonly hecho: string } | { readonly ok: false; readonly fallo: string }

const formulario = (campos: Record<string, string | readonly string[] | undefined>): FormData => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(campos)) {
    if (v === undefined) continue
    if (typeof v === 'string') fd.set(k, v)
    else for (const x of v) fd.append(k, x)
  }
  return fd
}
const importe = (bs: number) => (Math.round(bs * 100) / 100).toFixed(2)
const centavos = (bs: number) => Math.round(bs * 100)
const deBs = (cents: number | null) => (cents === null ? '' : importe(cents / 100))

/** Las acciones responden de dos formas: `{ status }` (formularios) o `{ ok }` (las demás). */
async function paso(que: string, hacer: () => Promise<unknown>): Promise<Paso> {
  try {
    const r = (await hacer()) as { status?: string; ok?: boolean; message?: string; kind?: string } | null
    const bien = r === null || r === undefined || r.ok === true || r.status === 'success' || r.status === 'created' || (r.kind !== undefined && r.kind !== 'unknown')
    return bien ? { ok: true, hecho: que } : { ok: false, fallo: `${que}: ${r?.message ?? 'no se pudo'}` }
  } catch (causa) {
    // Una guardia que niega (`notFound`) también llega aquí: el plan o el papel no lo permiten.
    const texto = causa instanceof Error ? causa.message : ''
    return { ok: false, fallo: `${que}: ${/NEXT_(NOT_FOUND|HTTP_ERROR)/.test(texto) ? 'tu plan o tu papel en el evento no lo permite' : 'no se pudo hacer ahora'}` }
  }
}

/**
 * Las acciones que terminan en otra página (pedir un extra lleva al pedido) **lanzan** la redirección de
 * Next. Aquí no se navega: se lee adónde iba y se le da el enlace a Luxury.
 */
async function hastaLaRedireccion(hacer: () => Promise<unknown>): Promise<{ destino: string } | { resultado: unknown }> {
  try {
    return { resultado: await hacer() }
  } catch (causa) {
    const digest = typeof causa === 'object' && causa !== null && 'digest' in causa ? String((causa as { digest: unknown }).digest) : ''
    if (digest.startsWith('NEXT_REDIRECT;')) return { destino: digest.split(';')[2] ?? '' }
    throw causa
  }
}

const comparable = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
/** Del nombre que dice la persona («borgoña», «Great Vibes») a la clave que guarda la acción; «original» vacía. */
const claveDe = <T extends { nombre: string }>(lista: readonly T[], dicho: string | null, clave: (x: T) => string): string | null | undefined => {
  if (dicho === null) return null
  if (comparable(dicho) === 'original') return ''
  const x = lista.find((y) => comparable(y.nombre) === comparable(dicho))
  return x === undefined ? undefined : clave(x)
}

function informe(pasos: readonly Paso[], enlace: string) {
  const hechos = pasos.filter((p): p is Extract<Paso, { ok: true }> => p.ok).map((p) => p.hecho)
  const fallos = pasos.filter((p): p is Extract<Paso, { ok: false }> => !p.ok).map((p) => p.fallo)
  return { hecho: hechos, ...(fallos.length > 0 ? { no_se_pudo: fallos } : {}), enlace }
}

export async function escribir(llamada: LlamadaValida, evento: Evento): Promise<unknown> {
  const base = { eventId: evento.id, eventSlug: evento.slug }
  const ruta = (r: string) => `/panel/eventos/${evento.slug}${r}`

  switch (llamada.nombre) {
    case 'registrar_invitados': {
      const r = await addGuestsFromAssistantAction({ eventSlug: evento.slug, invitaciones: llamada.invitaciones })
      return r.status === 'success' ? { hecho: `${r.creadas === 1 ? '1 invitación' : `${r.creadas} invitaciones`} · ${r.personas === 1 ? '1 persona' : `${r.personas} personas`} en la lista`, enlace: ruta('/invitados') } : { error: r.message }
    }

    case 'cambiar_invitados': {
      const pasos: Paso[] = []
      for (const o of llamada.operaciones) {
        if (o.accion === 'quitar') pasos.push(await paso('Persona quitada', () => removePersonAction({ eventSlug: evento.slug, id: o.persona_id! })))
        else if (o.accion === 'asistencia') {
          const valor = { si: 'yes', no: 'no', quiza: 'maybe' }[o.asiste!]
          pasos.push(await paso(`Asistencia marcada: ${o.asiste === 'si' ? 'asiste' : o.asiste === 'no' ? 'no asiste' : 'quizá'}`, () => updatePersonAction({ eventSlug: evento.slug, id: o.persona_id!, attending: valor })))
        } else if (o.accion === 'mover') pasos.push(await paso('Persona movida a otra invitación', () => updatePersonAction({ eventSlug: evento.slug, id: o.persona_id!, guestGroupId: o.invitacion_id! })))
        else if (o.accion === 'reabrir') pasos.push(await paso('Respuesta reabierta: puede volver a confirmar con su mismo enlace', () => reopenRsvpAction({ eventSlug: evento.slug, id: o.invitacion_id! })))
        else if (o.accion === 'revocar') pasos.push(await paso('Invitación revocada: su enlace ya no abre', () => revokeInvitationAction({ status: 'idle' }, formulario({ eventSlug: evento.slug, groupId: o.invitacion_id! }))))
        else if (o.accion === 'enlace_nuevo') {
          const r = await resendInvitationAction({ status: 'idle' }, formulario({ eventSlug: evento.slug, groupId: o.invitacion_id! })).catch(() => null)
          pasos.push(r?.status === 'success' ? { ok: true, hecho: `Enlace nuevo de ${r.label}: ${r.url} (el anterior ya no abre)` } : { ok: false, fallo: `Enlace nuevo: ${r?.status === 'error' ? r.message : 'no se pudo'}` })
        }
        else if (o.accion === 'acompanante') pasos.push(await paso(`${o.nombre} añadido como acompañante`, () => addPersonAction({ eventSlug: evento.slug, guestGroupId: o.invitacion_id!, fullName: o.nombre! })))
        else {
          const parche = {
            ...(o.nombre === null || o.nombre.trim() === '' ? {} : { fullName: o.nombre.trim() }),
            ...(o.vip === null ? {} : { vip: o.vip }),
            ...(o.restriccion === null ? {} : { dietaryNote: o.restriccion.trim() === '' ? null : o.restriccion.trim() }),
          }
          if (Object.keys(parche).length > 0) pasos.push(await paso('Persona editada', () => updatePersonAction({ eventSlug: evento.slug, id: o.persona_id!, ...parche })))
          if (o.telefono !== null && o.invitacion_id !== null) pasos.push(await paso(`WhatsApp cambiado a ${o.telefono}`, () => setGroupPhoneAction({ eventSlug: evento.slug, id: o.invitacion_id!, phone: o.telefono! })))
        }
      }
      return informe(pasos, ruta('/invitados'))
    }

    case 'escribir_invitacion': {
      // La acción valida con `esquemaDeTextos`, que descarta el `nombre` de la herramienta.
      const r = await aplicarTextosDelAsistenteAction({ ...base, textos: llamada })
      if (r.status === 'success') return { hecho: 'Textos guardados en Mi invitación', enlace: ruta('/configuracion') }
      return { error: r.status === 'error' && r.message === 'texto_largo' ? `Un texto es demasiado largo (${r.campo ?? ''}, máximo ${r.maximo ?? ''}).` : 'No se pudieron guardar los textos.' }
    }

    case 'renombrar_evento': {
      const r = await renombrarEventoAction({ status: 'idle', message: '' }, formulario({ eventId: evento.id, title: llamada.titulo }))
      return r.status === 'success' ? { hecho: `El evento ahora se llama «${llamada.titulo}»` } : { error: r.message }
    }

    case 'gestionar_tareas': {
      const tareas = await planner.listTasks(evento.id)
      const pasos: Paso[] = []
      for (const o of llamada.operaciones) {
        if (o.accion === 'plantilla') {
          pasos.push(await paso('Plan de tareas recomendado cargado', () => seedTasksAction({ status: 'idle' }, formulario(base))))
          continue
        }
        const t = o.tarea_id === null ? undefined : tareas.find((x) => x.id === o.tarea_id)
        if (o.accion !== 'crear' && t === undefined) {
          pasos.push({ ok: false, fallo: `No encontré la tarea ${o.tarea_id}` })
          continue
        }
        if (o.accion === 'crear')
          pasos.push(await paso(`Tarea «${o.titulo}» creada`, () => addTaskAction({ status: 'idle' }, formulario({ ...base, title: o.titulo!, stage: 'propias', dueDate: o.vence ?? '', assignee: o.responsable ?? 'anfitrion' }))))
        else if (o.accion === 'editar')
          pasos.push(
            await paso(`Tarea «${o.titulo ?? t!.title}» editada`, () =>
              editTaskAction(
                { status: 'idle' },
                formulario({ ...base, taskId: t!.id, title: o.titulo ?? t!.title, stage: t!.stage, dueDate: o.vence ?? t!.dueDate ?? '', assignee: o.responsable ?? t!.assignee, notes: t!.notes ?? '' }),
              ),
            ),
          )
        else if (o.accion === 'borrar') pasos.push(await paso(`Tarea «${t!.title}» borrada`, () => removeTaskAction({ status: 'idle' }, formulario({ ...base, taskId: t!.id }))))
        else {
          const quiereHecha = o.accion === 'hecha'
          if (quiereHecha === (t!.doneAt !== null)) pasos.push({ ok: true, hecho: `«${t!.title}» ya estaba ${quiereHecha ? 'hecha' : 'pendiente'}` })
          else pasos.push(await paso(`«${t!.title}» marcada ${quiereHecha ? 'hecha' : 'pendiente'}`, () => toggleTaskAction({ status: 'idle' }, formulario({ ...base, taskId: t!.id }))))
        }
      }
      return informe(pasos, ruta('/planner/tareas'))
    }

    case 'gestionar_presupuesto': {
      let partidas = await planner.listBudget(evento.id)
      const pasos: Paso[] = []
      for (const o of llamada.operaciones) {
        const p = o.partida_id === null ? undefined : partidas.find((x) => x.id === o.partida_id)
        const pago = o.pago_id === null ? undefined : partidas.flatMap((x) => x.pagos).find((x) => x.id === o.pago_id)
        switch (o.accion) {
          case 'fijar_total':
            pasos.push(await paso(`Presupuesto total fijado en Bs ${importe(o.importe_bs!)} y repartido por categorías`, () => saveBudgetPlanAction({ status: 'idle' }, formulario({ ...base, modo: 'total', total: importe(o.importe_bs!) }))))
            break
          case 'crear_partida':
            pasos.push(
              await paso(`Partida «${o.concepto}» creada`, () =>
                saveItemAction(
                  { status: 'idle' },
                  formulario({ ...base, itemId: '', category: o.categoria!, concept: o.concepto!, estimated: importe(o.previsto_bs ?? 0), contracted: o.contratado_bs === null ? '' : importe(o.contratado_bs), payer: 'anfitriones', padrinoLabel: '', notes: '' }),
                ),
              ),
            )
            break
          case 'editar_partida':
            if (p === undefined) {
              pasos.push({ ok: false, fallo: `No encontré la partida ${o.partida_id}` })
              break
            }
            pasos.push(
              await paso(`Partida «${o.concepto ?? p.concept}» editada`, () =>
                saveItemAction(
                  { status: 'idle' },
                  formulario({
                    ...base,
                    itemId: p.id,
                    category: o.categoria ?? p.category,
                    concept: o.concepto ?? p.concept,
                    estimated: o.previsto_bs === null ? deBs(p.estimatedCents) : importe(o.previsto_bs),
                    contracted: o.contratado_bs === null ? deBs(p.contractedCents) : importe(o.contratado_bs),
                    payer: p.payer,
                    padrinoLabel: p.padrinoLabel ?? '',
                    notes: p.notes ?? '',
                  }),
                ),
              ),
            )
            break
          case 'borrar_partida':
            pasos.push(p === undefined ? { ok: false, fallo: `No encontré la partida ${o.partida_id}` } : await paso(`Partida «${p.concept}» borrada`, () => removeItemAction({ status: 'idle' }, formulario({ ...base, itemId: p.id }))))
            break
          case 'registrar_pago': {
            if (p === undefined) {
              pasos.push({ ok: false, fallo: `No encontré la partida ${o.partida_id}` })
              break
            }
            const antes = new Set(p.pagos.map((x) => x.id))
            const r = await paso(`Pago de Bs ${importe(o.importe_bs!)} en «${p.concept}» registrado`, () => addPaymentAction({ status: 'idle' }, formulario({ ...base, itemId: p.id, amount: importe(o.importe_bs!), dueDate: o.vence ?? '', label: '' })))
            pasos.push(r)
            if (r.ok && o.pagado === true) {
              partidas = await planner.listBudget(evento.id)
              const nuevo = partidas.find((x) => x.id === p.id)?.pagos.find((x) => !antes.has(x.id))
              if (nuevo !== undefined) pasos.push(await paso('y marcado pagado', () => setPaymentPaidAction({ status: 'idle' }, formulario({ ...base, paymentId: nuevo.id, paid: 'true' }))))
            }
            break
          }
          case 'marcar_pagado':
          case 'marcar_pendiente':
            pasos.push(
              pago === undefined
                ? { ok: false, fallo: `No encontré el pago ${o.pago_id}` }
                : await paso(`Pago marcado ${o.accion === 'marcar_pagado' ? 'pagado' : 'pendiente'}`, () => setPaymentPaidAction({ status: 'idle' }, formulario({ ...base, paymentId: pago.id, paid: o.accion === 'marcar_pagado' ? 'true' : 'false' }))),
            )
            break
          case 'borrar_pago':
            pasos.push(pago === undefined ? { ok: false, fallo: `No encontré el pago ${o.pago_id}` } : await paso('Pago borrado', () => removePaymentAction({ status: 'idle' }, formulario({ ...base, paymentId: pago.id }))))
            break
        }
        partidas = await planner.listBudget(evento.id)
      }
      return informe(pasos, ruta('/planner/presupuesto'))
    }

    case 'gestionar_cronograma': {
      const momentos = await planner.dia.listMoments(evento.id)
      const pasos: Paso[] = []
      for (const o of llamada.operaciones) {
        const m = o.momento_id === null ? undefined : momentos.find((x) => x.id === o.momento_id)
        if (o.accion !== 'crear' && m === undefined) {
          pasos.push({ ok: false, fallo: `No encontré el momento ${o.momento_id}` })
          continue
        }
        if (o.accion === 'borrar') {
          pasos.push(await paso(`«${m!.title}» quitado del cronograma`, () => removeMomentAction({ status: 'idle' }, formulario({ ...base, momentId: m!.id }))))
          continue
        }
        const enInvitacion = o.en_invitacion ?? (m === undefined ? true : m.enInvitacion)
        pasos.push(
          await paso(`«${o.momento ?? m!.title}» a las ${o.hora ?? m!.startsAt} ${m === undefined ? 'añadido' : 'cambiado'}`, () =>
            saveMomentAction(
              { status: 'idle' },
              formulario({
                ...base,
                momentId: m?.id ?? '',
                startsAt: o.hora ?? m!.startsAt,
                durationMin: String(m?.durationMin ?? 30),
                title: o.momento ?? m!.title,
                place: o.lugar ?? m?.place ?? '',
                owner: m?.owner ?? '',
                vendorIds: m?.vendorIds ?? [],
                cue: m?.cue ?? '',
                notes: m?.notes ?? '',
                icono: m?.icono ?? '',
                enInvitacion: enInvitacion ? 'on' : undefined,
              }),
            ),
          ),
        )
      }
      return informe(pasos, ruta('/planner/cronograma'))
    }

    case 'gestionar_agenda': {
      const citas = await planner.dia.listCitas(evento.id)
      const pasos: Paso[] = []
      for (const o of llamada.operaciones) {
        if (o.accion === 'suscribir') {
          const r = await emitirSuscripcionAction({ status: 'idle' }, formulario(base)).catch(() => null)
          pasos.push(r?.status === 'success' && 'enlace' in r ? { ok: true, hecho: `Enlace para el calendario del celular: ${r.enlace}` } : { ok: false, fallo: `Calendario: ${r !== null && 'message' in r ? r.message : 'no se pudo'}` })
          continue
        }
        const c = o.cita_id === null ? undefined : citas.find((x) => x.id === o.cita_id)
        if (o.accion !== 'crear' && c === undefined) {
          pasos.push({ ok: false, fallo: `No encontré la cita ${o.cita_id}` })
          continue
        }
        if (o.accion === 'borrar') {
          pasos.push(await paso(`Cita «${c!.title}» borrada`, () => removeCitaAction({ status: 'idle' }, formulario({ ...base, citaId: c!.id }))))
          continue
        }
        const [diaActual, horaActual] = (c?.startsAt ?? 'T').split('T')
        pasos.push(
          await paso(`Cita «${o.titulo ?? c!.title}» ${c === undefined ? 'agendada' : 'cambiada'}`, () =>
            saveCitaAction(
              { status: 'idle' },
              formulario({
                ...base,
                citaId: c?.id ?? '',
                title: o.titulo ?? c!.title,
                dia: o.dia ?? diaActual ?? '',
                hora: o.hora ?? horaActual ?? '',
                durationMin: String(o.minutos ?? c?.durationMin ?? 60),
                place: o.lugar ?? c?.place ?? '',
                vendorId: c?.vendorId ?? '',
                notes: c?.notes ?? '',
              }),
            ),
          ),
        )
      }
      return informe(pasos, ruta('/planner/agenda'))
    }

    case 'gestionar_proveedores': {
      const proveedores = await planner.dia.listVendors(evento.id)
      const pasos: Paso[] = []
      for (const o of llamada.operaciones) {
        const v = o.proveedor_id === null ? undefined : proveedores.find((x) => x.id === o.proveedor_id)
        if (o.accion !== 'crear' && v === undefined) {
          pasos.push({ ok: false, fallo: `No encontré al proveedor ${o.proveedor_id}` })
          continue
        }
        if (o.accion === 'borrar') {
          pasos.push(await paso(`Proveedor «${v!.service}» borrado`, () => removeVendorAction({ status: 'idle' }, formulario({ ...base, vendorId: v!.id }))))
          continue
        }
        if (o.accion === 'enlace') {
          const r = await emitVendorLinkAction({ status: 'idle' }, formulario({ ...base, vendorId: v!.id })).catch(() => null)
          pasos.push(r?.status === 'success' && r.enlace !== undefined ? { ok: true, hecho: `Enlace de «${v!.service}»: ${r.enlace} (el anterior ya no abre)` } : { ok: false, fallo: `Enlace de «${v!.service}»: ${r?.status === 'error' ? r.message : 'no se pudo'}` })
          continue
        }
        if (o.accion === 'quitar_enlace') {
          pasos.push(await paso(`Enlace de «${v!.service}» apagado`, () => revokeVendorLinkAction({ status: 'idle' }, formulario({ ...base, vendorId: v!.id }))))
          continue
        }
        if (o.accion === 'llego' || o.accion === 'no_llego') {
          const llego = o.accion === 'llego'
          pasos.push(await paso(`«${v!.service}» ${llego ? 'llegó' : 'sin llegar'}`, () => setVendorArrivedAction({ status: 'idle' }, formulario({ ...base, vendorId: v!.id, arrived: String(llego) }))))
          continue
        }
        pasos.push(
          await paso(`Proveedor «${o.servicio ?? v!.service}» ${v === undefined ? 'añadido' : 'cambiado'}`, () =>
            saveVendorAction(
              { status: 'idle' },
              formulario({
                ...base,
                vendorId: v?.id ?? '',
                service: o.servicio ?? v!.service,
                company: o.empresa ?? v?.company ?? '',
                contactName: o.contacto ?? v?.contactName ?? '',
                whatsapp: o.whatsapp ?? v?.whatsapp ?? '',
                email: v?.email ?? '',
                status: o.estado ?? v?.status ?? 'cotizando',
                arrivalTime: v?.arrivalTime ?? '',
                setupNotes: v?.setupNotes ?? '',
                price: o.precio_bs === null ? '' : importe(o.precio_bs),
                category: o.categoria ?? '',
              }),
            ),
          ),
        )
      }
      return informe(pasos, ruta('/planner/proveedores'))
    }

    case 'gestionar_mesas': {
      const salon = await venue.seating(evento.id)
      const mesas = isErr(salon) ? [] : salon.value.tables
      const zonas = isErr(salon) ? [] : salon.value.zones
      const pasos: Paso[] = []
      for (const o of llamada.operaciones) {
        const t = o.mesa_id === null ? undefined : mesas.find((x) => x.id === o.mesa_id)
        switch (o.accion) {
          case 'crear':
            pasos.push(await paso(`Mesa «${o.nombre}» creada (${o.lugares} lugares)`, () => addTableAction({ ...base, label: o.nombre!, capacity: o.lugares!, shape: 'round' })))
            break
          case 'editar':
            pasos.push(
              t === undefined
                ? { ok: false, fallo: `No encontré la mesa ${o.mesa_id}` }
                : await paso(`Mesa «${o.nombre ?? t.label}» cambiada`, () => updateTableAction({ ...base, id: t.id, label: o.nombre ?? t.label, capacity: o.lugares ?? t.capacity, shape: t.shape, notes: t.notes })),
            )
            break
          case 'borrar':
            pasos.push(t === undefined ? { ok: false, fallo: `No encontré la mesa ${o.mesa_id}` } : await paso(`Mesa «${t.label}» borrada`, () => removeTableAction({ ...base, id: t.id })))
            break
          case 'sentar':
            pasos.push(await paso(`Invitación sentada en ${t?.label ?? 'la mesa'}`, () => assignGroupAction({ ...base, groupId: o.invitacion_id!, tableId: o.mesa_id! })))
            break
          case 'levantar':
            pasos.push(await paso('Invitación sin mesa', () => unassignGroupAction({ ...base, groupId: o.invitacion_id! })))
            break
          case 'autoasignar':
            pasos.push(await paso('Mesas repartidas solas', () => autoAssignAction(base)))
            break
          case 'editar_zona':
          case 'borrar_zona': {
            const z = zonas.find((x) => x.id === o.zona_id)
            if (z === undefined) pasos.push({ ok: false, fallo: `No encontré la zona ${o.zona_id}` })
            else if (o.accion === 'borrar_zona') pasos.push(await paso(`Zona «${z.label}» quitada del plano`, () => removeZoneAction({ ...base, id: z.id })))
            else pasos.push(await paso(`Zona «${o.nombre ?? z.label}» cambiada`, () => updateZoneAction({ ...base, id: z.id, kind: o.zona ?? z.kind, label: o.nombre ?? z.label, x: z.x, y: z.y, w: z.w, h: z.h })))
            break
          }
          case 'zona':
            pasos.push(await paso(`Zona «${o.nombre ?? o.zona}» puesta en el plano`, () => addZoneAction({ ...base, kind: o.zona!, label: o.nombre ?? '' })))
            break
        }
      }
      return informe(pasos, ruta('/mesas'))
    }

    case 'gestionar_regalos': {
      const mesa = await registry.list(evento.id)
      const regalos = isErr(mesa) ? [] : mesa.value.gifts
      const fondos = isErr(mesa) ? [] : mesa.value.funds.map((f) => f.fund)
      const pasos: Paso[] = []
      for (const o of llamada.operaciones) {
        const g = o.regalo_id === null ? undefined : regalos.find((x) => x.id === o.regalo_id)
        const f = o.fondo_id === null ? undefined : fondos.find((x) => x.id === o.fondo_id)
        const sinFondo: Paso = { ok: false, fallo: `No encontré el fondo ${o.fondo_id}` }
        switch (o.accion) {
          case 'liberar':
            pasos.push(g === undefined ? { ok: false, fallo: `No encontré el regalo ${o.regalo_id}` } : await paso(`«${g.name}» vuelve a estar disponible`, () => releaseGiftAsAtelierAction({ ...base, id: g.id })))
            break
          case 'editar_fondo':
            pasos.push(
              f === undefined
                ? sinFondo
                : await paso(`Fondo «${o.nombre ?? f.name}» cambiado`, () =>
                    updateFundAction({ ...base, id: f.id, name: o.nombre ?? f.name, description: o.descripcion ?? f.description, goalCents: o.precio_bs === null ? f.goalCents : centavos(o.precio_bs) }),
                  ),
            )
            break
          case 'borrar_fondo':
            pasos.push(f === undefined ? sinFondo : await paso(`Fondo «${f.name}» borrado`, () => removeFundAction({ ...base, id: f.id })))
            break
          case 'aporte':
            pasos.push(
              f === undefined
                ? sinFondo
                : await paso(`Aporte de ${o.quien} (Bs ${importe(o.precio_bs!)}) anotado en «${f.name}»`, () =>
                    recordContributionAction({ ...base, fundId: f.id, guestGroupId: null, displayName: o.quien!, amountCents: centavos(o.precio_bs!), method: o.metodo ?? 'other', message: o.descripcion }),
                  ),
            )
            break
          case 'crear':
            pasos.push(await paso(`Regalo «${o.nombre}» añadido`, () => addGiftAction({ ...base, name: o.nombre!, priceCents: centavos(o.precio_bs!), store: o.tienda, url: o.enlace })))
            break
          case 'crear_fondo':
            pasos.push(await paso(`Fondo «${o.nombre}» creado`, () => addFundAction({ ...base, name: o.nombre!, description: o.descripcion, goalCents: centavos(o.precio_bs!) })))
            break
          case 'editar':
            pasos.push(
              g === undefined
                ? { ok: false, fallo: `No encontré el regalo ${o.regalo_id}` }
                : await paso(`Regalo «${o.nombre ?? g.name}» cambiado`, () =>
                    updateGiftAction({ ...base, id: g.id, name: o.nombre ?? g.name, priceCents: o.precio_bs === null ? g.priceCents : centavos(o.precio_bs), store: o.tienda ?? g.store, url: o.enlace ?? g.url }),
                  ),
            )
            break
          case 'borrar':
            pasos.push(g === undefined ? { ok: false, fallo: `No encontré el regalo ${o.regalo_id}` } : await paso(`Regalo «${g.name}» borrado`, () => removeGiftAction({ ...base, id: g.id })))
            break
          case 'comprado':
            pasos.push(g === undefined ? { ok: false, fallo: `No encontré el regalo ${o.regalo_id}` } : await paso(`«${g.name}» marcado comprado`, () => markPurchasedAction({ ...base, id: g.id })))
            break
        }
      }
      return informe(pasos, ruta('/regalos'))
    }

    case 'agradecer_mensajes': {
      const pasos: Paso[] = []
      for (const a of llamada.agradecimientos) pasos.push(await paso('Mensaje agradecido', () => replyAction({ ...base, responseId: a.mensaje_id, text: a.respuesta })))
      return informe(pasos, ruta('/mensajes'))
    }

    case 'registrar_ingreso': {
      const r = await paso('Ingreso registrado', () => checkInByGroupAction({ ...base, groupId: llamada.invitacion_id, scanId: randomUUID(), arrivedCount: llamada.personas, scannedAtMs: Date.now() }))
      return informe([r], ruta('/checkin'))
    }

    case 'opciones_de_invitacion': {
      const o = llamada
      const pasos: Paso[] = []
      if (o.enlace_general !== null) {
        const crear = o.enlace_general === 'crear'
        const r = await (crear ? crearEnlaceGeneralAction : quitarEnlaceGeneralAction)({ status: 'idle', message: '' }, formulario(base)).catch(() => null)
        pasos.push(r?.status === 'success' ? { ok: true, hecho: crear ? `Enlace general: ${r.url ?? ''} (si había otro, ya no abre)` : 'Enlace general quitado' } : { ok: false, fallo: `Enlace general: ${r?.message ?? 'no se pudo'}` })
      }
      if (o.save_the_date !== null) {
        const crear = o.save_the_date === 'crear'
        const r = await (crear ? crearSaveTheDateAction : quitarSaveTheDateAction)({ status: 'idle', message: '' }, formulario(base)).catch(() => null)
        pasos.push(r?.status === 'success' ? { ok: true, hecho: crear ? `Save the date: ${r.url ?? ''}` : 'Save the date quitado' } : { ok: false, fallo: `Save the date: ${r?.message ?? 'no se pudo'}` })
      }
      if (o.pedir_cancion !== null || o.menus !== null || o.actos !== null) {
        const hoy = await rsvp.preguntas.leer(evento.id)
        const cancion = o.pedir_cancion ?? hoy.cancion
        pasos.push(
          await paso('Preguntas al confirmar guardadas', () =>
            guardarPreguntasAction({ status: 'idle', message: '' }, formulario({ ...base, cancion: cancion ? 'on' : undefined, menus: (o.menus ?? hoy.menus).join('\n'), actos: (o.actos ?? hoy.actos).join('\n') })),
          ),
        )
      }
      const formas = [o.sobres, o.sobres_texto, o.transferencia, o.banco, o.titular, o.cuenta, o.nota_de_regalo]
      if (formas.some((x) => x !== null)) {
        const hoy = await registry.formas(evento.id)
        const sobres = o.sobres ?? hoy.sobres
        const transferencia = o.transferencia ?? hoy.transferencia
        pasos.push(
          await paso('Formas de regalar guardadas', () =>
            guardarFormasDeRegalarAction(
              { status: 'idle' },
              formulario({
                ...base,
                sobres: sobres ? 'on' : undefined,
                sobresTexto: o.sobres_texto ?? hoy.sobresTexto ?? '',
                transferencia: transferencia ? 'on' : undefined,
                banco: o.banco ?? hoy.banco ?? '',
                titular: o.titular ?? hoy.titular ?? '',
                cuenta: o.cuenta ?? hoy.cuenta ?? '',
                nota: o.nota_de_regalo ?? hoy.nota ?? '',
              }),
            ),
          ),
        )
      }
      if (pasos.length === 0) return { error: 'No me dijiste qué cambiar.' }
      return informe(pasos, ruta('/configuracion'))
    }

    case 'estilo_de_invitacion': {
      const [ev, hoy] = await Promise.all([events.getByIdUnscoped(evento.id), events.estilo.leer(evento.id)])
      const admite = isErr(ev) ? undefined : themeFor(ev.value.themeKey).estilo
      const colores = admite?.acento === undefined ? [] : acentosPara(admite.acento)
      const opciones = {
        colores: colores.map((c) => c.nombre),
        caligrafias: admite?.caligrafia === undefined ? [] : CALIGRAFIAS.map((c) => c.nombre),
        titulares: admite?.titulares === undefined ? [] : TITULARES.map((c) => c.nombre),
      }
      const acento = claveDe(COLORES_DE_ACENTO, llamada.color, (c) => c.hex)
      const caligrafia = claveDe(CALIGRAFIAS, llamada.caligrafia, (c) => c.clave)
      const titulares = claveDe(TITULARES, llamada.titulares, (c) => c.clave)
      if (acento === undefined || caligrafia === undefined || titulares === undefined) return { error: 'No conozco ese color o esa letra.', este_diseno_admite: opciones }
      const r = await guardarEstiloAction(
        { status: 'idle', message: '' },
        formulario({ ...base, acento: acento ?? hoy.acento ?? '', caligrafia: caligrafia ?? hoy.caligrafia ?? '', titulares: titulares ?? hoy.titulares ?? '' }),
      ).catch(() => null)
      return r?.status === 'success' ? { hecho: 'Estilo guardado', enlace: ruta('/configuracion') } : { error: r?.message ?? 'No se pudo guardar el estilo.', este_diseno_admite: opciones }
    }

    case 'gestionar_cortejo': {
      const miembros = await planner.dia.listCourt(evento.id)
      const pasos: Paso[] = []
      for (const o of llamada.operaciones) {
        const m = o.miembro_id === null ? undefined : miembros.find((x) => x.id === o.miembro_id)
        if (o.accion !== 'crear' && m === undefined) {
          pasos.push({ ok: false, fallo: `No encontré a ${o.miembro_id} en el cortejo` })
          continue
        }
        if (o.accion === 'borrar') pasos.push(await paso(`${m!.name} quitado del cortejo`, () => removeCourtMemberAction({ status: 'idle' }, formulario({ ...base, memberId: m!.id }))))
        else if (o.accion === 'confirmar' || o.accion === 'desconfirmar')
          pasos.push(await paso(`${m!.name} ${o.accion === 'confirmar' ? 'confirmado' : 'sin confirmar'}`, () => setCourtConfirmedAction({ status: 'idle' }, formulario({ ...base, memberId: m!.id, confirmed: String(o.accion === 'confirmar') }))))
        else
          pasos.push(
            await paso(`${o.nombre ?? m!.name} ${m === undefined ? 'sumado al' : 'cambiado en el'} cortejo`, () =>
              saveCourtMemberAction(
                { status: 'idle' },
                formulario({ ...base, memberId: m?.id ?? '', kind: o.tipo ?? m!.kind, name: o.nombre ?? m!.name, whatsapp: o.whatsapp ?? m?.whatsapp ?? '', sponsors: o.apadrina ?? m?.sponsors ?? '', size: m?.size ?? '', budgetItemId: m?.budgetItemId ?? '' }),
              ),
            ),
          )
      }
      return informe(pasos, ruta('/planner/cortejo'))
    }

    case 'gestionar_recepcion': {
      if (llamada.accion === 'quitar') return informe([await paso('Quitado de recepción: su enlace ya no abre', () => removePorterAction({ status: 'idle' }, formulario({ ...base, porterId: llamada.recepcion_id! })))], ruta('/equipo'))
      const r = await addPorterAction({ status: 'idle' }, formulario({ ...base, name: llamada.persona!, phone: llamada.whatsapp ?? '', gate: llamada.puerta ?? '' })).catch(() => null)
      if (r?.status !== 'created') return { error: r?.status === 'error' ? r.message : 'No se pudo sumar a recepción.' }
      return { hecho: `${r.nombre} está en recepción`, enlace_de_la_puerta: r.enlace, pin: r.pin, nota: 'Funciona el día del evento. Dale el enlace y el PIN tal cual.', enlace: ruta('/equipo') }
    }

    case 'sumar_planner': {
      const r = await addTeamMemberAction({ status: 'idle' }, formulario({ ...base, kind: 'planner', email: llamada.correo })).catch(() => null)
      if (r?.status !== 'success') return { error: r?.status === 'error' ? r.message : 'No se pudo dar el acceso.' }
      return { hecho: r.message, ...(r.password === undefined ? {} : { contrasena_provisional: r.password }), enlace: ruta('/equipo') }
    }

    case 'deshacer_ingreso':
      return informe([await paso('Ingreso deshecho', () => undoCheckInAction({ ...base, groupId: llamada.invitacion_id, personId: llamada.persona_id }))], ruta('/checkin'))

    case 'poner_foto': {
      const r = await ponerFotoDelAsistenteAction({ ...base, fotoId: llamada.foto_id, donde: llamada.donde, casilla: llamada.casilla, rotulo: llamada.rotulo })
      return r.status === 'success' ? { hecho: `Foto puesta en ${r.donde}`, enlace: ruta('/configuracion') } : { error: r.message }
    }

    case 'qr_de_transferencia': {
      const foto = await events.media.read(llamada.foto_id)
      if (foto === null || foto.eventId !== evento.id || !foto.contentType.startsWith('image/')) return { error: 'Esa imagen no está en este evento. Adjúntala otra vez.' }
      const hoy = await registry.formas(evento.id)
      const fd = formulario({ ...base, sobres: hoy.sobres ? 'on' : undefined, sobresTexto: hoy.sobresTexto ?? '', transferencia: 'on', banco: hoy.banco ?? '', titular: hoy.titular ?? '', cuenta: hoy.cuenta ?? '', nota: hoy.nota ?? '' })
      fd.set('qr', new File([foto.bytes.slice()], 'qr-del-banco', { type: foto.contentType }))
      const r = await guardarFormasDeRegalarAction({ status: 'idle' }, fd).catch(() => null)
      if (r?.status !== 'success') return { error: r?.status === 'error' ? r.message : 'No se pudo guardar el QR.' }
      // El QR vive en las formas de regalar: la copia subida como foto no cuenta para las fotos del plan.
      await removeMediaAction({ status: 'idle' }, formulario({ ...base, mediaId: llamada.foto_id })).catch(() => null)
      return {
        hecho: 'QR de la transferencia guardado y transferencia encendida',
        ...(hoy.banco === null || hoy.cuenta === null ? { falta: 'el banco, el titular y el número de cuenta para que se vea completa' } : {}),
        enlace: ruta('/regalos'),
      }
    }

    case 'borrar_documento':
      return informe([await paso('Documento borrado', () => removeDocumentAction({ status: 'idle' }, formulario({ ...base, documentId: llamada.documento_id })))], ruta('/planner/documentos'))

    case 'gestionar_ensayos': {
      const pasos: Paso[] = []
      for (const o of llamada.operaciones) {
        if (o.accion === 'borrar') pasos.push(await paso('Ensayo borrado', () => removeRehearsalAction({ status: 'idle' }, formulario({ ...base, rehearsalId: o.ensayo_id! }))))
        else {
          const asistentes = o.asistentes ?? (await planner.dia.listCourt(evento.id)).map((m) => m.id)
          pasos.push(await paso(`Ensayo agendado el ${o.fecha_hora!.replace('T', ' a las ')}`, () => saveRehearsalAction({ status: 'idle' }, formulario({ ...base, date: o.fecha_hora!, place: o.lugar ?? '', notes: o.nota ?? '', asistentes }))))
        }
      }
      return informe(pasos, ruta('/planner/cortejo'))
    }

    case 'gestionar_encargo': {
      const o = llamada
      const r =
        o.accion === 'pedir_cambios'
          ? await pedirCambiosAction({ status: 'idle', message: '' }, formulario({ ...base, mensaje: o.mensaje ?? '' })).catch(() => null)
          : o.accion === 'aprobar'
            ? await aprobarVersionAction({ status: 'idle', message: '' }, formulario(base)).catch(() => null)
            : await enviarADisenoAction(
                { status: 'idle', message: '' },
                formulario({
                  ...base,
                  ...Object.fromEntries(Object.entries(o.respuestas ?? {}).flatMap(([pregunta, valor]) => (valor === null ? [] : [[`brief_${pregunta}`, valor]]))),
                }),
              ).catch(() => null)
      return r?.status === 'success' ? { hecho: r.message, enlace: ruta('/configuracion') } : { error: r?.message ?? 'No se pudo hacer ahora.' }
    }

    case 'quitar_planner': {
      const r = await removeTeamMemberAction({ status: 'idle' }, formulario({ ...base, userId: llamada.usuario_id })).catch(() => null)
      return r?.status === 'success' ? { hecho: r.message, enlace: ruta('/equipo') } : { error: r?.status === 'error' ? r.message : 'No se pudo quitar.' }
    }

    case 'pedir_extra': {
      const r = await hastaLaRedireccion(() => orderExtraAction({ status: 'idle' }, formulario({ ...base, addonSlug: llamada.extra })))
      if ('destino' in r) return { hecho: 'Pedido creado. Se paga por transferencia y se aplica al aprobarse.', pagar_aqui: r.destino }
      const estado = r.resultado as { status: string; message?: string }
      return estado.status === 'success' ? { hecho: estado.message } : { error: estado.message ?? 'No se pudo pedir el extra.' }
    }

    default:
      return null
  }
}
