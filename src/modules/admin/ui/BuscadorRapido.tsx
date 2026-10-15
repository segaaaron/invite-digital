'use client'

import Link from 'next/link'
import { ABRIR_BUSCADOR } from '@/shared/design/ui/panel/avisos-del-panel'
import { useEffect, useRef, useState, useTransition } from 'react'
import { buscarAction } from '@/app/_acciones/admin/buscar-actions'
import { CalendarIcon, PlusIcon, ReceiptIcon, SearchIcon, UsersIcon } from '@/shared/design/ui/icons'
import type { ResultadosDeBusqueda } from '../domain/busqueda'
import { diaCorto } from '@/shared/format/fecha'
import { CREAR } from './MenuCrear'
import { traducir } from '@/shared/i18n/en-ingles'
import type { T } from '@/shared/i18n/t'
import { useIdioma, useT } from '@/shared/i18n/idioma-navegador'

const estadoDePedido = (t: T): Record<string, string> => ({
  pending_payment: t('Esperando pago', 'Awaiting payment'),
  proof_submitted: t('Por revisar', 'To review'),
  approved: t('Aprobado', 'Approved'),
  rejected: t('Rechazado', 'Rejected'),
  cancelled: t('Cancelado', 'Cancelled'),
})

/**
 * **Acciones de ⌘K**: crear o ir a cualquier sección escribiendo, sin tocar el ratón. Se filtran
 * mientras se escribe **en el navegador** —son una lista fija—; buscar datos sigue siendo con Enter.
 * Las palabras van en los dos idiomas: se encuentra igual escribiendo «crear» o «create».
 */
const acciones = (t: T): readonly { titulo: string; detalle: string; href: string; palabras: string }[] => [
  ...CREAR.map((c) => {
    const titulo = traducir(c.titulo, t)
    return { titulo: t(`Crear ${titulo.toLowerCase()}`, `Create ${titulo.toLowerCase()}`), detalle: traducir(c.detalle, t), href: c.href, palabras: `crear nuevo nueva alta create new add ${c.titulo} ${titulo}` }
  }),
  { titulo: t('Ir a Hoy', 'Go to Today'), detalle: t('Lo que espera por ti', 'What is waiting for you'), href: '/panel/admin', palabras: 'hoy inicio pendiente today home pending' },
  { titulo: t('Ir a Ventas', 'Go to Sales'), detalle: t('El embudo, de la consulta al evento', 'The funnel, from inquiry to event'), href: '/panel/admin/ventas', palabras: 'ventas embudo consultas pedidos tablero sales funnel inquiries orders board' },
  { titulo: t('Ir a Ingresos', 'Go to Revenue'), detalle: t('Lo cobrado y lo que falta cobrar', 'What was collected and what is still due'), href: '/panel/admin/ingresos', palabras: 'ingresos cobros dinero csv revenue payments money' },
  { titulo: t('Ir a Eventos', 'Go to Events'), detalle: t('La cartera con su salud', 'The portfolio and its health'), href: '/panel/admin/eventos', palabras: 'eventos cartera bodas xv riesgo events portfolio weddings risk' },
  { titulo: t('Ir al Calendario', 'Go to Calendar'), detalle: t('Qué fin de semana queda libre', 'Which weekend is still free'), href: '/panel/admin/eventos/calendario', palabras: 'calendario agenda sabado fin de semana calendar saturday weekend' },
  { titulo: t('Ir a Clientes', 'Go to Clients'), detalle: t('La persona entera', 'The whole person'), href: '/panel/admin/clientes', palabras: 'clientes personas clients people' },
  { titulo: t('Ir al Catálogo', 'Go to Catalog'), detalle: t('Modelos, planes y extras', 'Designs, plans and extras'), href: '/panel/admin/modelos', palabras: 'escaparate modelos disenos planes extras catalogo catalog designs plans' },
  { titulo: t('Ir a Ajustes', 'Go to Settings'), detalle: t('Fallos, equipo, cobros, la web y auditoría', 'Errors, team, payments, the website and audit'), href: '/panel/admin/fallos', palabras: 'ajustes equipo usuarios cobros mensajes agenda auditoria web fallos settings team users payments messages audit errors' },
]
const plano = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/**
 * ⌘K (Ctrl+K) desde cualquier pantalla del admin: una capa encima, no una página. Busca al pulsar
 * Enter —sin temporizador que llame al servidor mientras se escribe— y cada resultado lleva a su
 * sitio. `<dialog>` nativo: atrapa el foco, cierra con Escape y deja el fondo inerte.
 */
export function BuscadorRapido() {
  const t = useT()
  const locale = useIdioma()
  const dialogo = useRef<HTMLDialogElement>(null)
  const campo = useRef<HTMLInputElement>(null)
  const [resultados, setResultados] = useState<ResultadosDeBusqueda | null>(null)
  const [buscado, setBuscado] = useState('')
  const [buscando, empezar] = useTransition()
  const [escrito, setEscrito] = useState('')
  const lasAcciones = acciones(t).filter((a) => escrito.trim() === '' || plano(`${a.titulo} ${a.palabras}`).includes(plano(escrito.trim())))

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
        aria-label={t('Buscar', 'Search')}
        className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-ink transition-colors hover:text-shell-deep min-[768px]:hidden"
        onClick={abrir}
        type="button"
      >
        <SearchIcon className="size-5" />
      </button>

      <dialog
        aria-label={t('Buscar en el panel', 'Search the panel')}
        className="mx-auto mt-[10vh] w-[min(560px,94vw)] max-w-none overflow-hidden rounded-[18px] border border-line-panel bg-bg-raised p-0 text-ink shadow-float backdrop:bg-shell-deep/50 max-[767px]:fixed max-[767px]:inset-0 max-[767px]:m-0 max-[767px]:h-dvh max-[767px]:max-h-dvh max-[767px]:w-full max-[767px]:overflow-y-auto max-[767px]:rounded-none max-[767px]:border-0 max-[767px]:bg-bg"
        onClick={(e) => {
          if (e.target === dialogo.current) cerrar()
        }}
        ref={dialogo}
      >
        <form
          // En el celular (M30): la barra de búsqueda arriba, en su isla, con «Cerrar».
          className="flex items-center gap-3 border-b border-line-panel px-5 py-4 max-[767px]:mx-4 max-[767px]:mt-2.5 max-[767px]:min-h-15 max-[767px]:rounded-[18px] max-[767px]:border max-[767px]:bg-bg-raised max-[767px]:py-2 max-[767px]:shadow-[0_8px_24px_-14px_rgb(12_36_32/0.28)]"
          onSubmit={(e) => {
            e.preventDefault()
            const texto = campo.current?.value.trim() ?? ''
            setBuscado(texto)
            empezar(async () => setResultados(await buscarAction(texto)))
          }}
        >
          <SearchIcon className="size-5 shrink-0 text-ink-mute" />
          <label className="sr-only" htmlFor="buscador-rapido">
            {t('Buscar', 'Search')}
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
            placeholder={t('Busca a alguien y pulsa Enter, o escribe «crear», «calendario»…', 'Search for someone and press Enter, or type “create”, “calendar”…')}
            ref={campo}
            type="search"
          />
          <button className="min-h-11 shrink-0 cursor-pointer px-1 text-[15px] font-medium text-gold-deep min-[768px]:hidden" onClick={cerrar} type="button">
            {t('Cerrar', 'Close')}
          </button>
          <kbd className="rounded-md border border-line-panel px-1.5 py-0.5 text-[11px] text-ink-mute max-[767px]:hidden">Esc</kbd>
        </form>

        <div aria-busy={buscando} aria-live="polite" className="max-h-[60vh] overflow-y-auto px-2 py-1">
          {buscando ? (
            <p className="px-3 py-6 text-center text-[13px] text-ink-mute">{t('Buscando…', 'Searching…')}</p>
          ) : resultados === null ? (
            lasAcciones.length === 0 ? (
              <p className="px-3 py-6 text-center text-[13px] text-ink-mute">{t(`Pulsa Enter para buscar «${escrito.trim()}».`, `Press Enter to search “${escrito.trim()}”.`)}</p>
            ) : (
              <Grupo icono="accion" titulo={t('Acciones', 'Actions')} filas={lasAcciones.map((a) => ({ clave: a.href, titulo: a.titulo, detalle: a.detalle, href: a.href }))} alElegir={alElegir} />
            )
          ) : total === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-ink-mute">{t(`Nada con «${buscado}».`, `Nothing for “${buscado}”.`)}</p>
          ) : (
            <>
              <Grupo icono="evento" titulo={t('Eventos', 'Events')} filas={resultados.eventos.map((e) => ({ clave: e.slug, titulo: e.title, detalle: diaCorto(e.eventDate, undefined, locale), href: `/panel/admin/eventos?evento=${e.slug}` }))} alElegir={alElegir} />
              <Grupo icono="venta" titulo={t('Pedidos', 'Orders')} filas={resultados.pedidos.map((p) => ({ clave: p.ref, titulo: p.customerName, detalle: `${p.ref} · ${estadoDePedido(t)[p.status] ?? p.status}`, href: `/panel/admin/ventas?venta=p-${p.ref}` }))} alElegir={alElegir} />
              <Grupo icono="persona" titulo={t('Consultas', 'Inquiries')} filas={resultados.consultas.map((c) => ({ clave: c.id, titulo: c.name, detalle: t('Consulta', 'Inquiry'), href: `/panel/admin/ventas?consulta=${c.id}` }))} alElegir={alElegir} />
              <Grupo icono="persona" titulo={t('Cuentas', 'Accounts')} filas={resultados.usuarios.map((u) => ({ clave: u.email, titulo: u.email, detalle: u.role, // Clientes solo junta cuentas de cliente; el resto del equipo vive en Ajustes › Equipo.
                href: u.role === 'cliente' ? `/panel/admin/clientes?q=${encodeURIComponent(u.email)}` : '/panel/admin/usuarios' }))} alElegir={alElegir} />
            </>
          )}
        </div>
        <p className="flex gap-4 border-t border-line-panel px-5 py-2.5 text-[12.5px] text-ink-mute max-[767px]:hidden">
          <span>{t('Enter para buscar', 'Enter to search')}</span>
          <span>{t('Tab para moverte', 'Tab to move')}</span>
          <span>{t('Esc para cerrar', 'Esc to close')}</span>
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
