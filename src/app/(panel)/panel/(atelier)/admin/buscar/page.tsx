import Link from 'next/link'
import type { ReactNode } from 'react'
import { admin } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { MINIMO_DE_BUSQUEDA } from '@/modules/admin/domain/busqueda'
import { ETIQUETA_ESTADO, parseEstado } from '@/modules/leads/domain/pipeline'
import { ROTULO_DE_ROL } from '@/modules/shell/ui/nav'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { FIELD_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { SearchIcon } from '@/shared/design/ui/icons'

export const metadata = { title: 'Buscar · Administración' }
export const dynamic = 'force-dynamic'

const FECHA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const ESTADO_DE_PEDIDO: Record<string, string> = {
  pending_payment: 'Esperando pago',
  proof_submitted: 'Por revisar',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

/**
 * Buscar en todo lo del admin: un cliente llama y dice su nombre, y no se sabe si es una
 * consulta, un pedido o ya un evento. Se llega con ⌘K / Ctrl+K desde cualquier pantalla del
 * admin. Un formulario `GET`: la búsqueda vive en la dirección y funciona sin JavaScript.
 */
export default async function AdminBuscarPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin()
  const q = ((await searchParams).q ?? '').trim()
  const r = q.length >= MINIMO_DE_BUSQUEDA ? await admin.buscar(q) : null
  const total = r === null ? 0 : r.eventos.length + r.pedidos.length + r.consultas.length + r.usuarios.length

  return (
    <>
      <PanelHeader kicker="Administración" meta="Eventos, pedidos, consultas y cuentas, en un solo sitio" title="Buscar" />

      <form action="/panel/admin/buscar" className="mb-4.5 flex gap-2" method="get" role="search">
        <label className="sr-only" htmlFor="buscar-q">
          Buscar
        </label>
        <span className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-mute" />
          <input
            autoComplete="off"
            // Se llega aquí para escribir: el cursor ya está dentro.
            autoFocus
            className={`${FIELD_CLASS} pl-11`}
            defaultValue={q}
            id="buscar-q"
            name="q"
            placeholder="Nombre, correo, teléfono, referencia o evento"
            type="search"
          />
        </span>
        <PanelButton type="submit" variant="primary">
          Buscar
        </PanelButton>
      </form>

      {r === null ? (
        <PanelCard>
          <EmptyState
            compact
            description={q === '' ? 'Escribe al menos dos letras. Desde cualquier pantalla del admin, ⌘K (o Ctrl+K) te trae aquí.' : 'Escribe al menos dos letras.'}
            icon={<SearchIcon />}
            title="¿Qué buscas?"
          />
        </PanelCard>
      ) : total === 0 ? (
        <PanelCard>
          <EmptyState compact description="Prueba con otra parte del nombre, el correo o la referencia del pedido." title={`Nada con «${q}»`} />
        </PanelCard>
      ) : (
        <div className="grid items-start gap-4.5 min-[900px]:grid-cols-2">
          <Grupo titulo="Eventos" vacio={r.eventos.length === 0}>
            {r.eventos.map((e) => (
              <Fila detalle={FECHA.format(new Date(`${e.eventDate}T00:00:00Z`))} href={`/panel/eventos/${e.slug}/configuracion`} key={e.slug} titulo={e.title} />
            ))}
          </Grupo>
          <Grupo titulo="Pedidos" vacio={r.pedidos.length === 0}>
            {r.pedidos.map((p) => (
              <Fila
                detalle={`${p.ref} · ${ESTADO_DE_PEDIDO[p.status] ?? p.status}`}
                href={`/panel/pedidos?estado=${p.status}#pedido-${p.ref}`}
                key={p.ref}
                titulo={p.customerName}
              />
            ))}
          </Grupo>
          <Grupo titulo="Consultas" vacio={r.consultas.length === 0}>
            {r.consultas.map((c) => (
              <Fila detalle={ETIQUETA_ESTADO[parseEstado(c.status)]} href={`/panel/admin/consultas?estado=todas&id=${c.id}`} key={c.id} titulo={c.name} />
            ))}
          </Grupo>
          <Grupo titulo="Cuentas" vacio={r.usuarios.length === 0}>
            {r.usuarios.map((u) => (
              <Fila
                detalle={ROTULO_DE_ROL[u.role as keyof typeof ROTULO_DE_ROL] ?? u.role}
                href="/panel/admin/usuarios"
                key={u.email}
                titulo={u.email}
              />
            ))}
          </Grupo>
        </div>
      )}
    </>
  )
}

function Grupo({ titulo, vacio, children }: { titulo: string; vacio: boolean; children: ReactNode }) {
  return (
    <PanelCard title={titulo}>{vacio ? <p className="text-[13px] text-ink-mute">Nada aquí.</p> : <ul className="flex flex-col">{children}</ul>}</PanelCard>
  )
}

function Fila({ titulo, detalle, href }: { titulo: string; detalle: string; href: string }) {
  return (
    <li className="border-b border-line-panel last:border-none">
      <Link className="-mx-2 flex items-baseline justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-bg-sunken/50" href={href}>
        <span className="min-w-0 truncate text-[14px] text-ink">{titulo}</span>
        <span className="shrink-0 text-[12px] text-ink-mute">{detalle}</span>
      </Link>
    </li>
  )
}
