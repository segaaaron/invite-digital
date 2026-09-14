import { admin } from '@/app/composition/container'
import { NewUserForm, UserRow } from '@/modules/admin/ui/UserAdmin'
import { requireAdmin } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Usuarios' }
export const dynamic = 'force-dynamic'

export default async function AdminUsuariosPage() {
  const actor = await requireAdmin()
  const [usuarios, planes] = await Promise.all([admin.users(), admin.planSlugs()])

  return (
    <>
      <PanelHeader kicker="Administración" meta="No hay registro público: las altas se hacen aquí" title="Usuarios" />

      <div className="flex flex-col gap-4.5">
        <PanelCard title="Nuevo usuario">
          <NewUserForm planes={planes} />
        </PanelCard>

        <PanelCard title="Usuarios">
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
                    planSlug: usuario.planSlug,
                  }}
                  planes={planes}
                />
              ))}
            </ul>
          )}
        </PanelCard>
      </div>
    </>
  )
}
