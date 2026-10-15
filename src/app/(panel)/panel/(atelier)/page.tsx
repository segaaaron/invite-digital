import { redirect } from 'next/navigation'
import { events, guests } from '@/app/composition/container'
import { isAdmin, puedeCrearEventos } from '@/modules/identity'
import { EventList } from '@/modules/events/ui/EventList'
import { requireSession } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'
import { tr } from '@/shared/i18n/idioma-servidor'

export default async function PanelHomePage() {
  const t = await tr()
  const actor = await requireSession()
  // La bandeja enlaza al resumen de cada boda, que el admin no abre: su lista es la cartera.
  if (isAdmin(actor)) redirect('/panel/admin/eventos')
  const listed = await events.listFor(actor)
  // Cómo va cada uno: quiénes confirmaron de cuántas personas (una lectura por evento; un cliente tiene pocos).
  const avance = isErr(listed)
    ? {}
    : Object.fromEntries(
        await Promise.all(
          listed.value.map(async (e) => {
            const gente = await guests.listPeople(e.id)
            const lista = isErr(gente) ? [] : gente.value
            return [e.id, { vienen: lista.filter((p) => p.attending === 'yes').length, personas: lista.length }] as const
          }),
        ),
      )

  return (
    <>
      {/* El alta es del atelier: a un cliente o a la puerta un evento suyo no se les abriría. */}
      <PanelHeader
        actions={
          puedeCrearEventos(actor) ? (
            <PanelButton href="/panel/eventos/nuevo" variant="primary">
              + Nuevo evento
            </PanelButton>
          ) : undefined
        }
        meta={actor.role === 'atelier' ? undefined : t('Elige cuál quieres organizar ahora.', 'Choose which one you want to organize now.')}
        title={actor.role === 'atelier' ? t('Eventos', 'Events') : t('Mis eventos', 'My events')}
      />

      {isErr(listed) ? (
          <p className="text-[14px] text-danger" role="alert">
            No pudimos leer los eventos. La base no responde; vuelve a intentarlo en un momento.
          </p>
        ) : (
        <EventList avance={avance} events={listed.value} />
      )}
    </>
  )
}
