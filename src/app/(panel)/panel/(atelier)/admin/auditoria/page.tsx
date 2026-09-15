import { admin } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { isErr } from '@/shared/result'
import { LoadMoreLink } from '@/shared/design/ui/panel/estados'

export const metadata = { title: 'Auditoría' }
export const dynamic = 'force-dynamic'

const CUANDO = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

// Cada acción que se anota tiene su frase. Una sin traducir salía como su clave interna
// —«pagos.datos»—, que no le dice nada a quien lee el registro.
const NOMBRE: Record<string, string> = {
  'usuario.alta': 'Creó un usuario',
  'usuario.rol': 'Cambió un rol',
  'usuario.plan': 'Cambió el plan de un usuario',
  'usuario.borrado': 'Borró un usuario',
  'web.editada': 'Editó La web',
  'web.restaurada': 'Restauró una versión de La web',
  'evento.reasignado': 'Reasignó un evento',
  'evento.plan': 'Cambió el plan de un evento',
  'evento.borrado': 'Borró un evento',
  'boda.alta': 'Creó un evento para un cliente',
  'pagos.datos': 'Cambió los datos de cobro',
  'pagos.qr': 'Subió el QR de cobro',
  'plan.editado': 'Editó un plan',
  'modelo.publicado': 'Publicó un modelo',
  'modelo.retirado': 'Retiró un modelo',
  'escaparate.musica': 'Subió la música de un modelo',
  'escaparate.musica.quitar': 'Quitó la música de un modelo',
  'escaparate.musica.nombre': 'Cambió el nombre de la canción de un modelo',
  'consulta.estado': 'Movió una consulta',
}

/** De cuántas en cuántas filas se enseña el registro. */
const PAGINA = 50

/**
 * El registro de la administración.
 *
 * Solo escrituras. **No se anota ninguna lectura**: eso sería un rastro de navegación del
 * atelier, y lo que no se escribe no se filtra.
 */
export default async function AdminAuditoriaPage({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  await requireAdmin()
  // «Ver más» sube el tope en la dirección. Se pide una fila de más para saber si queda algo
  // detrás sin contar la tabla entera.
  const pedido = Number((await searchParams).n)
  const tope = Number.isInteger(pedido) && pedido > 0 ? Math.min(pedido, 2000) : PAGINA
  const leido = await admin.audit(tope + 1)
  const registro = isErr(leido) ? leido : { ...leido, value: leido.value.slice(0, tope) }
  const hayMas = !isErr(leido) && leido.value.length > tope

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
            {hayMas ? <LoadMoreLink href={`/panel/admin/auditoria?n=${tope + PAGINA}`} noun="registros" /> : null}
          </div>
        )}
      </PanelCard>
    </>
  )
}
