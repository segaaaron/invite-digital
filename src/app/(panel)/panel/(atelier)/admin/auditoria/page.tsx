import { admin } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { isErr } from '@/shared/result'
import { EmptyState, LoadMoreLink } from '@/shared/design/ui/panel/estados'
import { fraseDeAuditoria, GRUPOS_DE_AUDITORIA, prefijosDeGrupo } from '@/modules/admin'
import { patronDeBusqueda } from '@/modules/admin/domain/busqueda'
import { FIELD_CLASS, LABEL_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'

export const metadata = { title: 'Auditoría' }
export const dynamic = 'force-dynamic'

const CUANDO = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

/** De cuántas en cuántas filas se enseña el registro. */
const PAGINA = 50

/**
 * El registro de la administración.
 *
 * Solo escrituras. **No se anota ninguna lectura**: eso sería un rastro de navegación del
 * atelier, y lo que no se escribe no se filtra.
 */
export default async function AdminAuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string; quien?: string; tipo?: string; q?: string }>
}) {
  await requireAdmin()
  const params = await searchParams
  // «Ver más» sube el tope en la dirección. Se pide una fila de más para saber si queda algo
  // detrás sin contar la tabla entera.
  const pedido = Number(params.n)
  const tope = Number.isInteger(pedido) && pedido > 0 ? Math.min(pedido, 2000) : PAGINA

  // Los filtros viven en la dirección (formulario GET): se enlazan y funcionan sin JavaScript.
  const actores = await admin.auditActors()
  const quien = params.quien !== undefined && actores.includes(params.quien) ? params.quien : undefined
  const tipo = prefijosDeGrupo(params.tipo) === null ? undefined : params.tipo
  const q = (params.q ?? '').trim()
  const patron = patronDeBusqueda(q) ?? undefined
  const filtrando = quien !== undefined || tipo !== undefined || patron !== undefined
  const enlace = (n?: number) => {
    const u = new URLSearchParams()
    if (quien !== undefined) u.set('quien', quien)
    if (tipo !== undefined) u.set('tipo', tipo)
    if (q !== '') u.set('q', q)
    if (n !== undefined) u.set('n', String(n))
    const cadena = u.toString()
    return cadena === '' ? '/panel/admin/auditoria' : `/panel/admin/auditoria?${cadena}`
  }

  const leido = await admin.audit(tope + 1, { actorEmail: quien, prefijos: prefijosDeGrupo(tipo) ?? undefined, patron })
  const registro = isErr(leido) ? leido : { ...leido, value: leido.value.slice(0, tope) }
  const hayMas = !isErr(leido) && leido.value.length > tope

  return (
    <>
      <PanelHeader
        kicker="Administración"
        meta="Solo escrituras: quién creó, cambió o borró algo. Las lecturas no se registran."
        title="Auditoría"
      />

      <form action="/panel/admin/auditoria" className="mb-4.5 grid gap-3 min-[760px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto] min-[760px]:items-end" method="get" role="search">
        <label className="flex flex-col gap-2">
          <span className={LABEL_CLASS}>Quién</span>
          <select className={FIELD_CLASS} defaultValue={quien ?? ''} name="quien">
            <option value="">Todos</option>
            {actores.map((correo) => (
              <option key={correo} value={correo}>
                {correo}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className={LABEL_CLASS}>Tipo</span>
          <select className={FIELD_CLASS} defaultValue={tipo ?? ''} name="tipo">
            <option value="">Todos</option>
            {GRUPOS_DE_AUDITORIA.map((g) => (
              <option key={g.clave} value={g.clave}>
                {g.titulo}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className={LABEL_CLASS}>Sobre qué</span>
          <input className={FIELD_CLASS} defaultValue={q} name="q" placeholder="Evento, modelo, correo…" type="search" />
        </label>
        <span className="flex gap-2">
          <PanelButton type="submit" variant="primary">
            Filtrar
          </PanelButton>
          {filtrando ? <PanelButton href="/panel/admin/auditoria">Quitar filtros</PanelButton> : null}
        </span>
      </form>

      <PanelCard>
        {isErr(registro) ? (
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer la auditoría. La base no responde; vuelve a intentarlo en un momento.
          </p>
        ) : registro.value.length === 0 ? (
          filtrando ? (
            <EmptyState compact description="Prueba con otro tipo, otra persona o menos texto." title="Nada con estos filtros" />
          ) : (
            <EmptyState compact description="Cada vez que alguien del equipo crea, cambia o borra algo, queda aquí." title="Todavía no hay nada anotado" />
          )
        ) : (
          <>
            {/* Rejilla y no tabla: en el celular cada fila se apila —qué, sobre qué, quién y
                cuándo— en vez de partir el correo en tres líneas dentro de una columna. */}
            <div className="hidden grid-cols-[168px_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.3fr)] gap-3 border-b border-line-panel pb-3 font-mono text-[10.5px] font-medium tracking-[0.16em] text-ink-mute uppercase min-[760px]:grid">
              <span>Cuándo</span>
              <span>Quién</span>
              <span>Qué</span>
              <span>Sobre</span>
            </div>
            <ul className="flex flex-col">
              {registro.value.map((fila) => (
                <li
                  className="grid gap-1 border-b border-line-panel py-3 min-[760px]:grid-cols-[168px_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.3fr)] min-[760px]:items-baseline min-[760px]:gap-3"
                  key={fila.id}
                >
                  <span className="order-3 font-mono text-[11px] whitespace-nowrap text-ink-mute min-[760px]:order-none">
                    {CUANDO.format(fila.createdAt)}
                  </span>
                  <span className="order-3 truncate text-[12px] text-ink-mute min-[760px]:order-none min-[760px]:text-[13px] min-[760px]:text-ink-soft">
                    {fila.actorEmail}
                  </span>
                  <span className="order-1 text-[14px] text-ink min-[760px]:order-none min-[760px]:text-[13px]">{fraseDeAuditoria(fila.action)}</span>
                  <span className="order-2 text-[13px] break-words text-ink-soft min-[760px]:order-none">
                    {fila.subject ?? '—'}
                    {fila.detail === null ? null : <span className="text-ink-mute"> · {fila.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
            {hayMas ? <LoadMoreLink href={enlace(tope + PAGINA)} noun="registros" /> : null}
          </>
        )}
      </PanelCard>
    </>
  )
}
