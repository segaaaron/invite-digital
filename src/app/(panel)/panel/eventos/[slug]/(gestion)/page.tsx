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

const DIA_LARGO = new Intl.DateTimeFormat('es-BO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
const HORA = new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/La_Paz' })

type Pendiente = { readonly clave: string; readonly titulo: string; readonly detalle: string; readonly accion: string; readonly href: string; readonly externo?: boolean }

/**
 * **El resumen del evento, como en la maqueta «Esmeralda y Latón»** (E07 · T17 · M06, 12 de octubre): el nombre con
 * el día, la hora y el lugar, y los días que faltan en grande; «Lo próximo», lo único que toca hacer ahora; a un lado
 * cómo va la invitación (el aro de respuestas y de dónde la abren) y al otro lo que vence esta semana; y abajo lo
 * último que escribieron en el libro de firmas.
 */
export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
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
  const diaTexto = DIA_LARGO.format(new Date(`${event.value.eventDate}T00:00:00Z`))
  const inicio = contenido.schedule?.startsAt === undefined ? null : new Date(contenido.schedule.startsAt)
  const lugares = [contenido.ceremony?.place, contenido.reception?.place].filter((l): l is string => (l ?? '').trim() !== '')
  const cuando = `${diaTexto.charAt(0).toUpperCase()}${diaTexto.slice(1)}${inicio === null || Number.isNaN(inicio.getTime()) ? '' : `, ${HORA.format(inicio)}`}`
  const donde = lugares.length === 0 ? '' : `${lugares.join(' y ')}.`
  const enGrande = dias > 1 ? { n: String(dias), palabra: 'días' } : dias === 1 ? { n: '1', palabra: 'día' } : dias === 0 ? { n: 'Hoy', palabra: '' } : null

  // ── Lo próximo: lo único que toca hacer ahora, con su botón (y uno secundario cuando ayuda).
  const porEnviar = filas.filter((f) => f.revokedAt === null && (f.invitationSentAt ?? null) === null).length
  const algunaEnviada = filas.some((f) => (f.invitationSentAt ?? null) !== null)
  const pendientes = filas.filter((f) => f.revokedAt === null && f.confirmed === null).length
  const escribir = {
    titulo: 'Escribe tu invitación',
    detalle: 'Para enviarla basta con quién celebra y sus papás. Lo que no escribas sale como el ejemplo del diseño.',
    accion: 'Escribirla',
    href: `${base}/configuracion`,
    secundaria: { accion: 'Verla', href: `${base}/vista-previa` },
  }
  const proximo =
    !invitacionLista && !algunaEnviada
      ? escribir
      : filas.length === 0
        ? { titulo: 'Carga a tus invitados', detalle: 'Cada uno recibe su enlace; sus acompañantes entran con el mismo.', accion: 'Añadir invitados', href: `${base}/invitados?panel=alta`, secundaria: { accion: 'Importar una lista', href: `${base}/invitados?panel=importar` } }
        : porEnviar > 0
          ? { titulo: porEnviar === 1 ? 'Falta 1 invitación por enviar' : `Faltan ${porEnviar} invitaciones por enviar`, detalle: 'Se envían por WhatsApp o con su enlace, una por una.', accion: 'Enviar ahora', href: `${base}/invitados?panel=envio`, secundaria: { accion: 'Ver quiénes son', href: `${base}/invitados` } }
          : !invitacionLista
            ? escribir
            : pendientes > 0
              ? { titulo: `${pendientes} ${pendientes === 1 ? 'invitado aún no responde' : 'invitados aún no responden'}`, detalle: 'Un recordatorio por WhatsApp suele traer la mitad de vuelta.', accion: 'Enviar recordatorios', href: `${base}/invitados`, secundaria: { accion: 'Ver quiénes son', href: `${base}/invitados` } }
              : { titulo: 'Todos respondieron', detalle: `${vienen} ${vienen === 1 ? 'persona viene' : 'personas vienen'}.`, accion: 'Ver invitados', href: `${base}/invitados`, secundaria: null }

  // ── Esta semana: lo que vence o ya venció, cada cosa con adónde ir.
  const bs = (cents: number) => formatAmount(cents, DEFAULT_CURRENCY)
  const dia = (iso: string) => diaCorto(new Date(`${iso}T12:00:00.000Z`))
  const semana: Pendiente[] = [
    ...pagosQueVencen(partidas, hoyBolivia).map((g) => ({
      clave: `pago-${g.id}`,
      titulo: `Pagar ${g.concepto.charAt(0).toLowerCase()}${g.concepto.slice(1)}`,
      detalle: `${bs(g.amountCents)}, ${g.dueDate! < hoyBolivia ? 'venció' : 'vence'} el ${dia(g.dueDate!)}`,
      accion: 'Ver pago',
      href: `${base}/planner/presupuesto`,
    })),
    ...(mesas !== null && mesas.unseated.length > 0
      ? [{ clave: 'mesas', titulo: `Sentar ${mesas.unseated.length === 1 ? 'a 1 invitación' : `a ${mesas.unseated.length} invitaciones`}`, detalle: 'Aún no tienen mesa', accion: 'Ir a mesas', href: `${base}/mesas` }]
      : []),
    ...proveedoresSinConfirmar(proveedores).map((v): Pendiente => {
      const whatsapp = v.whatsapp ? buildWhatsAppLink(v.whatsapp, `Hola, ¿nos confirmas para ${event.value.title}?`) : null
      return {
        clave: `prov-${v.id}`,
        titulo: `Confirmar ${v.service.charAt(0).toLowerCase()}${v.service.slice(1)}`,
        detalle: 'Todavía no confirmó',
        accion: whatsapp === null ? 'Ver' : 'Escribirle',
        href: whatsapp ?? `${base}/planner/proveedores`,
        externo: whatsapp !== null,
      }
    }),
    ...tareas
      .map((t) => ({ t, estado: estadoDeTarea(t, hoyBolivia) }))
      .filter(({ estado }) => estado === 'atrasada' || estado === 'semana')
      .map(({ t, estado }) => ({ clave: `tarea-${t.id}`, titulo: t.title, detalle: `${estado === 'atrasada' ? 'Venció' : 'Vence'} el ${dia(t.dueDate!)}`, accion: 'Ver', href: `${base}/planner/tareas` })),
    ...(porAgradecer > 0
      ? [{ clave: 'firmas', titulo: `Agradecer ${porAgradecer === 1 ? '1 firma nueva' : `${porAgradecer} firmas nuevas`}`, detalle: 'En tu libro de firmas', accion: 'Leer', href: `${base}/mensajes` }]
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
          {dias > 1 ? `Faltan ${dias} días` : dias === 1 ? 'Es mañana' : dias === 0 ? `Hoy es ${fiesta === 'xv' ? 'la fiesta' : fiesta === 'cumple' ? 'el cumpleaños' : 'la boda'}` : event.value.title}
        </h1>
        {donde === '' ? null : <p className="mt-1 text-[15px] text-shell-ink/85">{donde}</p>}
      </section>

      <article className={`${TARJETA_DESTACADA} flex flex-wrap items-center gap-6 px-7.5 py-7 max-[559px]:p-5.5`}>
        <div className="min-w-0 flex-[1_1_320px]">
          <Pill tone="pending">Lo próximo</Pill>
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

      <div className="flex flex-wrap items-start gap-10 max-[767px]:gap-7">
        <section aria-labelledby="invitacion-titulo" className="min-w-0 flex-[1_1_360px] scroll-mt-24" id="invitacion">
          <div className="mb-3.5 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-[24px] font-medium max-[767px]:sr-only" id="invitacion-titulo">
              Cómo va tu invitación
            </h2>
            <Link className="inline-flex min-h-11 items-center text-[14px] max-[767px]:hidden" href={`${base}/informe`}>
              Informe del evento
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <Aro porcentaje={respondio} />
            <dl className="grid grid-cols-[auto_auto] gap-x-4.5 gap-y-2 text-[14.5px]">
              <Fila color="bg-shell-deep" etiqueta="Asisten" valor={vienen} />
              <Fila color="bg-gold" etiqueta="No vienen" valor={noVienen} />
              <Fila color="bg-line-panel" destacar={sinResponder > 0} etiqueta="Sin responder" valor={sinResponder} />
              <dt className="text-ink-mute max-[767px]:hidden">La vieron</dt>
              <dd className="m-0 [font-variant-numeric:tabular-nums] max-[767px]:hidden">{vistas === null ? '—' : vistas.total === 1 ? '1 vez' : `${vistas.total} veces`}</dd>
            </dl>
          </div>
          {aparato === undefined || camino === undefined ? null : (
            <p className="mt-4.5 text-[14px] text-ink-mute max-[767px]:hidden">
              La abren sobre todo desde {aparato.label === 'Móvil' ? 'el celular' : aparato.label === 'Tableta' ? 'la tablet' : 'la computadora'} ({aparato.percent} %) y les llega por {camino.label} ({camino.percent} %).
            </p>
          )}
        </section>

        <section aria-labelledby="semana-titulo" className="min-w-0 flex-[1_1_360px]">
          <h2 className="mb-1.5 font-display text-[24px] font-medium" id="semana-titulo">
            Esta semana
          </h2>
          {semana.length === 0 ? (
            <p className="border-t border-line-panel py-4 text-[15px] text-ink-mute">Nada vence esta semana.</p>
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
        <PanelCard action={<PanelButton href={`${base}/ajustes`}>Cambiar preguntas</PanelButton>} title="Lo que contestaron">
          <LoQueContestaron resultados={await rsvp.preguntas.resultados(id)} />
        </PanelCard>
      ) : null}

      {firmas.length === 0 ? null : (
        <section aria-labelledby="firmas-titulo">
          <div aria-hidden className="mb-5.5 h-[3px] border-y border-gold max-[767px]:hidden" />
          <h2 className="mb-3.5 font-display text-[24px] font-medium max-[767px]:sr-only" id="firmas-titulo">
            Lo último que escribieron
          </h2>
          <div className="grid gap-5 min-[768px]:grid-cols-3">
            {firmas.slice(0, 3).map((m, i) => (
              <blockquote className={`m-0 rounded-[14px] border border-line-panel bg-bg-raised px-5 py-4.5 ${i > 0 ? 'max-[767px]:hidden' : ''}`} data-cita key={m.responseId}>
                <p className="font-display text-[17px] leading-[1.45] italic" data-cita>
                  «{m.body}»
                </p>
                <footer className="mt-2.5 text-[13px] text-ink-mute">
                  {m.responderName ?? m.groupLabel}, {hace(m.writtenAt, ahora)}
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
        <span className="text-[12.5px] text-ink-mute max-[767px]:hidden">respondió</span>
      </span>
    </div>
  )
}

function Fila({ etiqueta, valor, color, destacar = false }: { etiqueta: string; valor: number; color: string; destacar?: boolean }) {
  return (
    <>
      <dt className="flex items-center gap-2">
        <span aria-hidden className={`size-2.5 rounded-[3px] ${color} max-[767px]:hidden`} />
        {etiqueta}
      </dt>
      <dd className={`m-0 font-semibold [font-variant-numeric:tabular-nums] ${destacar ? 'max-[767px]:text-gold-deep' : ''}`}>{valor}</dd>
    </>
  )
}
