import Link from 'next/link'
import { admin } from '@/app/composition/container'
import { NewUserForm, UserRow } from '@/modules/admin/ui/UserAdmin'
import { COLUMNAS_DE_EQUIPO } from '@/modules/admin/ui/columnas-de-equipo'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { PlusIcon } from '@/shared/design/ui/icons'
import { PestanasDeAdmin } from '@/modules/admin'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { EncabezadoDeLista } from '@/shared/design/ui/panel/lista'
import { PanelLateral } from '@/shared/design/ui/panel/PanelLateral'
import { hace } from '@/shared/format/fecha'
import { plural } from '@/shared/format/plural'
import { isErr } from '@/shared/result'
import { idiomaDeLaPeticion, tr } from '@/shared/i18n/idioma-servidor'
import type { Locale } from '@/shared/i18n/locales'
import { INTL } from '@/shared/i18n/t'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Equipo · Administración', 'Team · Administration') }
}
export const dynamic = 'force-dynamic'

const alta = (locale: Locale) => new Intl.DateTimeFormat(INTL[locale], { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/La_Paz' })
const BASE = '/panel/admin/usuarios'

/**
 * **El equipo**: quien trabaja en el panel —administradores y ateliers—. Los clientes ya no salen
 * aquí: viven en Clientes, con su evento, y su cuenta nace con él. El alta es un panel lateral que
 * abre «+ Crear › Persona del equipo» (`?crear=persona`); cambiar el rol y borrar van en «⋯».
 */
export default async function AdminUsuariosPage({ searchParams }: { searchParams: Promise<{ crear?: string; panel?: string }> }) {
  const t = await tr()
  const locale = await idiomaDeLaPeticion()
  const actor = await requireAdmin()
  const { crear, panel } = await searchParams
  const usuarios = await admin.users()
  const ahora = new Date()
  const equipo = isErr(usuarios) ? [] : usuarios.value.filter((u) => u.role !== 'cliente')
  const clientes = isErr(usuarios) ? 0 : usuarios.value.length - equipo.length

  return (
    <>
      <PanelHeader
        actions={
          <PanelButton href={`${BASE}?panel=alta`}>
            <PlusIcon className="size-4" /> {t('Sumar a alguien', 'Add someone')}
          </PanelButton>
        }
        bajoPestanas={t('Quién trabaja en el atelier. Los clientes no están aquí: entran a su propio evento.', 'Who works at the atelier. Clients are not here: they sign in to their own event.')}
        pestanas={<PestanasDeAdmin />}
        title={t('Ajustes', 'Settings')} tituloEnCelular={t('Equipo', 'Team')}
      />

      {crear === 'persona' || panel === 'alta' ? (
        <PanelLateral closeHref={BASE} subtitle={t('Administrador o atelier, con cuenta propia', 'Administrator or atelier, with their own account')} title={t('Persona del equipo', 'Team member')}>
          <NewUserForm />
        </PanelLateral>
      ) : null}

      <PanelCard>
        {isErr(usuarios) ? (
          <p className="text-[13px] text-danger" role="alert">
            {t('No pudimos leer el equipo. La base no responde; vuelve a intentarlo en un momento.', 'We could not read the team. The database is not responding; try again in a moment.')}
          </p>
        ) : (
          <>
            <EncabezadoDeLista columnas={[t('Persona', 'Person'), t('Rol', 'Role'), t('Eventos', 'Events'), t('Último acceso', 'Last access'), '']} plantilla={COLUMNAS_DE_EQUIPO} />
            <ul className="flex flex-col">
              {equipo.map((usuario) => (
                <UserRow
                  key={usuario.id}
                  user={{
                    id: usuario.id,
                    email: usuario.email,
                    role: usuario.role,
                    eventos: usuario.eventos,
                    esUnoMismo: usuario.id === actor.userId,
                    alta: alta(locale).format(usuario.createdAt),
                    nombre: usuario.fullName ?? null,
                    ultimoAcceso: usuario.ultimoAcceso == null ? null : hace(usuario.ultimoAcceso, ahora, locale),
                  }}
                />
              ))}
            </ul>
          </>
        )}
      </PanelCard>

      {/* Qué puede hacer cada rol, en una línea cada uno (maqueta E47). */}
      <dl className="mt-5 grid gap-5 rounded-[16px] border border-line-panel bg-bg-raised px-6 py-5 min-[700px]:grid-cols-3">
        <div>
          <dt className="font-medium">{t('Administrador', 'Administrator')}</dt>
          <dd className="m-0 text-[13.5px] text-ink-mute">{t('Todo: ventas, catálogo, ajustes y cualquier evento.', 'Everything: sales, catalog, settings and any event.')}</dd>
        </div>
        <div>
          <dt className="font-medium">{t('Atelier', 'Atelier')}</dt>
          <dd className="m-0 text-[13.5px] text-ink-mute">{t('Sus eventos y los clientes que atiende.', 'Their events and the clients they serve.')}</dd>
        </div>
        <div>
          <dt className="font-medium">{t('Planner', 'Planner')}</dt>
          <dd className="m-0 text-[13.5px] text-ink-mute">{t('Solo los eventos donde la contrataron.', 'Only the events where they were hired.')}</dd>
        </div>
      </dl>

      {clientes === 0 ? null : (
        <p className="mt-4 text-[13.5px] text-ink-mute">
          {plural(clientes, t('cuenta de cliente vive', 'client account lives'), t('cuentas de cliente viven', 'client accounts live'))} {t('en', 'in')}{' '}
          <Link className="text-ink underline underline-offset-4" href="/panel/admin/clientes">
            {t('Clientes', 'Clients')}
          </Link>
          {t(', junto a su evento.', ', next to their event.')}
        </p>
      )}
    </>
  )
}
