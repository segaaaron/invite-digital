import { notFound, redirect } from 'next/navigation'
import { env } from '@/shared/config/env'
import { events, plans, rsvp } from '@/app/composition/container'
import { renderMessage } from '@/modules/guests'
import { NombreDelEvento } from '@/modules/events/ui/NombreDelEvento'
import { SaveTheDateCard } from '@/modules/events/ui/SaveTheDateCard'
import { EstiloDelEventoCard } from '@/modules/events/ui/EstiloDelEventoCard'
import { acentosPara, CALIGRAFIAS, TITULARES } from '@/modules/events/domain/estilo'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { PreguntasAlConfirmar } from '@/modules/rsvp/ui/PreguntasAlConfirmar'
import { gestionaElEvento } from '@/modules/identity'
import { hasFeature } from '@/modules/plans'
import { requireSession } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { FONT_VARIABLES } from '@/shared/design/font-manifest'
import { themeFonts } from '@/shared/design/fonts'
import { isErr } from '@/shared/result'
import { tr } from '@/shared/i18n/idioma-servidor'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Datos y estilo', 'Details and style') }
}
export const dynamic = 'force-dynamic'

const DIA = new Intl.DateTimeFormat('es-BO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

/**
 * **La configuración del evento, como en la maqueta «Esmeralda y Latón»** (E31 · M42, 12 de octubre): lo que no es
 * escribir la invitación —eso es «Mi invitación»—. El nombre con que se lo ve en el panel, el mensaje con que salen las
 * invitaciones, los colores y la letra, el save the date y las preguntas al confirmar.
 *
 * Es de quien organiza por pertenencia (anfitrión, co-anfitrión, planner); el atelier y el admin tienen todo eso, y
 * más, en la ficha del evento.
 */
export default async function AjustesDelEventoPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = await tr()
  const actor = await requireSession()
  const { slug } = await params
  const event = await events.getFor(actor, slug, { section: 'configuracion' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }
  // Quien gestiona el evento lo configura en su ficha, con el diseño, el plan y los accesos.
  if (gestionaElEvento(actor, event.value)) redirect(`/panel/eventos/${event.value.slug}/configuracion`)

  const tema = themeFor(event.value.themeKey)
  const base = `/panel/eventos/${event.value.slug}`
  const [capacidad, estilo, preguntas, comprado, token] = await Promise.all([
    plans.allowanceFor(event.value.id),
    events.estilo.leer(event.value.id),
    rsvp.preguntas.leer(event.value.id),
    events.saveTheDate.comprado(event.value.id),
    events.saveTheDate.leer(event.value.id),
  ])
  const muestra = renderMessage({
    template: event.value.messageTemplate ?? null,
    locale: event.value.locale,
    // Con un nombre de ejemplo, no «{nombre}»: es una vista de cómo se lee (16 oct).
    groupLabel: 'María Fernanda',
    url: '…',
    seats: 2,
    fecha: DIA.format(new Date(`${event.value.eventDate}T12:00:00Z`)),
    evento: event.value.title,
  })

  return (
    <>
      <PanelHeader meta={t('Los datos del evento y lo que acompaña a tu invitación.', 'The event details and what goes with your invitation.')} title={t('Datos y estilo', 'Details and style')} />
      <div className="grid items-start gap-6 min-[1100px]:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <PanelCard title={t('Datos del evento', 'Event details')}>
            <NombreDelEvento eventId={event.value.id} title={event.value.title} />
            <p className="mt-4 text-[13.5px] text-ink-mute">
              {t('La fecha, el idioma y el diseño los cambia el atelier: escríbenos si hace falta.', 'The date, language and design are changed by the atelier: message us if needed.')}
            </p>
          </PanelCard>

          <PanelCard title={t('Mensaje de las invitaciones', 'Invitation message')}>
            {/* Así sale por WhatsApp; el nombre de cada invitado y su enlace se ponen solos. */}
            <p className="mb-2.5 text-[13.5px] text-ink-mute">{t('Así le llega a una invitada de ejemplo. A cada uno le sale su nombre y su enlace.', 'This is how an example guest receives it. Each one gets their own name and link.')}</p>
            <blockquote className="m-0 rounded-[12px] bg-bg px-4.5 py-4 font-display text-[16px] leading-relaxed whitespace-pre-line italic" data-cita>
              «{muestra.replace('…', '').trim()}»
            </blockquote>
            <div className="mt-4">
              <PanelButton href={`${base}/invitados?panel=envio`}>{t('Ver cómo sale al enviar', 'See how it goes out')}</PanelButton>
            </div>
          </PanelCard>

          <PanelCard title={t('Preguntas al confirmar', 'RSVP questions')}>
            <PreguntasAlConfirmar eventId={event.value.id} eventSlug={event.value.slug} preguntas={preguntas} />
          </PanelCard>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {tema.estilo === undefined ? null : (
            <PanelCard title={t('Colores y letra', 'Colors and lettering')}>
              <EstiloDelEventoCard
                acentoDelDiseno={tema.estilo.acento?.principal ?? null}
                acentos={tema.estilo.acento === undefined ? [] : acentosPara(tema.estilo.acento)}
                caligrafias={tema.estilo.caligrafia === undefined ? [] : CALIGRAFIAS.filter((c) => c.clave !== tema.estilo?.caligrafia).map((c) => ({ ...c, clase: themeFonts[c.clave].variable, familia: `var(${FONT_VARIABLES[c.clave]})` }))}
                disponible={!isErr(capacidad) && hasFeature(capacidad.value, 'estilo')}
                estilo={estilo}
                eventId={event.value.id}
                eventSlug={event.value.slug}
                mejorar={null}
                titulares={tema.estilo.titulares === undefined ? [] : TITULARES.filter((c) => c.clave !== tema.estilo?.titulares).map((c) => ({ ...c, clase: themeFonts[c.clave].variable, familia: `var(${FONT_VARIABLES[c.clave]})` }))}
              />
            </PanelCard>
          )}

          <PanelCard title={t('Save the date', 'Save the date')}>
            <SaveTheDateCard
              disponible={comprado}
              eventId={event.value.id}
              eventSlug={event.value.slug}
              extras={`${base}/extras`}
              url={token === null ? null : `${env.SITE_URL.replace(/\/+$/, '')}/guarda/${token}`}
            />
          </PanelCard>
        </div>
      </div>
    </>
  )
}
