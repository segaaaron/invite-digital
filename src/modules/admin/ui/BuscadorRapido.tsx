'use client'

import Link from 'next/link'
import { ABRIR_BUSCADOR } from '@/shared/design/ui/panel/avisos-del-panel'
import { useEffect, useRef, useState, useTransition } from 'react'
import { buscarAction } from '@/app/_acciones/admin/buscar-actions'
import { CalendarIcon, PlusIcon, ReceiptIcon, SearchIcon, UsersIcon } from '@/shared/design/ui/icons'
import type { ResultadosDeBusqueda } from '../domain/busqueda'
import { diaCorto } from '@/shared/format/fecha'
import { CREAR } from './MenuCrear'

const ESTADO_DE_PEDIDO: Record<string, string> = {
  pending_payment: 'Esperando pago',
  proof_submitted: 'Por revisar',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
}

/**
 * **Acciones de ⌘K**: crear o ir a cualquier sección escribiendo, sin tocar el ratón. Se filtran
 * mientras se escribe **en el navegador** —son una lista fija—; buscar datos sigue siendo con Enter.
 */
const ACCIONES: readonly { titulo: string; detalle: string; href: string; palabras: string }[] = [
  ...CREAR.map((c) => ({ titulo: `Crear ${c.titulo.toLowerCase()}`, detalle: c.detalle, href: c.href, palabras: `crear nuevo nueva alta ${c.titulo}` })),
  { titulo: 'Ir a Hoy', detalle: 'Lo que espera por ti', href: '/panel/admin', palabras: 'hoy inicio pendiente' },
  { titulo: 'Ir a Ventas', detalle: 'El embudo, de la consulta al evento', href: '/panel/admin/ventas', palabras: 'ventas embudo consultas pedidos tablero' },
  { titulo: 'Ir a Ingresos', detalle: 'Lo cobrado y lo que falta cobrar', href: '/panel/admin/ingresos', palabras: 'ingresos cobros dinero csv' },
  { titulo: 'Ir a Eventos', detalle: 'La cartera con su salud', href: '/panel/admin/eventos', palabras: 'eventos cartera bodas xv riesgo' },
  { titulo: 'Ir al Calendario', detalle: 'Qué fin de semana queda libre', href: '/panel/admin/eventos/calendario', palabras: 'calendario agenda sabado fin de semana' },
  { titulo: 'Ir a Clientes', detalle: 'La persona entera', href: '/panel/admin/clientes', palabras: 'clientes personas' },
  { titulo: 'Ir al Catálogo', detalle: 'Modelos, planes y extras', href: '/panel/admin/modelos', palabras: 'escaparate modelos disenos planes extras catalogo' },
  { titulo: 'Ir a Ajustes', detalle: 'Fallos, equipo, cobros, la web y auditoría', href: '/panel/admin/fallos', palabras: 'ajustes equipo usuarios cobros mensajes agenda auditoria web fallos' },
]
const plano = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

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
  const [escrito, setEscrito] = useState('')
  const acciones = ACCIONES.filter((a) => escrito.trim() === '' || plano(`${a.titulo} ${a.palabras}`).includes(plano(escrito.trim())))

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
    // La barra lateral y el carril lo piden con su botón «Buscar».
    window.addEventListener(ABRIR_BUSCADOR, abrir)
    return () => {
      document.removeEventListener('keydown', alPulsar)
      window.removeEventListener(ABRIR_BUSCADOR, abrir)
    }
  }, [])

  const cerrar = () => dialogo.current?.close()
  // El buscador vive en la carcasa y sobrevive a la navegación: al ir a un resultado se vacía,
  // para no abrirlo la próxima vez con la búsqueda de antes.
  const alElegir = () => {
    cerrar()
    if (campo.current) campo.current.value = ''
    setResultados(null)
    setEscrito('')
  }
  const total = resultados === null ? 0 : resultados.eventos.length + resultados.pedidos.length + resultados.consultas.length + resultados.usuarios.length

  return (
    <>
      {/* El botón es de la isla del celular; en tablet y escritorio se busca desde la barra lateral o el carril. */}
      <button
        aria-label="Buscar"
        className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-ink transition-colors hover:text-shell-deep min-[768px]:hidden"
        onClick={abrir}
        type="button"
      >
        <SearchIcon className="size-5" />
      </button>

      <dialog
        aria-label="Buscar en el panel"
        className="mx-auto mt-[10vh] w-[min(560px,94vw)] max-w-none overflow-hidden rounded-[18px] border border-line-panel bg-bg-raised p-0 text-ink shadow-float backdrop:bg-shell-deep/50"
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
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-mute focus-visible:outline-none"
            id="buscador-rapido"
            // En un campo de búsqueda, Chrome gasta el primer Escape en borrar el texto: aquí cierra.
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                cerrar()
              }
            }}
            onChange={(e) => setEscrito(e.target.value)}
            placeholder="Busca a alguien y pulsa Enter, o escribe «crear», «calendario»…"
            ref={campo}
            type="search"
          />
          <kbd className="rounded-md border border-line-panel px-1.5 py-0.5 text-[11px] text-ink-mute">Esc</kbd>
        </form>

        <div aria-busy={buscando} aria-live="polite" className="max-h-[60vh] overflow-y-auto px-2 py-1">
          {buscando ? (
            <p className="px-3 py-6 text-center text-[13px] text-ink-mute">Buscando…</p>
          ) : resultados === null ? (
            acciones.length === 0 ? (
              <p className="px-3 py-6 text-center text-[13px] text-ink-mute">Pulsa Enter para buscar «{escrito.trim()}».</p>
            ) : (
              <Grupo icono="accion" titulo="Acciones" filas={acciones.map((a) => ({ clave: a.href, titulo: a.titulo, detalle: a.detalle, href: a.href }))} alElegir={alElegir} />
            )
          ) : total === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-ink-mute">Nada con «{buscado}».</p>
          ) : (
            <>
              <Grupo icono="evento" titulo="Eventos" filas={resultados.eventos.map((e) => ({ clave: e.slug, titulo: e.title, detalle: diaCorto(e.eventDate), href: `/panel/admin/eventos?evento=${e.slug}` }))} alElegir={alElegir} />
              <Grupo icono="venta" titulo="Pedidos" filas={resultados.pedidos.map((p) => ({ clave: p.ref, titulo: p.customerName, detalle: `${p.ref} · ${ESTADO_DE_PEDIDO[p.status] ?? p.status}`, href: `/panel/admin/ventas?venta=p-${p.ref}` }))} alElegir={alElegir} />
              <Grupo icono="persona" titulo="Consultas" filas={resultados.consultas.map((c) => ({ clave: c.id, titulo: c.name, detalle: 'Consulta', href: `/panel/admin/ventas?consulta=${c.id}` }))} alElegir={alElegir} />
              <Grupo icono="persona" titulo="Cuentas" filas={resultados.usuarios.map((u) => ({ clave: u.email, titulo: u.email, detalle: u.role, // Clientes solo junta cuentas de cliente; el resto del equipo vive en Ajustes › Equipo.
                href: u.role === 'cliente' ? `/panel/admin/clientes?q=${encodeURIComponent(u.email)}` : '/panel/admin/usuarios' }))} alElegir={alElegir} />
            </>
          )}
        </div>
        <p className="flex gap-4 border-t border-line-panel px-5 py-2.5 text-[12.5px] text-ink-mute">
          <span>Enter para buscar</span>
          <span>Tab para moverte</span>
          <span>Esc para cerrar</span>
        </p>
      </dialog>
    </>
  )
}

const ICONO_DE_GRUPO = { accion: PlusIcon, evento: CalendarIcon, venta: ReceiptIcon, persona: UsersIcon } as const

/** Un grupo de resultados (E18): cada fila con su icono, el nombre y debajo qué es. */
function Grupo({ titulo, filas, alElegir, icono }: { titulo: string; filas: readonly { clave: string; titulo: string; detalle: string; href: string }[]; alElegir: () => void; icono: keyof typeof ICONO_DE_GRUPO }) {
  if (filas.length === 0) return null
  const Icono = ICONO_DE_GRUPO[icono]
  return (
    <section className="py-1">
      <h3 className="px-3 pt-2 pb-1 text-[13px] text-ink-mute">{titulo}</h3>
      <ul>
        {filas.map((f) => (
          <li key={f.clave}>
            <Link className="group flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-ink no-underline transition-colors hover:bg-pill-pending focus-visible:bg-pill-pending focus-visible:outline-none" href={f.href} onClick={alElegir}>
              <Icono aria-hidden className="size-4 shrink-0 text-ink-mute" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14.5px] font-medium">{f.titulo}</span>
                <span className="truncate text-[13px] text-ink-mute">{f.detalle}</span>
              </span>
              <span aria-hidden className="text-[12.5px] font-medium text-gold-deep opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                Enter
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
