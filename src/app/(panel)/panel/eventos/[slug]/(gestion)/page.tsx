import { hayPreguntas } from '@/modules/rsvp/domain/preguntas'
import { LoQueContestaron } from '@/modules/rsvp/ui/LoQueContestaron'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { analytics, events, guestbook, guests, planner, plans, rsvp, venue } from '@/app/composition/container'
import { fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { fiestaDeTema, loQueFaltaParaInvitar, requisitosParaInvitar } from '@/modules/events'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { estadoDeTarea, pagosQueVencen, proveedoresSinConfirmar } from '@/modules/planner'
import { buildWhatsAppLink } from '@/modules/leads'
import { DEFAULT_CURRENCY, formatAmount } from '@/shared/money'
import { diasHasta, fecha as diaCorto, hace } from '@/shared/format/fecha'
import type { GuestGroupRowView } from '@/modules/guests/ui/invitation-row'
import { gestionaElEvento } from '@/modules/identity'
import { requireSession } from '@/app/_acciones/sesion'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { PanelButton, Pill, TARJETA_DESTACADA } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'
import { EnVivo } from '@/shared/design/ui/panel/EnVivo'
import { NAV_ICONS } from '@/modules/shell/ui/nav-icons'
import { idiomaDeLaPeticion, tr } from '@/shared/i18n/idioma-servidor'
import { T } from '@/shared/i18n/idioma-navegador'
import { INTL } from '@/shared/i18n/t'
import { traducir } from '@/shared/i18n/en-ingles'

const DIA_LARGO = { es: new Intl.DateTimeFormat(INTL.es, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }), en: new Intl.DateTimeFormat(INTL.en, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }) }
const HORA = new Intl.DateTimeFormat(INTL.es, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/La_Paz' })

type Pendiente = { readonly clave: string; readonly titulo: string; readonly detalle: string; readonly accion: string; readonly href: string; readonly externo?: boolean }

/**
 * **El resumen del evento, como en la maqueta «Esmeralda y Latón»** (E07 · T17 · M06, 12 de octubre): el nombre con
 * el día, la hora y el lugar, y los días que faltan en grande; «Lo próximo», lo único que toca hacer ahora; a un lado
 * cómo va la invitación (el aro de respuestas y de dónde la abren) y al otro lo que vence esta semana; y abajo lo
 * último que escribieron en el libro de firmas.
 */
export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const [t, locale] = await Promise.all([tr(), idiomaDeLaPeticion()])
  const { slug } = await params

  const event = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }
  const id = event.value.id
  const base = `/panel/eventos/${event.value.slug}`
  const ahora = new Date()
  const hoyBolivia = fechaEnBolivia(ahora)

  const [contenido, groups, ultimas, personas, libro, visitas, preguntas, tareas, partidas] = await Promise.all([
    events.contentFor(id, {}),
    guests.list(id),
    rsvp.latestByEvent(id),
    guests.listPeople(id),
    guestbook.list(id),
    analytics.tally(id),
    rsvp.preguntas.leer(id),
    planner.listTasks(id),
    planner.listBudget(id),
  ])
  const invitacionLista = loQueFaltaParaInvitar(contenido, requisitosParaInvitar(themeFor(event.value.themeKey), fiestaDeTema(event.value.themeKey))).length === 0
  const filas: GuestGroupRowView[] = isErr(groups) ? [] : groups.value.map((g) => ({ ...g, confirmed: ultimas.get(g.id)?.attending ?? null }))
  const gente = isErr(personas) ? [] : personas.value
  const vienen = gente.filter((p) => p.attending === 'yes').length
  const noVienen = gente.filter((p) => p.attending === 'no').length
  const sinResponder = gente.length - vienen - noVienen
  const respondio = gente.length === 0 ? null : Math.round(((vienen + noVienen) / gente.length) * 100)
  const vistas = isErr(visitas) ? null : visitas.value
  const firmas = isErr(libro) ? [] : [...libro.value].filter((m) => (m.body ?? '').trim() !== '').sort((a, b) => b.writtenAt.getTime() - a.writtenAt.getTime())
  const porAgradecer = firmas.filter((m) => m.reply === null).length

  // El salón y los proveedores, solo si el plan los trae y quien entra los lleva.
  const conSalon = await plans.requireFeature(id, 'seating')
  const salon = isErr(conSalon) ? null : await venue.seating(id)
  const mesas = salon === null || isErr(salon) ? null : salon.value
  const dueno = gestionaElEvento(actor, event.value)
  const llevaProveedores = dueno || (await events.staff.de(actor, id)).some((m) => m === 'cliente' || m === 'planner')
  const conProveedores = llevaProveedores && !isErr(await plans.requireFeature(id, 'plannerCompleto'))
  const proveedores = conProveedores ? await planner.dia.listVendors(id) : []

  // ── La cabecera: el día, la hora y el lugar, y cuánto falta.
  const fiesta = fiestaDeTema(event.value.themeKey)
  const dias = diasHasta(event.value.eventDate, ahora)
  const diaTexto = DIA_LARGO[locale].format(new Date(`${event.value.eventDate}T00:00:00Z`))
  const inicio = contenido.schedule?.startsAt === undefined ? null : new Date(contenido.schedule.startsAt)
  const lugares = [contenido.ceremony?.place, contenido.reception?.place].filter((l): l is string => (l ?? '').trim() !== '')
  const cuando = `${diaTexto.charAt(0).toUpperCase()}${diaTexto.slice(1)}${inicio === null || Number.isNaN(inicio.getTime()) ? '' : `, ${HORA.format(inicio)}`}`
  const donde = lugares.length === 0 ? '' : `${lugares.join(t(' y ', ' and '))}.`
  const enGrande = dias > 1 ? { n: String(dias), palabra: t('días', 'days') } : dias === 1 ? { n: '1', palabra: t('día', 'day') } : dias === 0 ? { n: t('Hoy', 'Today'), palabra: '' } : null

  // ── Lo próximo: lo único que toca hacer ahora, con su botón (y uno secundario cuando ayuda).
  const porEnviar = filas.filter((f) => f.revokedAt === null && (f.invitationSentAt ?? null) === null).length
  const algunaEnviada = filas.some((f) => (f.invitationSentAt ?? null) !== null)
  const pendientes = filas.filter((f) => f.revokedAt === null && f.confirmed === null).length
  const escribir = {
    titulo: t('Escribe tu invitación', 'Write your invitation'),
    detalle: t('Para enviarla basta con quién celebra y sus papás. Lo que no escribas sale como el ejemplo del diseño.', 'To send it you only need who is celebrating and their parents. Anything you don’t write shows as the design’s example.'),
    accion: t('Escribirla', 'Write it'),
    href: `${base}/configuracion`,
    secundaria: { accion: t('Verla', 'View it'), href: `${base}/vista-previa` },
  }
  const proximo =
    !invitacionLista && !algunaEnviada
      ? escribir
      : filas.length === 0
        ? { titulo: t('Carga a tus invitados', 'Add your guests'), detalle: t('Cada uno recibe su enlace; sus acompañantes entran con el mismo.', 'Each one gets their link; their companions come in with the same one.'), accion: t('Añadir invitados', 'Add guests'), href: `${base}/invitados?panel=alta`, secundaria: { accion: t('Importar una lista', 'Import a list'), href: `${base}/invitados?panel=importar` } }
        : porEnviar > 0
          ? { titulo: porEnviar === 1 ? t('Falta 1 invitación por enviar', '1 invitation left to send') : t(`Faltan ${porEnviar} invitaciones por enviar`, `${porEnviar} invitations left to send`), detalle: t('Se envían por WhatsApp o con su enlace, una por una.', 'They are sent via WhatsApp or with their link, one by one.'), accion: t('Enviar ahora', 'Send now'), href: `${base}/invitados?panel=envio`, secundaria: { accion: t('Ver quiénes son', 'See who they are'), href: `${base}/invitados` } }
          : !invitacionLista
            ? escribir
            : pendientes > 0
              ? { titulo: pendientes === 1 ? t('1 invitado aún no responde', '1 guest hasn’t replied yet') : t(`${pendientes} invitados aún no responden`, `${pendientes} guests haven’t replied yet`), detalle: t('Un recordatorio por WhatsApp suele traer la mitad de vuelta.', 'A WhatsApp reminder usually brings half of them back.'), accion: t('Enviar recordatorios', 'Send reminders'), href: `${base}/invitados`, secundaria: { accion: t('Ver quiénes son', 'See who they are'), href: `${base}/invitados` } }
              : { titulo: t('Todos respondieron', 'Everyone replied'), detalle: vienen === 1 ? t('1 persona viene.', '1 person is coming.') : t(`${vienen} personas vienen.`, `${vienen} people are coming.`), accion: t('Ver invitados', 'View guests'), href: `${base}/invitados`, secundaria: null }

  // ── Esta semana: lo que vence o ya venció, cada cosa con adónde ir.
  const bs = (cents: number) => formatAmount(cents, DEFAULT_CURRENCY)
  const dia = (iso: string) => diaCorto(new Date(`${iso}T12:00:00.000Z`), locale)
  const semana: Pendiente[] = [
    ...pagosQueVencen(partidas, hoyBolivia).map((g) => ({
      clave: `pago-${g.id}`,
      titulo: t(`Pagar ${g.concepto.charAt(0).toLowerCase()}${g.concepto.slice(1)}`, `Pay ${g.concepto}`),
      detalle: t(`${bs(g.amountCents)}, ${g.dueDate! < hoyBolivia ? 'venció' : 'vence'} el ${dia(g.dueDate!)}`, `${bs(g.amountCents)}, ${g.dueDate! < hoyBolivia ? 'was due' : 'due'} ${dia(g.dueDate!)}`),
      accion: t('Ver pago', 'View payment'),
      href: `${base}/planner/presupuesto`,
    })),
    ...(mesas !== null && mesas.unseated.length > 0
      ? [{ clave: 'mesas', titulo: mesas.unseated.length === 1 ? t('Sentar a 1 invitación', 'Seat 1 invitation') : t(`Sentar a ${mesas.unseated.length} invitaciones`, `Seat ${mesas.unseated.length} invitations`), detalle: t('Aún no tienen mesa', 'They don’t have a table yet'), accion: t('Ir a mesas', 'Go to tables'), href: `${base}/mesas` }]
      : []),
    ...proveedoresSinConfirmar(proveedores).map((v): Pendiente => {
      const whatsapp = v.whatsapp ? buildWhatsAppLink(v.whatsapp, t(`Hola, ¿nos confirmas para ${event.value.title}?`, `Hi, can you confirm for ${event.value.title}?`)) : null
      return {
        clave: `prov-${v.id}`,
        titulo: t(`Confirmar ${v.service.charAt(0).toLowerCase()}${v.service.slice(1)}`, `Confirm ${v.service}`),
        detalle: t('Todavía no confirmó', 'Hasn’t confirmed yet'),
        accion: whatsapp === null ? t('Ver', 'View') : t('Escribirle', 'Message them'),
        href: whatsapp ?? `${base}/planner/proveedores`,
        externo: whatsapp !== null,
      }
    }),
    ...tareas
      .map((tarea) => ({ tarea, estado: estadoDeTarea(tarea, hoyBolivia) }))
      .filter(({ estado }) => estado === 'atrasada' || estado === 'semana')
      .map(({ tarea, estado }) => ({ clave: `tarea-${tarea.id}`, titulo: tarea.title, detalle: estado === 'atrasada' ? t(`Venció el ${dia(tarea.dueDate!)}`, `Was due ${dia(tarea.dueDate!)}`) : t(`Vence el ${dia(tarea.dueDate!)}`, `Due ${dia(tarea.dueDate!)}`), accion: t('Ver', 'View'), href: `${base}/planner/tareas` })),
    ...(porAgradecer > 0
      ? [{ clave: 'firmas', titulo: porAgradecer === 1 ? t('Agradecer 1 firma nueva', 'Thank 1 new entry') : t(`Agradecer ${porAgradecer} firmas nuevas`, `Thank ${porAgradecer} new entries`), detalle: t('En tu libro de firmas', 'In your guestbook'), accion: t('Leer', 'Read'), href: `${base}/mensajes` }]
      : []),
  ].slice(0, 5)

  // De dónde la abren: el aparato y el camino que más pesan.
  const masDe = (lista: readonly { label: string; percent: number; count: number }[] | undefined) => [...(lista ?? [])].filter((x) => x.count > 0).sort((a, b) => b.count - a.count)[0]
  const aparato = masDe(vistas?.devices)
  const camino = masDe(vistas?.sources)

  return (
    <div className="flex flex-col gap-8 max-[767px]:gap-7">
      <EnVivo modo="aviso" tipos={['rsvp', 'ingreso', 'visita']} url={`${base}/en-vivo`} />

      {/* La cabecera. En el celular, en su tarjeta esmeralda (maqueta M06). */}
      <div className="flex flex-wrap items-center gap-7 max-[767px]:hidden">
        <div className="min-w-0 flex-[1_1_420px]">
          <h1 className="font-display text-[44px] leading-[1.05] font-medium max-[1279px]:text-[40px]">{event.value.title}</h1>
          <p className="mt-2 text-[16px] text-ink-mute">
            {cuando}.{donde === '' ? '' : ` ${donde}`}
          </p>
        </div>
        {enGrande === null ? null : (
          <p className="flex items-baseline gap-1.5">
            <span className="font-display text-[64px] leading-none font-medium">{enGrande.n}</span>
            {enGrande.palabra === '' ? null : <span className="text-[15px] text-ink-mute">{enGrande.palabra}</span>}
          </p>
        )}
      </div>
      <section aria-label={event.value.title} className="rounded-[16px] bg-shell-deep bg-[radial-gradient(140%_80%_at_0%_0%,var(--color-shell)_0%,var(--color-shell-deep)_65%)] p-5.5 text-shell-ink min-[768px]:hidden">
        <p className="text-[14px] text-gold-light">{cuando}</p>
        <h1 className="mt-1 font-display text-[36px] leading-tight font-medium">
          {dias > 1 ? t(`Faltan ${dias} días`, `${dias} days to go`) : dias === 1 ? t('Es mañana', 'It’s tomorrow') : dias === 0 ? t(`Hoy es ${fiesta === 'xv' ? 'la fiesta' : fiesta === 'cumple' ? 'el cumpleaños' : 'la boda'}`, `${fiesta === 'xv' ? 'The party' : fiesta === 'cumple' ? 'The birthday' : 'The wedding'} is today`) : event.value.title}
        </h1>
        {donde === '' ? null : <p className="mt-1 text-[15px] text-shell-ink/85">{donde}</p>}
      </section>

      <article className={`${TARJETA_DESTACADA} flex flex-wrap items-center gap-6 px-7.5 py-7 max-[559px]:p-5.5`}>
        <div className="min-w-0 flex-[1_1_320px]">
          <Pill tone="pending">{t('Lo próximo', 'Up next')}</Pill>
          <h2 className="mt-2.5 font-display text-[26px] leading-tight font-medium max-[559px]:text-[24px]">{proximo.titulo}</h2>
          <p className="mt-1.5 text-[15px] text-ink-mute">{proximo.detalle}</p>
        </div>
        <div className="flex flex-wrap gap-2.5 max-[559px]:w-full max-[559px]:*:w-full">
          {proximo.secundaria ? (
            <span className="max-[559px]:hidden">
              <PanelButton href={proximo.secundaria.href}>{proximo.secundaria.accion}</PanelButton>
            </span>
          ) : null}
          <PanelButton href={proximo.href} variant="primary">
            {proximo.accion}
          </PanelButton>
        </div>
      </article>

      {/* **Tu evento** en el celular (v2.1, 14 oct): cada parte con cómo va, a un toque. Junto al botón «Menú» de arriba,
          es la otra puerta visible a todo (sin barra fija abajo: el panel es web). */}
      <nav aria-label={t('Tu evento', 'Your event')} className="min-[768px]:hidden">
        <p className="mb-2.5 text-[13px] font-medium text-gold-deep">{t('Tu evento', 'Your event')}</p>
        <ul className="grid grid-cols-2 gap-2.5">
          {[
            { href: `${base}/configuracion`, icono: NAV_ICONS.editar, titulo: t('Mi invitación', 'My invitation'), estado: invitacionLista ? t('Lista para enviar', 'Ready to send') : t('Por terminar', 'To finish'), atencion: !invitacionLista },
            {
              href: `${base}/invitados`,
              icono: NAV_ICONS.invitados,
              titulo: t('Invitados', 'Guests'),
              estado: filas.length === 0 ? t('Sin cargar', 'None added') : porEnviar > 0 ? t(`${porEnviar} sin enviar`, `${porEnviar} not sent`) : t(`${vienen} ${vienen === 1 ? 'viene' : 'vienen'}`, `${vienen} coming`),
              atencion: filas.length === 0 || porEnviar > 0,
            },
            ...(mesas === null
              ? []
              : [{ href: `${base}/mesas`, icono: NAV_ICONS.mesas, titulo: t('Mesas', 'Tables'), estado: mesas.unseated.length > 0 ? t(`${mesas.unseated.length} sin mesa`, `${mesas.unseated.length} without a table`) : t('Todos sentados', 'Everyone seated'), atencion: mesas.unseated.length > 0 }]),
            { href: `${base}/regalos`, icono: NAV_ICONS.regalos, titulo: t('Regalos', 'Gifts'), estado: t('Cómo te regalan', 'How they give to you'), atencion: false },
            {
              href: `${base}/mensajes`,
              icono: NAV_ICONS.mensajes,
              titulo: t('Libro de firmas', 'Guestbook'),
              estado: porAgradecer > 0 ? t(`${porAgradecer} por agradecer`, `${porAgradecer} to thank`) : firmas.length === 0 ? t('Aún sin firmas', 'No entries yet') : t(`${firmas.length} ${firmas.length === 1 ? 'firma' : 'firmas'}`, `${firmas.length} ${firmas.length === 1 ? 'entry' : 'entries'}`),
              atencion: porAgradecer > 0,
            },
          ].map((parte) => (
            <li key={parte.href}>
              <Link className="flex min-h-[112px] flex-col gap-2 rounded-[16px] border border-line-panel bg-bg-raised p-3.5 text-ink no-underline" href={parte.href}>
                <span aria-hidden className="grid size-9 place-items-center rounded-full border border-line-panel text-shell-deep [&_svg]:size-[18px]">
                  {parte.icono}
                </span>
                <span className="text-[15.5px] font-medium">{parte.titulo}</span>
                <span className={`-mt-1.5 text-[13.5px] ${parte.atencion ? 'font-medium text-pill-pending-ink' : 'text-ink-mute'}`}>{parte.estado}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-wrap items-start gap-10 max-[767px]:gap-7">
        <section aria-labelledby="invitacion-titulo" className="min-w-0 flex-[1_1_360px] scroll-mt-24" id="invitacion">
          <div className="mb-3.5 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-[24px] font-medium max-[767px]:sr-only" id="invitacion-titulo">
              {t('Cómo va tu invitación', 'How your invitation is doing')}
            </h2>
            <Link className="inline-flex min-h-11 items-center text-[14px]" href={`${base}/informe`}>
              {t('Informe del evento', 'Event report')}
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <Aro porcentaje={respondio} />
            <dl className="grid grid-cols-[auto_auto] gap-x-4.5 gap-y-2 text-[14.5px]">
              <Fila color="bg-shell-deep" etiqueta={t('Asisten', 'Attending')} valor={vienen} />
              <Fila color="bg-gold" etiqueta={t('No vienen', 'Not coming')} valor={noVienen} />
              <Fila color="bg-line-panel" destacar={sinResponder > 0} etiqueta={t('Sin responder', 'No reply')} valor={sinResponder} />
              <dt className="text-ink-mute max-[767px]:hidden">{t('La vieron', 'Viewed')}</dt>
              <dd className="m-0 [font-variant-numeric:tabular-nums] max-[767px]:hidden">{vistas === null ? '—' : vistas.total === 1 ? t('1 vez', 'once') : t(`${vistas.total} veces`, `${vistas.total} times`)}</dd>
            </dl>
          </div>
          {aparato === undefined || camino === undefined ? null : (
            <p className="mt-4.5 text-[14px] text-ink-mute max-[767px]:hidden">
              {t(`La abren sobre todo desde ${aparato.label === 'Móvil' ? 'el celular' : aparato.label === 'Tableta' ? 'la tablet' : 'la computadora'} (${aparato.percent} %) y les llega por ${camino.label} (${camino.percent} %).`, `Mostly opened on ${aparato.label === 'Móvil' ? 'a phone' : aparato.label === 'Tableta' ? 'a tablet' : 'a computer'} (${aparato.percent} %) and received via ${traducir(camino.label, t)} (${camino.percent} %).`)}
            </p>
          )}
        </section>

        <section aria-labelledby="semana-titulo" className="min-w-0 flex-[1_1_360px]">
          <h2 className="mb-1.5 font-display text-[24px] font-medium" id="semana-titulo">
            {t('Esta semana', 'This week')}
          </h2>
          {semana.length === 0 ? (
            <p className="border-t border-line-panel py-4 text-[15px] text-ink-mute">{t('Nada vence esta semana.', 'Nothing is due this week.')}</p>
          ) : (
            <ul>
              {semana.map((p) => (
                <li className="flex items-center gap-4 border-t border-line-panel px-1 py-4 max-[767px]:border-t-0 max-[767px]:px-0 max-[767px]:[&+li]:border-t" key={p.clave}>
                  <svg aria-hidden className="size-[19px] shrink-0 text-gold-deep max-[767px]:hidden" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" viewBox="0 0 24 24">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.titulo}</p>
                    <p className="text-[13.5px] text-ink-mute">{p.detalle}</p>
                  </div>
                  <PanelButton external={p.externo ?? false} href={p.href} size="sm">
                    {p.accion}
                  </PanelButton>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {hayPreguntas(preguntas) ? (
        <PanelCard action={<PanelButton href={`${base}/ajustes`}>{t('Cambiar preguntas', 'Change questions')}</PanelButton>} title={t('Lo que contestaron', 'What they answered')}>
          <LoQueContestaron resultados={await rsvp.preguntas.resultados(id)} />
        </PanelCard>
      ) : null}

      {firmas.length === 0 ? null : (
        <section aria-labelledby="firmas-titulo">
          <div aria-hidden className="mb-5.5 h-[3px] border-y border-gold max-[767px]:hidden" />
          <h2 className="mb-3.5 font-display text-[24px] font-medium max-[767px]:sr-only" id="firmas-titulo">
            {t('Lo último que escribieron', 'What they wrote last')}
          </h2>
          <div className="grid gap-5 min-[768px]:grid-cols-3">
            {firmas.slice(0, 3).map((m, i) => (
              <blockquote className={`m-0 rounded-[14px] border border-line-panel bg-bg-raised px-5 py-4.5 ${i > 0 ? 'max-[767px]:hidden' : ''}`} data-cita key={m.responseId}>
                <p className="font-display text-[17px] leading-[1.45] italic" data-cita>
                  «{m.body}»
                </p>
                <footer className="mt-2.5 text-[13px] text-ink-mute">
                  {m.responderName ?? m.groupLabel}, {hace(m.writtenAt, ahora, locale)}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/** El aro de respuestas de la maqueta: esmeralda lo respondido, latón el resto. */
function Aro({ porcentaje }: { porcentaje: number | null }) {
  const p = porcentaje ?? 0
  return (
    <div className="relative grid size-[150px] shrink-0 place-items-center max-[767px]:size-[104px]">
      <svg aria-hidden className="absolute inset-0 -rotate-90" viewBox="0 0 42 42">
        <circle cx="21" cy="21" fill="none" r="17" stroke="var(--color-line-panel)" strokeWidth="4" />
        <circle cx="21" cy="21" fill="none" pathLength="100" r="17" stroke="var(--color-shell-deep)" strokeDasharray={`${p} ${100 - p}`} strokeWidth="4" />
        {p > 0 && p < 100 ? <circle cx="21" cy="21" fill="none" pathLength="100" r="17" stroke="var(--color-gold)" strokeDasharray={`${Math.min(6, 100 - p)} ${100 - Math.min(6, 100 - p)}`} strokeDashoffset={-p} strokeWidth="4" /> : null}
      </svg>
      <span className="text-center">
        <span className="block font-display text-[34px] leading-none font-medium max-[767px]:text-[26px]">{porcentaje === null ? '—' : `${porcentaje}%`}</span>
        <span className="text-[12.5px] text-ink-mute">
          <T en="replied" es="respondió" />
        </span>
      </span>
    </div>
  )
}

function Fila({ etiqueta, valor, color, destacar = false }: { etiqueta: string; valor: number; color: string; destacar?: boolean }) {
  return (
    <>
      <dt className="flex items-center gap-2">
        <span aria-hidden className={`size-2.5 rounded-[3px] ${color}`} />
        {etiqueta}
      </dt>
      <dd className={`m-0 font-semibold [font-variant-numeric:tabular-nums] ${destacar ? 'max-[767px]:text-gold-deep' : ''}`}>{valor}</dd>
    </>
  )
}
