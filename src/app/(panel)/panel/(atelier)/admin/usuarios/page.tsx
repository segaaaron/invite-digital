import { admin } from '@/app/composition/container'
import { NewUserForm, UserRow } from '@/modules/admin/ui/UserAdmin'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
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
  const usuarios = await admin.users()

  return (
    <>
      <PanelHeader
        actions={
          <PanelButton href="/panel/admin/usuarios?panel=alta" variant="primary">
            + Agregar usuario
          </PanelButton>
        }
        kicker="Administración"
        meta={isErr(usuarios) ? 'Quién puede entrar al panel' : `${usuarios.value.length} usuario${usuarios.value.length === 1 ? '' : 's'} con acceso al panel`}
        title="Usuarios"
      />

      {panel === 'alta' ? (
        <PanelDialog closeHref="/panel/admin/usuarios" title="Agregar usuario" width={520}>
          <NewUserForm />
        </PanelDialog>
      ) : null}

      <PanelCard>
        {isErr(usuarios) ? (
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer los usuarios. La base no responde; vuelve a intentarlo en un momento.
          </p>
        ) : (
          <ul className="flex flex-col">
            {usuarios.value.map((usuario) => (
              <UserRow
                key={usuario.id}
                user={{
                  id: usuario.id,
                  email: usuario.email,
                  role: usuario.role,
                  eventos: usuario.eventos,
                  esUnoMismo: usuario.id === actor.userId,
                  alta: ALTA.format(usuario.createdAt),
                }}
              />
            ))}
          </ul>
        )}
      </PanelCard>
    </>
  )
}
