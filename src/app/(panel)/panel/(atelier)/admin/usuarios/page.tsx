import { admin } from '@/app/composition/container'
import { NewUserForm, UserRow } from '@/modules/admin/ui/UserAdmin'
import { requireAdmin } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { PanelDialog } from '@/shared/design/ui/panel/PanelDialog'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Usuarios' }
export const dynamic = 'force-dynamic'

const ALTA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/La_Paz' })

/**
 * Los usuarios del sistema. El alta se abre con «+ Agregar usuario» (`?panel=alta`), como las
 * altas de Invitados: abierta siempre ocupaba media pantalla encima de la lista.
 */
export default async function AdminUsuariosPage({ searchParams }: { searchParams: Promise<{ panel?: string }> }) {
  const actor = await requireAdmin()
  const { panel } = await searchParams
  const [usuarios, planes] = await Promise.all([admin.users(), admin.planSlugs()])

  return (
    <>
      <PanelHeader
        actions={
          <PanelButton href="/panel/admin/usuarios?panel=alta" variant="primary">
            + Agregar usuario
          </PanelButton>
        }
        kicker="Administración"
        meta={isErr(usuarios) ? 'No hay registro público: las altas se hacen aquí' : `${usuarios.value.length} usuarios · las altas se hacen aquí`}
        title="Usuarios"
      />

      {panel === 'alta' ? (
        <PanelDialog closeHref="/panel/admin/usuarios" title="Agregar usuario" width={520}>
          <NewUserForm planes={planes} />
        </PanelDialog>
      ) : null}

      <PanelCard>
        {isErr(usuarios) ? (
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer los usuarios. La base no responde; vuelve a intentarlo en un momento.
          </p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr>
                  {['Usuario', 'Rol', 'Plan que compró', 'Eventos', ''].map((titulo, i) => (
                    <th
                      key={titulo || i}
                      className="border-b border-line-panel pb-3 pr-4 font-mono text-[9px] font-medium tracking-[0.3em] text-ink-mute uppercase"
                    >
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.value.map((usuario) => (
                  <UserRow
                    key={usuario.id}
                    planes={planes}
                    user={{
                      id: usuario.id,
                      email: usuario.email,
                      role: usuario.role,
                      eventos: usuario.eventos,
                      esUnoMismo: usuario.id === actor.userId,
                      planSlug: usuario.planSlug,
                      alta: ALTA.format(usuario.createdAt),
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </>
  )
}
