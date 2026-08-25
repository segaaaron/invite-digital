import { admin } from '@/app/composition/container'
import { requireAdmin } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Auditoría' }
export const dynamic = 'force-dynamic'

const CUANDO = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

const NOMBRE: Record<string, string> = {
  'usuario.alta': 'Creó un usuario',
  'usuario.rol': 'Cambió un rol',
  'usuario.borrado': 'Borró un usuario',
  'evento.reasignado': 'Reasignó un evento',
  'evento.plan': 'Cambió el plan de un evento',
  'evento.borrado': 'Borró un evento',
}

/**
 * El registro de la administración.
 *
 * Solo escrituras. **No se anota ninguna lectura**: eso sería un rastro de navegación del
 * atelier, y lo que no se escribe no se filtra.
 */
export default async function AdminAuditoriaPage() {
  await requireAdmin()
  const registro = await admin.audit()

  return (
    <>
      <PanelHeader
        kicker="Administración"
        meta="Solo escrituras: quién creó, cambió o borró algo. Las lecturas no se registran."
        title="Auditoría"
      />

      <PanelCard>
        {isErr(registro) ? (
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer la auditoría. La base no responde; vuelve a intentarlo en un momento.
          </p>
        ) : registro.value.length === 0 ? (
          <p className="text-[13px] text-ink-mute">Todavía no hay nada anotado.</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {['Cuándo', 'Quién', 'Qué', 'Sobre'].map((titulo) => (
                    <th
                      key={titulo}
                      className="border-b border-line-panel py-3 pr-3 font-mono text-[9px] font-medium tracking-[0.3em] text-ink-mute uppercase"
                    >
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registro.value.map((fila) => (
                  <tr key={fila.id}>
                    <td className="border-b border-line-panel py-3 pr-3 font-mono text-[11px] whitespace-nowrap text-ink-mute">
                      {CUANDO.format(fila.createdAt)}
                    </td>
                    <td className="border-b border-line-panel py-3 pr-3 text-[13px] text-ink-soft">{fila.actorEmail}</td>
                    <td className="border-b border-line-panel py-3 pr-3 text-[13px] text-ink">
                      {NOMBRE[fila.action] ?? fila.action}
                    </td>
                    <td className="border-b border-line-panel py-3 text-[13px] text-ink-soft">
                      {fila.subject ?? '—'}
                      {fila.detail === null ? null : <span className="text-ink-mute"> · {fila.detail}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </>
  )
}
