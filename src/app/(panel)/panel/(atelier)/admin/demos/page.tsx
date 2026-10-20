import type { Metadata } from 'next'
import Link from 'next/link'
import { events as eventos, guests } from '@/app/composition/container'
import { enlaceDeLaDemo } from '@/app/_acciones/admin/enlace-de-demo'
import { requireAdmin } from '@/app/_acciones/sesion'
import { BorrarDemo } from '@/modules/admin/ui/BorrarDemo'
import { NuevaDemo } from '@/modules/admin/ui/NuevaDemo'
import { PestanasDeAdmin } from '@/modules/admin'
import { horasQueLeQuedan } from '@/modules/events'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { nombreDelCatalogo } from '@/shared/design/theme-catalog'
import { CopyLinkButton } from '@/shared/design/ui/CopyLinkButton'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { PanelAlert, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { PanelLateral } from '@/shared/design/ui/panel/PanelLateral'
import { PlusIcon } from '@/shared/design/ui/icons'
import { idiomaDeLaPeticion, tr } from '@/shared/i18n/idioma-servidor'
import { registrarFallo } from '@/shared/observability/fallos'
import { isErr } from '@/shared/result'

export async function generateMetadata(): Promise<Metadata> {
  const t = await tr()
  return { title: t('Demos · Administración', 'Demos · Administration') }
}

// Lo que se enseña cambia con cada hora que pasa: nada que cachear.
export const dynamic = 'force-dynamic'

const BASE = '/panel/admin/demos'

/**
 * **Demos**: la invitación de muestra que se le manda a un posible cliente para que vea cómo funciona
 * —y cómo le llegaría a sus invitados— antes de decidir qué plan compra.
 *
 * No son eventos vendidos y no salen en la cartera, ni en los ingresos, ni en Clientes: lo único que las
 * distingue es su fecha de muerte (`events.demo_until`), y con ella el barrido diario se las lleva enteras.
 * Por eso esta pantalla enseña **lo que le queda a cada una**: es el dato que decide si hay que rehacerla.
 */
export default async function AdminDemosPage({ searchParams }: { searchParams: Promise<{ panel?: string }> }) {
  const t = await tr()
  const locale = await idiomaDeLaPeticion()
  await requireAdmin()
  const { panel } = await searchParams
  const lista = await eventos.listDemos()
  const ahora = new Date()

  if (isErr(lista)) {
    // Las pantallas hermanas del admin lo registran; esta también, o el fallo se queda solo en la pantalla
    // de quien pasaba por ahí. Con «no se pudo» para que el filtro de `fallos.ts` lo deje entrar.
    registrarFallo('panel/admin/demos/page', 'no se pudo leer la lista de demos', lista.error.kind, lista.error.detail)
  }

  // El enlace de cada una, ya acuñado: es lo que el admin viene a copiar. Son cinco filas, no una lista.
  const filas = isErr(lista)
    ? []
    : await Promise.all(
        lista.value.map(async (demo) => {
          const grupos = await guests.list(demo.id)
          const primero = isErr(grupos) ? undefined : grupos.value[0]
          const enlace = await enlaceDeLaDemo(demo.id)
          return {
            demo,
            para: primero?.label ?? null,
            enlace,
            horas: demo.demoUntil === null ? 0 : horasQueLeQuedan(demo.demoUntil, ahora),
          }
        }),
      )

  return (
    <>
      <PanelHeader
        actions={
          <PanelButton href={`${BASE}?panel=nueva`} variant="primary">
            <PlusIcon className="size-4" /> {t('Nueva demo', 'New demo')}
          </PanelButton>
        }
        bajoPestanas={t(
          'La invitación de muestra que le mandas a un cliente por WhatsApp. Abre un día y después se borra sola.',
          'The sample invitation you send a client on WhatsApp. It opens for one day and then deletes itself.',
        )}
        pestanas={<PestanasDeAdmin />}
        title={t('Demos', 'Demos')}
      />

      {panel === 'nueva' ? (
        <PanelLateral
          closeHref={BASE}
          subtitle={t('Elige el diseño, ponle nombres y sale el enlace', 'Pick the design, add names and the link comes out')}
          title={t('Nueva demo', 'New demo')}
        >
          <NuevaDemo />
        </PanelLateral>
      ) : null}

      <PanelCard>
        {isErr(lista) ? (
          <p className="text-[13px] text-danger" role="alert">
            {t('No pudimos leer las demos. La base no responde; vuelve a intentarlo en un momento.', 'We couldn’t read the demos. The database is not responding; try again in a moment.')}
          </p>
        ) : filas.length === 0 ? (
          <EmptyState
            action={<PanelButton href={`${BASE}?panel=nueva`} variant="primary">{t('Nueva demo', 'New demo')}</PanelButton>}
            description={t(
              'Cuando un cliente pregunte cómo son las invitaciones, arma una aquí y mándasela: la ve en su celular como la vería un invitado suyo.',
              'When a client asks what the invitations are like, build one here and send it: they see it on their phone just like one of their guests would.',
            )}
            title={t('Todavía no hay ninguna demo', 'No demos yet')}
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {filas.map(({ demo, para, enlace, horas }) => (
              <li className="flex flex-col gap-3 border-b border-line-panel pb-4 last:border-0 last:pb-0" key={demo.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-medium text-ink">{demo.title}</p>
                    <p className="text-[13px] text-ink-mute">
                      {nombreDelCatalogo(demo.themeKey, locale) ?? demo.themeKey}
                      {para === null ? '' : ` · ${t('a nombre de', 'addressed to')} ${para}`}
                    </p>
                  </div>
                  {/* Lo que de verdad importa de una demo: si todavía abre. El color acompaña al texto, no lo sustituye. */}
                  {horas === 0 ? (
                    <Pill tone="no">{t('Caducada', 'Expired')}</Pill>
                  ) : (
                    <Pill tone={horas <= 4 ? 'pending' : 'ok'}>{t(`Caduca en ${horas} h`, `Expires in ${horas} h`)}</Pill>
                  )}
                </div>

                {horas === 0 ? (
                  <PanelAlert tone="info">
                    {t('Ya no abre. El barrido de la noche la borra sola; si la necesitas ahora, crea otra.', 'It no longer opens. The nightly sweep deletes it; if you need it now, create another one.')}
                  </PanelAlert>
                ) : enlace.estado === 'sin_invitado' ? (
                  // Permanente: el alta se quedó a medias. Reintentar no la arregla, rehacerla sí.
                  <PanelAlert tone="error">{t('Esta demo se quedó sin invitación. Bórrala y crea otra.', 'This demo ended up without an invitation. Delete it and create another one.')}</PanelAlert>
                ) : enlace.estado === 'no_se_pudo_leer' ? (
                  // Pasajero: la demo está bien. Antes decía «bórrala», y el admin borraba una demo buena.
                  <PanelAlert tone="info">{t('No pudimos leer su enlace ahora mismo. La demo sigue viva: recarga la página.', 'We couldn’t read its link right now. The demo is still alive: reload the page.')}</PanelAlert>
                ) : (
                  <CopyLinkButton label={t('Enlace de la demo', 'Demo link')} url={enlace.url} />
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <PanelButton href={`/panel/eventos/${demo.slug}/configuracion`} size="sm">
                    {t('Editarla', 'Edit it')}
                  </PanelButton>
                  {enlace.estado !== 'listo' || horas === 0 ? null : (
                    <PanelButton
                      external
                      href={`https://wa.me/?text=${encodeURIComponent(t(`Mira cómo quedaría tu invitación: ${enlace.url}\n\nEs una demostración y solo abre durante un día.`, `See how your invitation would look: ${enlace.url}\n\nIt’s a demo and it only opens for one day.`))}`}
                      size="sm"
                    >
                      {t('WhatsApp', 'WhatsApp')}
                    </PanelButton>
                  )}
                  <Link className="text-[13px] text-ink-mute underline-offset-4 hover:text-ink hover:underline" href={`/panel/eventos/${demo.slug}/vista-previa`}>
                    {t('Verla', 'View it')}
                  </Link>
                  <span className="flex-1" />
                  <BorrarDemo eventId={demo.id} titulo={demo.title} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </>
  )
}
