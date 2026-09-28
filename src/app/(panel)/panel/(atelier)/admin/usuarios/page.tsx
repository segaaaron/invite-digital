import Link from 'next/link'
import { admin } from '@/app/composition/container'
import { COLUMNAS_DE_EQUIPO, NewUserForm, UserRow } from '@/modules/admin/ui/UserAdmin'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { EncabezadoDeLista } from '@/shared/design/ui/panel/lista'
import { PanelLateral } from '@/shared/design/ui/panel/PanelLateral'
import { hace } from '@/shared/format/fecha'
import { plural } from '@/shared/format/plural'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Equipo · Administración' }
export const dynamic = 'force-dynamic'

const ALTA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/La_Paz' })
const BASE = '/panel/admin/usuarios'

/**
 * **El equipo**: quien trabaja en el panel —administradores y ateliers—. Los clientes ya no salen
 * aquí: viven en Clientes, con su evento, y su cuenta nace con él. El alta es un panel lateral que
 * abre «+ Crear › Persona del equipo» (`?crear=persona`); cambiar el rol y borrar van en «⋯».
 */
export default async function AdminUsuariosPage({ searchParams }: { searchParams: Promise<{ crear?: string; panel?: string }> }) {
  const actor = await requireAdmin()
  const { crear, panel } = await searchParams
  const usuarios = await admin.users()
  const ahora = new Date()
  const equipo = isErr(usuarios) ? [] : usuarios.value.filter((u) => u.role !== 'cliente')
  const clientes = isErr(usuarios) ? 0 : usuarios.value.length - equipo.length

  return (
    <>
      <PanelHeader kicker="Ajustes" meta={isErr(usuarios) ? 'Quién trabaja en el panel' : `${plural(equipo.length, 'persona', 'personas')} con acceso al panel`} title="Equipo" />

      {crear === 'persona' || panel === 'alta' ? (
        <PanelLateral closeHref={BASE} subtitle="Administrador o atelier, con cuenta propia" title="Persona del equipo">
          <NewUserForm />
        </PanelLateral>
      ) : null}

      <PanelCard>
        {isErr(usuarios) ? (
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer el equipo. La base no responde; vuelve a intentarlo en un momento.
          </p>
        ) : (
          <>
            <EncabezadoDeLista columnas={['Persona', 'Rol', 'Eventos', 'Último acceso', '']} plantilla={COLUMNAS_DE_EQUIPO} />
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
                    alta: ALTA.format(usuario.createdAt),
                    nombre: usuario.fullName ?? null,
                    ultimoAcceso: usuario.ultimoAcceso == null ? null : hace(usuario.ultimoAcceso, ahora),
                  }}
                />
              ))}
            </ul>
          </>
        )}
      </PanelCard>

      {clientes === 0 ? null : (
        <p className="mt-4 text-[12.5px] text-ink-mute">
          {plural(clientes, 'cuenta de cliente vive', 'cuentas de cliente viven')} en{' '}
          <Link className="text-ink underline underline-offset-4" href="/panel/admin/clientes">
            Clientes
          </Link>
          , junto a su evento.
        </p>
      )}
    </>
  )
}
