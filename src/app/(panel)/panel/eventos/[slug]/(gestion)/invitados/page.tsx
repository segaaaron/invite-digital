import { EmptyState } from '@/shared/design/ui/panel/estados'
import Link from 'next/link'
import { invitationUrl } from '@/modules/guests'
import { env } from '@/shared/config/env'
import { notFound } from 'next/navigation'
import { checkin, events, guests, plans, reminders, rsvp, venue } from '@/app/composition/container'
import { ExportCsvButton } from '@/modules/guests/ui/ExportCsvButton'
import { PeopleTable, type PersonRowView } from '@/modules/guests/ui/PeopleTable'
import { DeliveryPanel } from '@/modules/guests/ui/DeliveryPanel'
import { ImportPanel } from '@/modules/guests/ui/ImportPanel'
import { GuestDialog } from '@/modules/guests/ui/GuestDialog'
import { EditPersonDialog } from '@/modules/guests/ui/EditPersonDialog'
import { PassDialog } from '@/modules/guests/ui/PassDialog'
import { canAddGroup } from '@/modules/plans'
import { AllowanceNotice } from '@/modules/plans/ui/AllowanceNotice'
import { mejorarPara } from '@/app/(panel)/panel/_carcasa/mejorar'
import type { GuestGroupRowView } from '@/modules/guests/ui/invitation-row'
import { loQueFaltaParaInvitar, pideNombres } from '@/modules/events'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { requireSession } from '@/app/_acciones/sesion'
import { ReminderQueue } from '@/modules/reminders/ui/ReminderQueue'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard, PanelCardLink, StatCard } from '@/shared/design/ui/panel/cards'
import { CheckIcon, ClockIcon, MailIcon, UsersIcon } from '@/shared/design/ui/icons'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'
import { EnVivo } from '@/shared/design/ui/panel/EnVivo'

export const metadata = { title: 'Invitados' }

// Los invitados responden mientras el atelier mira la lista: esta página no se cachea.
export const dynamic = 'force-dynamic'

/**
 * La vista de gestión de invitados, propia, como en la maqueta.
 *
 * Las altas y el reparto **no** viven abiertos en la página: la maqueta pone un botón en
 * la cabecera y la lista debajo, y con cuatro formularios desplegados la lista quedaba a
 * dos pantallas de scroll. Se abren por la barra de direcciones (`?panel=alta`,
 * `?panel=envio`), así que el estado es enlazable y sobrevive al guardado, que es lo que
 * un modal con estado en el cliente no da.
 */
export default async function InvitadosPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ panel?: string; persona?: string }>
}) {
  const actor = await requireSession()
  const { slug } = await params
  const { panel, persona } = await searchParams

  const event = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  // Antes de invitar, la invitación: quién, cuándo y dónde. Sin eso cada enlace abre una
  // invitación que no dice de quién es. Aquí se apaga y se explica; el corte de verdad está
  // en las acciones. Se mide por el dato, no por el estado del evento: un borrador con la
  // invitación escrita puede prepararse en paralelo.
  const contenido = await events.contentFor(event.value.id, {})
  const faltaEnInvitacion = loQueFaltaParaInvitar(contenido, { pideNombres: pideNombres(themeFor(event.value.themeKey)) })
  const invitacionVacia = faltaEnInvitacion.length > 0

  const groups = await guests.list(event.value.id)
  // Una sola consulta para las respuestas de todos los grupos. Antes eran dos por grupo y
  // en serie: doscientos grupos, cuatrocientos viajes a la base para pintar una tabla.
  const ultimas = await rsvp.latestByEvent(event.value.id)
  const filas: GuestGroupRowView[] = isErr(groups)
    ? []
    : groups.value.map((group) => ({ ...group, confirmed: ultimas.get(group.id)?.attending ?? null }))

  // Las personas cargadas dentro de cada grupo, que es lo que la maqueta lista.
  const personas = await guests.listPeople(event.value.id)
  const salon = await venue.seating(event.value.id).catch(() => null)

  const mesaDeGrupo = new Map<string, string>()
  if (salon !== null && !isErr(salon)) {
    for (const mesa of salon.value.tables) {
      for (const grupo of mesa.groups) mesaDeGrupo.set(grupo.id, mesa.label)
    }
  }

  // A qué hora entró cada persona, si el plan trae la puerta. Una lectura fallida no tumba la lista.
  const conPuerta = !isErr(await plans.requireFeature(event.value.id, 'checkin'))
  const puerta = conPuerta ? await checkin.state(event.value.id).catch(() => null) : null
  const llegadaDe = new Map<string, Date>(
    puerta === null || isErr(puerta) ? [] : puerta.value.arrivals.flatMap((a) => Object.entries(a.personas)),
  )

  const etiquetaDeGrupo = new Map(filas.map((f) => [f.id, f.label]))
  const respuestaDeGrupo = new Map([...ultimas].map(([id, r]) => [id, r.respondedAt]))
  const filasPersona: PersonRowView[] = isErr(personas)
    ? []
    : personas.value.map((persona) => ({
        id: persona.id,
        fullName: persona.fullName,
        groupId: persona.guestGroupId,
        groupLabel: etiquetaDeGrupo.get(persona.guestGroupId) ?? '—',
        llegoA: llegadaDe.get(persona.id) ?? null,
        isCompanion: persona.isCompanion,
        dietaryNote: persona.dietaryNote,
        vip: persona.vip,
        attending: persona.attending,
        tableLabel: mesaDeGrupo.get(persona.guestGroupId) ?? null,
        // «Enviado» y «Confirmado» son del **grupo**: el enlace y la respuesta lo son.
        // La maqueta los enseña en la fila de cada persona, y de ahí salen.
        sentAt: filas.find((f) => f.id === persona.guestGroupId)?.invitationSentAt ?? null,
        respondedAt: respuestaDeGrupo.get(persona.guestGroupId) ?? null,
      }))

  // La cola de recordatorios del día. Si la lectura falla, la tarjeta lo dice: una cola
  // vacía afirmaría que no hay nadie por recordar, que es lo contrario de lo que pasó.
  const cola = await reminders.due({
    id: event.value.id,
    locale: event.value.locale,
    rsvpDeadline: new Date(`${event.value.rsvpDeadline}T00:00:00Z`),
  })

  const capacidad = await plans.allowanceFor(event.value.id)
  const limite = isErr(capacidad) ? null : capacidad.value.maxGuestGroups

  const base = `/panel/eventos/${event.value.slug}/invitados`
  // El enlace de cada invitación, guardado cifrado: el envío y el pase lo vuelven a enseñar.
  const [enlaces, codigos] = await Promise.all([guests.enlaces(event.value.id), guests.codigos(event.value.id)])
  const enlaceDe = (groupId: string) => {
    const token = enlaces.get(groupId)
    return token === undefined ? null : invitationUrl(token, env.SITE_URL)
  }
  // Con la invitación sin terminar, ni el alta ni la importación se abren, tampoco
  // escribiendo `?panel=alta` a mano.
  const abierto =
    panel === 'envio' || (!invitacionVacia && (panel === 'alta' || panel === 'importar')) ? panel : null

  // «✎» y «▣» abren su diálogo con la persona en la dirección. Una persona que ya no
  // existe —la lista se recarga sola mientras el atelier mira— no abre nada, en vez de
  // reventar la página entera.
  const enFoco = persona === undefined ? null : (filasPersona.find((f) => f.id === persona) ?? null)
  const personaCompleta =
    enFoco === null || isErr(personas) ? null : (personas.value.find((p) => p.id === enFoco.id) ?? null)
  const grupoDeLaPersona = enFoco === null ? null : (filas.find((f) => f.id === enFoco.groupId) ?? null)

  // A una invitación revocada no se mueve a nadie; la suya se ofrece igual, o el selector
  // abriría diciendo otra.
  const eleccionDeGrupos = filas
    .filter((fila) => fila.revokedAt === null || fila.id === enFoco?.groupId)
    .map((fila) => ({ id: fila.id, label: fila.label }))

  return (
    <>
      <PanelHeader
        actions={
          <>
            <ExportCsvButton
              eventSlug={event.value.slug}
              people={filasPersona.map((p) => ({
                fullName: p.fullName,
                groupLabel: p.groupLabel,
                attending: p.attending,
                isCompanion: p.isCompanion,
                dietaryNote: p.dietaryNote,
                vip: p.vip,
                tableLabel: p.tableLabel,
              }))}
              rows={filas}
            />
            <PanelButton
              disabled={invitacionVacia}
              href={abierto === 'importar' ? base : `${base}?panel=importar`}
              title={invitacionVacia ? 'Termina tu invitación antes de cargar invitados' : undefined}
            >
              ↑ Importar CSV
            </PanelButton>
            <PanelButton href={abierto === 'envio' ? base : `${base}?panel=envio`}>✉ Enviar invitaciones</PanelButton>
            <PanelButton
              disabled={invitacionVacia}
              href={`${base}?panel=alta`}
              title={invitacionVacia ? 'Termina tu invitación antes de añadir invitados' : undefined}
              variant="primary"
            >
              + Añadir invitado
            </PanelButton>
          </>
        }
        kicker="Gestión"
        meta={`${filasPersona.length} invitados en total`}
        title="Invitados"
      />
      <EnVivo modo="aviso" tipos={['rsvp']} url={`/panel/eventos/${event.value.slug}/en-vivo`} />

      {/* El orden del trabajo, dicho en la propia pantalla: primero la invitación, luego la
          gente. Sin esto se podían repartir enlaces a una invitación en blanco. */}
      {invitacionVacia ? (
        <PanelCard className="mb-4.5">
          <div className="flex flex-col gap-3">
            <p className="font-display text-[20px] text-ink">Primero, termina tu invitación</p>
            <p className="max-w-[62ch] text-[13.5px] leading-[1.7] text-ink-soft">
              Es lo que verán tus invitados al abrir su enlace, así que no se puede añadir a nadie hasta que diga de quién
              es, cuándo y dónde. Falta:
            </p>
            <ul className="list-disc pl-5 text-[13.5px] leading-[1.7] text-ink">
              {faltaEnInvitacion.map((falta) => (
                <li key={falta}>{falta}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <PanelButton href={`/panel/eventos/${event.value.slug}/configuracion`} variant="primary">
                Terminar mi invitación
              </PanelButton>
              <PanelButton href={`/panel/eventos/${event.value.slug}/vista-previa`}>Ver cómo va quedando</PanelButton>
            </div>
          </div>
        </PanelCard>
      ) : null}

      {/* «+ Añadir invitado» abre el diálogo de la maqueta, con sus nueve campos. */}
      {abierto === 'alta' ? (
        <GuestDialog
          atLimit={!canAddGroup(limite, filas.length)}
          closeHref={base}
          eventId={event.value.id}
          eventSlug={event.value.slug}
          notice={
            <AllowanceNotice currentGroups={filas.length} maxGuestGroups={limite} mejorar={await mejorarPara(actor, event.value.slug, 'Sumar invitaciones')} />
          }
        />
      ) : null}

      {panel === 'editar' && personaCompleta !== null && enFoco !== null ? (
        <EditPersonDialog
          closeHref={base}
          eventSlug={event.value.slug}
          groups={eleccionDeGrupos}
          invitacion={{
            id: personaCompleta.guestGroupId,
            label: grupoDeLaPersona?.label ?? '',
            revocada: grupoDeLaPersona?.revokedAt !== null && grupoDeLaPersona?.revokedAt !== undefined,
            respondida: ultimas.has(personaCompleta.guestGroupId),
            enlace: enlaceDe(personaCompleta.guestGroupId),
            codigo: codigos.get(personaCompleta.guestGroupId) ?? null,
          }}
          person={{
            id: personaCompleta.id,
            fullName: personaCompleta.fullName,
            groupId: personaCompleta.guestGroupId,
            isCompanion: personaCompleta.isCompanion,
            dietaryNote: personaCompleta.dietaryNote,
            vip: personaCompleta.vip,
            attending: personaCompleta.attending,
            email: personaCompleta.email,
            phone: grupoDeLaPersona?.phone ?? null,
          }}
        />
      ) : null}

      {panel === 'pase' && enFoco !== null && grupoDeLaPersona !== undefined && grupoDeLaPersona !== null ? (
        <PassDialog
          closeHref={base}
          eventMeta={new Date(`${event.value.eventDate}T00:00:00Z`).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
          eventSlug={event.value.slug}
          eventTitle={event.value.title}
          group={{ id: grupoDeLaPersona.id, label: grupoDeLaPersona.label, revoked: grupoDeLaPersona.revokedAt !== null }}
          personName={enFoco.fullName}
          codigo={codigos.get(grupoDeLaPersona.id) ?? null}
          url={enlaceDe(grupoDeLaPersona.id)}
          tableLabel={enFoco.tableLabel}
          venue={event.value.venue}
        />
      ) : null}

      <div className="flex flex-col gap-4.5">
        {/* «Enviar invitaciones» es un panel lateral: repartir es ir invitado tras invitado
            mirando la lista, y un bloque aquí la empujaba hacia abajo. */}
        {abierto === 'envio' ? (
          <DeliveryPanel
            closeHref={base}
            eventLocale={event.value.locale}
            eventSlug={event.value.slug}
            eventTitle={event.value.title}
            rows={filas.map((fila) => ({
              id: fila.id,
              label: fila.label,
              phone: fila.phone ?? null,
              sent: fila.invitationSentAt !== null && fila.invitationSentAt !== undefined,
              revoked: fila.revokedAt !== null,
              confirmed: fila.confirmed,
              seats: fila.seats,
              url: enlaceDe(fila.id),
              email: isErr(personas) ? null : (personas.value.find((p) => p.guestGroupId === fila.id && !p.isCompanion)?.email ?? null),
            }))}
            fechaDelEvento={new Intl.DateTimeFormat(event.value.locale === 'en' ? 'en-GB' : 'es-BO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
              new Date(`${(contenido.schedule?.startsAt ?? event.value.eventDate).slice(0, 10)}T12:00:00Z`),
            )}
            sinContenido={invitacionVacia}
            template={event.value.messageTemplate ?? null}
          />
        ) : null}

        {abierto === 'importar' ? (
          <PanelCard
            action={
              <Link href={base}>
                <PanelCardLink>Cerrar ✕</PanelCardLink>
              </Link>
            }
            title="Importar desde CSV"
          >
            {/* Importar es de algunos planes. Se ofrece igual y dice por qué no: es algo que se
                consigue subiendo de plan, y la acción lo corta también en el servidor. */}
            {isErr(capacidad) || !capacidad.value.csvImport ? (
              <p className="text-[13px] leading-[1.7] text-ink-soft">
                Tu plan no incluye importar la lista de invitados. Puedes cargarlos uno a uno, o subir a un plan que
                lo incluya.
              </p>
            ) : (
              <ImportPanel eventId={event.value.id} eventSlug={event.value.slug} eventTitle={event.value.title} />
            )}
          </PanelCard>
        ) : null}

        {/* Recordatorios: el servidor calcula a quién toca, el atelier despacha. No es
            una bandeja de salida y la pantalla no lo llama así.
            **La tarjeta solo existe cuando hay algo que hacer.** Una tarjeta permanente
            que casi siempre dice «nadie por recordar hoy» es un hueco fijo que separa la
            cabecera de la lista, y se deja de mirar justo el día que sí trae a alguien. */}
        {!isErr(cola) && cola.value.length === 0 ? null : (
          <PanelCard title="Recordatorios">
            {isErr(cola) ? (
              <p className="text-[13px] text-danger" role="alert">
                No pudimos calcular la cola de recordatorios. La base no responde; vuelve a intentarlo en un momento.
              </p>
            ) : (
              <ReminderQueue
                deadline={new Date(`${event.value.rsvpDeadline}T00:00:00Z`)}
                eventId={event.value.id}
                eventLocale={event.value.locale}
                eventSlug={event.value.slug}
                rows={cola.value}
              />
            )}
          </PanelCard>
        )}

        {/* Las cifras de un vistazo, como los tableros de Joy o Zola: cuántos, quién confirmó, quién
            falta y cuántas invitaciones salieron. */}
        {filasPersona.length === 0 ? null : (() => {
          const total = filasPersona.length
          const si = filasPersona.filter((p) => p.attending === 'yes').length
          const pendientes = filasPersona.filter((p) => p.attending === null || p.attending === 'maybe').length
          const no = filasPersona.filter((p) => p.attending === 'no').length
          const vivas = filas.filter((f) => f.revokedAt === null)
          const enviadas = vivas.filter((f) => f.invitationSentAt !== null && f.invitationSentAt !== undefined).length
          return (
            <div className="grid grid-cols-2 gap-3 min-[900px]:grid-cols-4 min-[900px]:gap-4.5">
              <StatCard detail={`${vivas.length} ${vivas.length === 1 ? 'invitación' : 'invitaciones'}`} icon={<UsersIcon />} label="Invitados" value={total} />
              <StatCard detail={`${Math.round((si / total) * 100)} % del total`} icon={<CheckIcon />} label="Confirmados" progress={si / total} value={si} />
              <StatCard detail={no > 0 ? `${no} no ${no === 1 ? 'viene' : 'vienen'}` : 'sin responder o tal vez'} icon={<ClockIcon />} label="Por responder" value={pendientes} />
              <StatCard detail={enviadas === vivas.length ? 'Todas enviadas' : `Faltan ${vivas.length - enviadas}`} icon={<MailIcon />} label="Enviadas" progress={vivas.length === 0 ? 0 : enviadas / vivas.length} suffix={`/ ${vivas.length}`} value={enviadas} />
            </div>
          )
        })()}

        {/* Se cargan invitados, no grupos: el grupo es el enlace que va por debajo y aquí
            no se enseña (pedido por el usuario el 16 de septiembre). */}
        <PanelCard title="Lista de invitados">
          {isErr(personas) ? (
            // Pintar «todavía no hay personas» cuando la lectura falló no es un error
            // invisible: es un error que **miente**. El atelier daría por vacía una
            // lista que existe.
            <p className="text-[13px] text-danger" role="alert">
              No pudimos leer las personas. La base no responde; vuelve a intentarlo en un momento.
            </p>
          ) : filasPersona.length === 0 ? (
            <EmptyState
              action={invitacionVacia ? undefined : <PanelButton href={`${base}?panel=alta`} variant="primary">Añadir el primer invitado</PanelButton>}
              description="Carga a cada invitado con sus acompañantes. Cada uno recibe su propio enlace y su pase de entrada."
              icon={<UsersIcon />}
              title="Tu lista de invitados empieza aquí"
            />
          ) : (
            <PeopleTable eventSlug={event.value.slug} rows={filasPersona} />
          )}
        </PanelCard>
      </div>
    </>
  )
}
