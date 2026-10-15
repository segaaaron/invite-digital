import { EmptyState } from '@/shared/design/ui/panel/estados'
import { EnlaceGeneral } from '@/modules/guests/ui/EnlaceGeneral'
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
import { EditarInvitacion } from '@/modules/guests/ui/EditarInvitacion'
import { PassDialog } from '@/modules/guests/ui/PassDialog'
import { canAddGroup } from '@/modules/plans'
import { AllowanceNotice } from '@/modules/plans/ui/AllowanceNotice'
import { mejorarPara } from '@/app/(panel)/panel/_carcasa/mejorar'
import type { GuestGroupRowView } from '@/modules/guests/ui/invitation-row'
import { requireSession } from '@/app/_acciones/sesion'
import { ReminderQueue } from '@/modules/reminders/ui/ReminderQueue'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { PlusIcon, SendIcon, UploadIcon, UsersIcon } from '@/shared/design/ui/icons'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'
import { EnVivo } from '@/shared/design/ui/panel/EnVivo'
import { AccionDeLaIsla } from '@/shared/design/ui/panel/AccionDeLaIsla'
import { PanelDialog } from '@/shared/design/ui/panel/PanelDialog'
import { portadaParaCompartir } from '@/modules/events/ui/themes/portada-para-compartir'
import { idiomaDeLaPeticion, tr } from '@/shared/i18n/idioma-servidor'
import { T } from '@/shared/i18n/idioma-navegador'
import { INTL } from '@/shared/i18n/t'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Invitados', 'Guests') }
}

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
  searchParams: Promise<{ panel?: string; persona?: string; grupo?: string }>
}) {
  const t = await tr()
  const locale = await idiomaDeLaPeticion()
  const actor = await requireSession()
  const { slug } = await params
  const { panel, persona, grupo } = await searchParams

  const event = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  // Se invita desde el principio (6 de octubre): lo que no se escribió, el invitado lo ve como lo
  // trae el diseño. Lo escrito solo sirve aquí para la fecha del mensaje.
  const contenido = await events.contentFor(event.value.id, {})

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

  const enlaceGeneral = await guests.general.leer(event.value.id)
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
    panel === 'envio' || panel === 'alta' || panel === 'importar' ? panel : null

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

  const vivas = filas.filter((f) => f.revokedAt === null)
  const enviadas = vivas.filter((f) => (f.invitationSentAt ?? null) !== null).length
  const si = filasPersona.filter((p) => p.attending === 'yes').length
  const no = filasPersona.filter((p) => p.attending === 'no').length
  const porResponder = filasPersona.length - si - no
  const conImportar = !isErr(capacidad) && capacidad.value.csvImport

  return (
    <>
      {/* Maqueta «Esmeralda y Latón» (E09 · T04 · M08): cuántos y en cuántas invitaciones, y las tres acciones. */}
      <PanelHeader
        actions={
          <>
            <PanelButton className="max-[767px]:hidden" href={abierto === 'importar' ? base : `${base}?panel=importar`}>
              {t('Importar lista', 'Import list')}
            </PanelButton>
            {filas.length === 0 ? null : (
              <PanelButton className="max-[767px]:hidden" href={abierto === 'envio' ? base : `${base}?panel=envio`}>
                <SendIcon className="size-4" /> {t('Enviar invitaciones', 'Send invitations')}
              </PanelButton>
            )}
            <PanelButton className="max-[767px]:hidden" href={`${base}?panel=alta`} variant="primary">
              <PlusIcon className="size-4" /> {t('Añadir invitado', 'Add guest')}
            </PanelButton>
          </>
        }
        accionesSoloEnEscritorio
        meta={
          filasPersona.length === 0
            ? t('Cada invitación tiene su enlace y su pase.', 'Each invitation has its own link and pass.')
            : t(`${filasPersona.length} ${filasPersona.length === 1 ? 'persona' : 'personas'} en ${filas.length} ${filas.length === 1 ? 'invitación' : 'invitaciones'}. Cada invitación tiene su enlace y su pase.`, `${filasPersona.length} ${filasPersona.length === 1 ? 'person' : 'people'} in ${filas.length} ${filas.length === 1 ? 'invitation' : 'invitations'}. Each invitation has its own link and pass.`)
        }
        menu={
          <>
            {/* La lista descargable es del plan que trae importar (documento de cambios). */}
            {filas.length === 0 || !conImportar ? null : (
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
            )}
            <PanelButton className="min-[768px]:hidden" href={abierto === 'importar' ? base : `${base}?panel=importar`}>
              <UploadIcon className="size-3.5" /> {t('Importar lista', 'Import list')}
            </PanelButton>
          </>
        }
        title={t('Invitados', 'Guests')}
      />
      <AccionDeLaIsla>
        <Link aria-label={t('Añadir invitado', 'Add guest')} className="flex min-h-11 items-center gap-1 rounded-full border border-line-panel-strong bg-bg-raised px-3.5 text-[14px] font-medium text-ink no-underline" href={`${base}?panel=alta`}>
          <PlusIcon className="size-4.5" />
          {t('Añadir', 'Add')}
        </Link>
      </AccionDeLaIsla>
      <EnVivo modo="aviso" tipos={['rsvp']} url={`/panel/eventos/${event.value.slug}/en-vivo`} />

      {/* «+ Añadir invitado» abre el diálogo de la maqueta, con sus nueve campos. */}
      {abierto === 'alta' ? (
        <GuestDialog
          atLimit={!canAddGroup(limite, filas.length)}
          closeHref={base}
          eventId={event.value.id}
          eventSlug={event.value.slug}
          notice={
            <AllowanceNotice currentGroups={filas.length} maxGuestGroups={limite} mejorar={await mejorarPara(actor, event.value.slug, t('Sumar invitaciones', 'Add invitations'))} />
          }
        />
      ) : null}

      {/* Editar la invitación entera (maqueta E36, T32, M43). */}
      {(() => {
        if (panel !== 'invitacion' || grupo === undefined || isErr(personas)) return null
        const g = filas.find((f) => f.id === grupo)
        if (g === undefined) return null
        const suyas = personas.value.filter((p) => p.guestGroupId === grupo)
        const tablas = salon === null || isErr(salon) ? [] : salon.value.tables
        return (
          <EditarInvitacion
            closeHref={base}
            eventId={event.value.id}
            eventSlug={event.value.slug}
            invitacion={{
              id: g.id,
              label: g.label,
              codigo: codigos.get(g.id) ?? null,
              enlace: enlaceDe(g.id),
              phone: g.phone ?? null,
              mesaId: tablas.find((t) => t.groups.some((x) => x.id === g.id))?.id ?? null,
            }}
            key={g.id}
            mesas={tablas.map((t) => ({ id: t.id, label: t.label, libres: Math.max(0, t.capacity - t.taken) }))}
            personas={suyas.map((p) => ({ id: p.id, fullName: p.fullName, isCompanion: p.isCompanion, vip: p.vip }))}
          />
        )
      })()}

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
          eventMeta={new Date(`${event.value.eventDate}T00:00:00Z`).toLocaleDateString(INTL[locale], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
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

      <div className="flex flex-col gap-8 max-[767px]:gap-5">
        {/* «Enviar invitaciones» es un panel lateral: repartir es ir invitado tras invitado
            mirando la lista, y un bloque aquí la empujaba hacia abajo. */}
        {abierto === 'envio' ? (
          <DeliveryPanel
            closeHref={base}
            eventLocale={event.value.locale}
            portada={portadaParaCompartir(event.value.themeKey)}
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
            template={event.value.messageTemplate ?? null}
          />
        ) : null}

        {/* Recordar (E55): uno por uno, por WhatsApp; lo que se anota sale de la cola. Lo abre «Recordar» de cada fila. */}
        {panel === 'recordar' ? (
          <PanelDialog
            closeHref={base}
            descripcion={t('Uno por uno, por WhatsApp. Te vamos marcando a quién ya le escribiste.', 'One by one, via WhatsApp. We mark who you’ve already written to.')}
            title={isErr(cola) || cola.value.length === 0 ? t('Recordatorios', 'Reminders') : t(`Recordar a ${cola.value.length} ${cola.value.length === 1 ? 'invitación' : 'invitaciones'}`, `Remind ${cola.value.length} ${cola.value.length === 1 ? 'invitation' : 'invitations'}`)}
            width={560}
          >
            {isErr(cola) ? (
              <p className="text-[14px] text-danger" role="alert">
                {t('No pudimos calcular la cola de recordatorios. La base no responde; vuelve a intentarlo en un momento.', 'We couldn’t work out the reminder queue. The database isn’t responding; try again in a moment.')}
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
            <div className="mt-5 flex justify-end">
              <PanelButton href={base}>{t('Terminar por hoy', 'Done for today')}</PanelButton>
            </div>
          </PanelDialog>
        ) : null}

        {abierto === 'importar' ? (
          <PanelDialog closeHref={base} descripcion={t('Revisa antes de cargar: cada fila dice si entró o por qué no.', 'Check before adding: each row says whether it went in or why not.')} title={t('Importar tu lista', 'Import your list')} width={640}>
            {/* Importar es de algunos planes. Se ofrece igual y dice por qué no: es algo que se
                consigue subiendo de plan, y la acción lo corta también en el servidor. */}
            {isErr(capacidad) || !capacidad.value.csvImport ? (
              <p className="text-[13px] leading-[1.7] text-ink-soft">
                {t('Tu plan no incluye importar la lista de invitados. Puedes cargarlos uno a uno, o subir a un plan que lo incluya.', 'Your plan doesn’t include importing the guest list. You can add them one by one, or move up to a plan that includes it.')}
              </p>
            ) : (
              <ImportPanel eventId={event.value.id} eventSlug={event.value.slug} eventTitle={event.value.title} />
            )}
          </PanelDialog>
        ) : null}

        {/* Las cifras de la maqueta: una tira con filetes, sin tarjetas. En el celular, tres y el botón de enviar lo que falta. */}
        {filasPersona.length === 0 ? null : (
          <>
            <dl className="flex flex-wrap max-[767px]:hidden">
              <Cifra etiqueta={t('Invitados', 'Guests')} valor={filasPersona.length} primera />
              <Cifra etiqueta={t('Asistirán', 'Attending')} valor={si} />
              <Cifra detalle={no > 0 ? t(`${no} no ${no === 1 ? 'viene' : 'vienen'}`, `${no} not coming`) : undefined} etiqueta={t('Por responder', 'Awaiting reply')} valor={porResponder} />
              <Cifra etiqueta={t('Enviadas', 'Sent')} valor={enviadas} de={vivas.length} />
            </dl>
            {/* Celular (v2.1, 14 oct): un solo bloque «8 de 19 respondieron» con la barra repartida y, dentro, lo que falta
                enviar con su botón. Antes, tres cifras sueltas, un botón negro a lo ancho y dos filas de filtros dejaban la
                lista fuera de la primera pantalla. */}
            <section aria-label={t('Cómo va', 'Progress')} className="flex flex-col gap-3 rounded-[16px] border border-line-panel bg-bg-raised p-4 min-[768px]:hidden">
              <p className="flex items-baseline justify-between gap-3">
                <span>
                  <span className="font-display text-[34px] leading-none font-medium [font-variant-numeric:lining-nums]">{si + no}</span>{' '}
                  <span className="text-[14.5px] text-ink-mute">{t(`de ${filasPersona.length} respondieron`, `of ${filasPersona.length} replied`)}</span>
                </span>
                <span className="text-[13.5px] text-ink-mute tabular-nums">{Math.round(((si + no) / filasPersona.length) * 100)} %</span>
              </p>
              <span aria-hidden className="flex h-1.5 overflow-hidden rounded-full bg-bg-sunken">
                <span className="bg-ok" style={{ width: `${(si / filasPersona.length) * 100}%` }} />
                <span className="bg-danger" style={{ width: `${(no / filasPersona.length) * 100}%` }} />
              </span>
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-ink-soft">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="size-2.5 rounded-[3px] bg-ok" />
                  {t(`${si} asisten`, `${si} attending`)}
                </span>
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="size-2.5 rounded-[3px] bg-danger" />
                  {t(`${no} no vienen`, `${no} not coming`)}
                </span>
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="size-2.5 rounded-[3px] bg-bg-sunken ring-1 ring-line-panel-strong ring-inset" />
                  {t(`${porResponder} esperan`, `${porResponder} waiting`)}
                </span>
              </p>
              {vivas.length - enviadas > 0 ? (
                <div className="flex items-center gap-3 rounded-[12px] bg-pill-pending p-3">
                  <p className="min-w-0 flex-1 text-[14px] leading-snug text-pill-pending-ink">
                    <b className="font-medium">{vivas.length - enviadas === 1 ? t('1 invitación sin enviar.', '1 invitation not sent.') : t(`${vivas.length - enviadas} invitaciones sin enviar.`, `${vivas.length - enviadas} invitations not sent.`)}</b>
                    <br />
                    {t('Por WhatsApp o con su enlace.', 'Via WhatsApp or with their link.')}
                  </p>
                  <PanelButton className="shrink-0" href={`${base}?panel=envio`} variant="primary">
                    <SendIcon className="size-4" /> {t('Enviar', 'Send')}
                  </PanelButton>
                </div>
              ) : vivas.length > 0 ? (
                // Con todas enviadas, el envío sigue a mano: reenviar o ver «Enviadas» (13 oct: en el celular no había forma).
                <PanelButton className="w-full" href={`${base}?panel=envio`}>
                  <SendIcon className="size-4.5" /> {t('Enviar o reenviar', 'Send or resend')}
                </PanelButton>
              ) : null}
            </section>
          </>
        )}

        {/* Se cargan invitados, no grupos: el grupo es el enlace que va por debajo y aquí
            no se enseña (pedido por el usuario el 16 de septiembre). */}
        <section aria-label={t('Lista de invitados', 'Guest list')}>
          {isErr(personas) ? (
            // Pintar «todavía no hay personas» cuando la lectura falló no es un error
            // invisible: es un error que **miente**. El atelier daría por vacía una
            // lista que existe.
            <p className="text-[13px] text-danger" role="alert">
              {t('No pudimos leer las personas. La base no responde; vuelve a intentarlo en un momento.', 'We couldn’t read the people. The database isn’t responding; try again in a moment.')}
            </p>
          ) : filasPersona.length === 0 ? (
            <div className="flex flex-col gap-3">
              <EmptyState
                action={
                  <>
                    <PanelButton href={`${base}?panel=importar`}>{t('Importar lista', 'Import list')}</PanelButton>
                    <PanelButton href={`${base}?panel=alta`} variant="primary">
                      <PlusIcon className="size-4" /> {t('Añadir el primero', 'Add the first one')}
                    </PanelButton>
                  </>
                }
                description={t('Añade al primero con su nombre y sus acompañantes, o sube tu lista de Excel de una vez.', 'Add the first one with their name and companions, or upload your spreadsheet all at once.')}
                icon={<UsersIcon />}
                title={t('Todavía no hay invitados', 'No guests yet')}
              />
            </div>
          ) : (
            <PeopleTable eventSlug={event.value.slug} rows={filasPersona} />
          )}
        </section>

        {/* Recordatorios: el servidor calcula a quién toca, el atelier despacha. No es
            una bandeja de salida y la pantalla no lo llama así.
            **La tarjeta solo existe cuando hay algo que hacer.** Una tarjeta permanente
            que casi siempre dice «nadie por recordar hoy» es un hueco fijo que separa la
            cabecera de la lista, y se deja de mirar justo el día que sí trae a alguien. */}
        <PanelCard title={t('Enlace general', 'General link')}>
          <EnlaceGeneral eventId={event.value.id} eventSlug={event.value.slug} url={enlaceGeneral === null ? null : `${env.SITE_URL.replace(/\/+$/, '')}/abierta/${enlaceGeneral}`} />
        </PanelCard>
      </div>
    </>
  )
}

/** Una cifra de la tira de la maqueta (`.kpi`): rótulo, número en Bodoni y, si hace falta, su línea. */
function Cifra({ etiqueta, valor, de, detalle, primera = false }: { etiqueta: string; valor: number; de?: number; detalle?: string | undefined; primera?: boolean }) {
  return (
    <div className={`flex-[1_1_140px] ${primera ? '' : 'border-l border-line-panel pl-6'}`}>
      <dt className="text-[13.5px] text-ink-mute">{etiqueta}</dt>
      <dd className="m-0 font-display text-[32px] leading-[1.15] font-medium">
        {valor}
        {de === undefined ? null : <span className="font-sans text-[16px] font-normal text-ink-mute"> <T en={`of ${de}`} es={`de ${de}`} /></span>}
      </dd>
      {detalle === undefined ? null : <dd className="m-0 text-[13px] text-pill-pending-ink">{detalle}</dd>}
    </div>
  )
}

/** Las tres cifras del celular (maqueta M08), una al lado de otra. */
