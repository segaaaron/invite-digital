'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { buscarAction } from '@/app/_acciones/admin/buscar-actions'
import { SearchIcon } from '@/shared/design/ui/icons'
import type { ResultadosDeBusqueda } from '../domain/busqueda'

const ESTADO_DE_PEDIDO: Record<string, string> = {
  pending_payment: 'Esperando pago',
  proof_submitted: 'Por revisar',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

/**
 * ⌘K (Ctrl+K) desde cualquier pantalla del admin: una capa encima, no una página. Busca al pulsar
 * Enter —sin temporizador que llame al servidor mientras se escribe— y cada resultado lleva a su
 * sitio. `<dialog>` nativo: atrapa el foco, cierra con Escape y deja el fondo inerte.
 */
export function BuscadorRapido() {
  const dialogo = useRef<HTMLDialogElement>(null)
  const campo = useRef<HTMLInputElement>(null)
  const [resultados, setResultados] = useState<ResultadosDeBusqueda | null>(null)
  const [buscado, setBuscado] = useState('')
  const [buscando, empezar] = useTransition()

  const abrir = () => {
    dialogo.current?.showModal()
    campo.current?.select()
  }

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        abrir()
      }
    }
    document.addEventListener('keydown', alPulsar)
    return () => document.removeEventListener('keydown', alPulsar)
  }, [])

  const cerrar = () => dialogo.current?.close()
  // El buscador vive en la carcasa y sobrevive a la navegación: al ir a un resultado se vacía,
  // para no abrirlo la próxima vez con la búsqueda de antes.
  const alElegir = () => {
    cerrar()
    if (campo.current) campo.current.value = ''
    setResultados(null)
  }
  const total = resultados === null ? 0 : resultados.eventos.length + resultados.pedidos.length + resultados.consultas.length + resultados.usuarios.length

  return (
    <>
      <button
        className="inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-line-panel-strong bg-white/80 px-3.5 py-2 text-[13px] text-ink-soft transition-colors hover:border-ink hover:text-ink"
        onClick={abrir}
        type="button"
      >
        <SearchIcon className="size-4" />
        <span>Buscar</span>
        <kbd className="hidden rounded-md border border-line-panel px-1.5 py-0.5 font-sans text-[11px] text-ink-mute min-[560px]:inline">⌘K</kbd>
      </button>

      <dialog
        aria-label="Buscar en el panel"
        className="mx-auto mt-[12vh] w-[min(640px,94vw)] rounded-[20px] border border-line-panel bg-bg-raised p-0 text-ink shadow-float backdrop:bg-ink/40"
        onClick={(e) => {
          if (e.target === dialogo.current) cerrar()
        }}
        ref={dialogo}
      >
        <form
          className="flex items-center gap-3 border-b border-line-panel px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault()
            const texto = campo.current?.value.trim() ?? ''
            setBuscado(texto)
            empezar(async () => setResultados(await buscarAction(texto)))
          }}
        >
          <SearchIcon className="size-5 shrink-0 text-ink-mute" />
          <label className="sr-only" htmlFor="buscador-rapido">
            Buscar
          </label>
          <input
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-mute"
            id="buscador-rapido"
            // En un campo de búsqueda, Chrome gasta el primer Escape en borrar el texto: aquí cierra.
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                cerrar()
              }
            }}
            placeholder="Nombre, correo, teléfono, referencia o evento · Enter"
            ref={campo}
            type="search"
          />
          <kbd className="rounded-md border border-line-panel px-1.5 py-0.5 text-[11px] text-ink-mute">Esc</kbd>
        </form>

        <div aria-busy={buscando} aria-live="polite" className="max-h-[60vh] overflow-y-auto px-2 py-2">
          {buscando ? (
            <p className="px-3 py-6 text-center text-[13px] text-ink-mute">Buscando…</p>
          ) : resultados === null ? (
            <p className="px-3 py-6 text-center text-[13px] text-ink-mute">Escribe y pulsa Enter.</p>
          ) : total === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-ink-mute">Nada con «{buscado}».</p>
          ) : (
            <>
              <Grupo titulo="Eventos" filas={resultados.eventos.map((e) => ({ clave: e.slug, titulo: e.title, detalle: e.eventDate, href: `/panel/admin/eventos?evento=${e.slug}` }))} alElegir={alElegir} />
              <Grupo titulo="Pedidos" filas={resultados.pedidos.map((p) => ({ clave: p.ref, titulo: p.customerName, detalle: `${p.ref} · ${ESTADO_DE_PEDIDO[p.status] ?? p.status}`, href: `/panel/admin/ventas?pedido=${p.ref}` }))} alElegir={alElegir} />
              <Grupo titulo="Consultas" filas={resultados.consultas.map((c) => ({ clave: c.id, titulo: c.name, detalle: 'Consulta', href: `/panel/admin/ventas?consulta=${c.id}` }))} alElegir={alElegir} />
              <Grupo titulo="Cuentas" filas={resultados.usuarios.map((u) => ({ clave: u.email, titulo: u.email, detalle: u.role, // Clientes solo junta cuentas de cliente; el resto del equipo vive en Ajustes › Equipo.
                href: u.role === 'cliente' ? `/panel/admin/clientes?q=${encodeURIComponent(u.email)}` : '/panel/admin/usuarios' }))} alElegir={alElegir} />
            </>
          )}
        </div>
      </dialog>
    </>
  )
}

function Grupo({ titulo, filas, alElegir }: { titulo: string; filas: readonly { clave: string; titulo: string; detalle: string; href: string }[]; alElegir: () => void }) {
  if (filas.length === 0) return null
  return (
    <section className="py-1">
      <h3 className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-[0.1em] text-ink-mute uppercase">{titulo}</h3>
      <ul>
        {filas.map((f) => (
          <li key={f.clave}>
            <Link className="flex items-baseline justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-bg-sunken/60 focus-visible:bg-bg-sunken/60" href={f.href} onClick={alElegir}>
              <span className="min-w-0 truncate text-[14px] text-ink">{f.titulo}</span>
              <span className="shrink-0 text-[12px] text-ink-mute">{f.detalle}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
