'use client'

import Link from 'next/link'
import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { addGuestsFromAssistantAction } from '@/app/_acciones/guests/actions'
import type { InvitacionPropuesta } from '../domain/herramientas'
import type { Salida } from '../application/conversar'
import { NOMBRE_DEL_ASISTENTE } from '../domain/reglas'

type Propuesta = { invitaciones: readonly InvitacionPropuesta[]; estado: 'pendiente' | 'guardando' | 'guardada' | 'descartada'; resultado?: string }
type Burbuja = { rol: 'usuario' | 'asistente'; texto: string; propuesta?: Propuesta; error?: boolean }

const SUGERENCIAS = ['¿Qué me falta esta semana?', '¿Quién falta por responder?', 'Quiero registrar invitados', '¿Cómo mando las invitaciones?']

/** Lo que se ve mientras Luxury consulta: dice qué está mirando, no «pensando…». */
const CONSULTANDO: Record<string, string> = {
  resumen_del_evento: 'Mirando las cifras de tu evento…',
  buscar_invitados: 'Revisando tu lista de invitados…',
  tareas: 'Revisando tus tareas…',
  presupuesto: 'Revisando tu presupuesto…',
  proveedores: 'Revisando tus proveedores…',
  cronograma: 'Revisando el cronograma…',
  como_se_hace: 'Buscando cómo se hace…',
  proponer_invitados: 'Preparando la lista…',
}

/** Los enlaces del propio evento que Luxury escribe se vuelven enlaces de verdad; nada de fuera. */
function conEnlaces(texto: string, slug: string, alNavegar: () => void): ReactNode {
  const base = `/panel/eventos/${slug}`
  const partes = texto.split(/(\/panel\/eventos\/[a-z0-9-]+(?:\/[\w\-/?=&]*)?)/g)
  return partes.map((parte, i) => {
    const limpia = parte.replace(/[.,;:)]+$/, '')
    if (i % 2 === 1 && (limpia === base || limpia.startsWith(`${base}/`) || limpia.startsWith(`${base}?`))) {
      return (
        <Fragment key={i}>
          <Link className="font-medium text-ink underline underline-offset-4 hover:text-gold-deep" href={limpia} onClick={alNavegar}>
            {limpia.slice(base.length) || 'el resumen'}
          </Link>
          {parte.slice(limpia.length)}
        </Fragment>
      )
    }
    return <Fragment key={i}>{parte}</Fragment>
  })
}

/**
 * **Luxury**: el botón flotante del panel del evento y su conversación. La conversación vive aquí (no se
 * guarda en ningún sitio) y viaja entera a `/panel/eventos/<slug>/asistente` en cada mensaje; la
 * respuesta llega por trozos y se va escribiendo. Cuando propone invitados, pinta la tarjeta: nada se
 * guarda sin «Confirmar».
 */
export function Asistente({ slug }: { slug: string }) {
  const [burbujas, setBurbujas] = useState<Burbuja[]>([])
  const [texto, setTexto] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [consultando, setConsultando] = useState<string | null>(null)
  const dialogo = useRef<HTMLDialogElement>(null)
  const final = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLTextAreaElement>(null)
  const titulo = useId()

  // Con llaves: en Chrome reciente `scrollIntoView` devuelve una promesa, y un efecto que devuelve algo que
  // no es una función revienta React al limpiarlo («i is not a function»).
  useEffect(() => {
    final.current?.scrollIntoView({ block: 'end' })
  }, [burbujas, consultando])

  const abrir = () => {
    dialogo.current?.showModal()
    campo.current?.focus()
  }
  const cerrar = () => dialogo.current?.close()

  /** Cambia la última burbuja de Luxury (la que se está escribiendo). */
  const enLaUltima = (cambio: (b: Burbuja) => Burbuja) =>
    setBurbujas((todas) => {
      const copia = [...todas]
      const i = copia.length - 1
      if (i >= 0 && copia[i]!.rol === 'asistente') copia[i] = cambio(copia[i]!)
      return copia
    })

  async function enviar(pregunta: string) {
    const limpia = pregunta.trim()
    if (limpia === '' || ocupado) return
    const historial = [...burbujas.filter((b) => !b.error && b.texto !== ''), { rol: 'usuario' as const, texto: limpia }]
    setBurbujas([...burbujas, { rol: 'usuario', texto: limpia }, { rol: 'asistente', texto: '' }])
    setTexto('')
    setOcupado(true)
    try {
      const respuesta = await fetch(`/panel/eventos/${slug}/asistente`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mensajes: historial.map((b) => ({ rol: b.rol, texto: b.texto })) }),
      })
      if (!respuesta.ok || respuesta.body === null) {
        const aviso = respuesta.status === 429 ? 'Vas muy rápido: espera un momento y vuelve a escribirme.' : 'No pude responder ahora. Vuelve a intentarlo en un momento.'
        enLaUltima((b) => ({ ...b, texto: aviso, error: true }))
        return
      }
      const lector = respuesta.body.getReader()
      const decodificador = new TextDecoder()
      let pendiente = ''
      for (;;) {
        const { value, done } = await lector.read()
        if (done) break
        pendiente += decodificador.decode(value, { stream: true })
        let corte: number
        while ((corte = pendiente.indexOf('\n')) !== -1) {
          const linea = pendiente.slice(0, corte)
          pendiente = pendiente.slice(corte + 1)
          if (linea.trim() === '') continue
          const salida = JSON.parse(linea) as Salida
          if (salida.tipo === 'texto') {
            setConsultando(null)
            enLaUltima((b) => ({ ...b, texto: b.texto + salida.delta }))
          } else if (salida.tipo === 'consultando') setConsultando(CONSULTANDO[salida.herramienta] ?? 'Consultando…')
          else if (salida.tipo === 'propuesta') enLaUltima((b) => ({ ...b, propuesta: { invitaciones: salida.invitaciones, estado: 'pendiente' } }))
          else if (salida.tipo === 'error') enLaUltima((b) => ({ ...b, texto: b.texto === '' ? salida.mensaje : `${b.texto}\n\n${salida.mensaje}`, error: b.texto === '' }))
        }
      }
    } catch {
      enLaUltima((b) => ({ ...b, texto: 'Se cortó la conexión. Vuelve a intentarlo.', error: true }))
    } finally {
      setConsultando(null)
      setOcupado(false)
      campo.current?.focus()
    }
  }

  async function confirmar(indice: number, propuesta: Propuesta) {
    const marcar = (cambio: Partial<Propuesta>) =>
      setBurbujas((todas) => todas.map((b, i) => (i === indice && b.propuesta ? { ...b, propuesta: { ...b.propuesta, ...cambio } } : b)))
    marcar({ estado: 'guardando' })
    const hecho = await addGuestsFromAssistantAction({ eventSlug: slug, invitaciones: propuesta.invitaciones }).catch(() => ({ status: 'error' as const, message: 'No se pudo guardar. Vuelve a intentarlo.' }))
    if (hecho.status === 'success') {
      const resultado = `Listo: ${hecho.creadas === 1 ? '1 invitación' : `${hecho.creadas} invitaciones`} (${hecho.personas === 1 ? '1 persona' : `${hecho.personas} personas`}) en tu lista.`
      marcar({ estado: 'guardada', resultado: 'Guardada en tu lista.' })
      // Que Luxury lo sepa en el siguiente mensaje: la conversación es lo único que recuerda.
      setBurbujas((todas) => [...todas, { rol: 'asistente', texto: `${resultado} Ya puedes mandarles su invitación desde /panel/eventos/${slug}/invitados?panel=envio` }])
    } else marcar({ estado: 'pendiente', resultado: hecho.message })
  }

  const corregir = (indice: number) => {
    setBurbujas((todas) => todas.map((b, i) => (i === indice && b.propuesta ? { ...b, propuesta: { ...b.propuesta, estado: 'descartada' } } : b)))
    setTexto('Corrige: ')
    campo.current?.focus()
  }

  return (
    <>
      <button
        aria-label={`Abrir a ${NOMBRE_DEL_ASISTENTE}, tu asistente`}
        className="fixed right-5 bottom-5 z-30 inline-flex h-13 cursor-pointer items-center gap-2 rounded-full bg-ink pr-5 pl-4 text-[13.5px] font-medium text-white shadow-float ring-1 ring-gold/40 transition-transform hover:-translate-y-0.5 print:hidden"
        onClick={abrir}
        type="button"
      >
        <Chispa className="size-5 text-gold" />
        {NOMBRE_DEL_ASISTENTE}
      </button>

      <dialog
        aria-labelledby={titulo}
        className="panel-lateral fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-none border-l border-line-panel bg-bg-raised p-0 text-ink shadow-float backdrop:bg-ink/35 min-[640px]:w-[min(460px,100vw)]"
        onClick={(e) => {
          if (e.target === dialogo.current) cerrar()
        }}
        ref={dialogo}
      >
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line-panel px-6 py-5">
            <div className="flex items-center gap-3">
              <span aria-hidden className="grid size-10 place-items-center rounded-full bg-ink text-gold">
                <Chispa className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-[26px] leading-tight font-light" id={titulo}>
                  {NOMBRE_DEL_ASISTENTE}
                </h2>
                <p className="text-[12px] text-ink-mute">Tu planner. Responde con los datos de este evento.</p>
              </div>
            </div>
            <button
              aria-label="Cerrar"
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line-panel bg-white text-[13px] transition-colors hover:border-ink"
              onClick={cerrar}
              type="button"
            >
              <span aria-hidden>✕</span>
            </button>
          </header>

          <div aria-busy={ocupado} aria-live="polite" className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-5">
            {burbujas.length === 0 ? (
              <div className="flex flex-col gap-4">
                <p className="text-[14px] leading-relaxed text-ink-soft">
                  Hola, soy {NOMBRE_DEL_ASISTENTE}. Pregúntame por tus invitados, tus tareas o tu presupuesto, o dime a quién quieres invitar y lo dejo listo para
                  que lo confirmes.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGERENCIAS.map((s) => (
                    <button
                      className="cursor-pointer rounded-full border border-line-panel-strong bg-white px-3.5 py-2 text-[12.5px] text-ink-soft transition-colors hover:border-ink hover:text-ink"
                      key={s}
                      onClick={() => void enviar(s)}
                      type="button"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              burbujas.map((b, i) =>
                b.rol === 'usuario' ? (
                  <p className="max-w-[85%] self-end rounded-[16px] rounded-br-[4px] bg-ink px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap text-white" key={i}>
                    {b.texto}
                  </p>
                ) : (
                  <div className="flex max-w-[92%] flex-col gap-2 self-start" key={i}>
                    {b.texto === '' ? null : (
                      <p className={`rounded-[16px] rounded-bl-[4px] border px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap ${b.error ? 'border-danger/30 bg-danger/5 text-danger' : 'border-line-panel bg-white text-ink'}`}>
                        {conEnlaces(b.texto, slug, cerrar)}
                      </p>
                    )}
                    {b.propuesta === undefined ? null : <TarjetaDePropuesta alConfirmar={() => void confirmar(i, b.propuesta!)} alCorregir={() => corregir(i)} propuesta={b.propuesta} />}
                  </div>
                ),
              )
            )}
            {ocupado && (consultando !== null || burbujas.at(-1)?.texto === '') ? (
              <p className="flex items-center gap-2 self-start text-[12.5px] text-ink-mute" role="status">
                <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-gold" />
                {consultando ?? 'Escribiendo…'}
              </p>
            ) : null}
            <div ref={final} />
          </div>

          <form
            className="flex flex-col gap-2 border-t border-line-panel px-5 py-4"
            onSubmit={(e) => {
              e.preventDefault()
              void enviar(texto)
            }}
          >
            <div className="flex items-end gap-2">
              <label className="sr-only" htmlFor={`${titulo}-campo`}>
                Escríbele a {NOMBRE_DEL_ASISTENTE}
              </label>
              <textarea
                className="max-h-36 min-h-11 flex-1 resize-none rounded-[14px] border border-line-panel-strong bg-white px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink outline-none focus:border-ink"
                id={`${titulo}-campo`}
                maxLength={2000}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void enviar(texto)
                  }
                }}
                placeholder={`Escríbele a ${NOMBRE_DEL_ASISTENTE}…`}
                ref={campo}
                rows={1}
                value={texto}
              />
              <button
                className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-ink text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                disabled={ocupado || texto.trim() === ''}
                type="submit"
              >
                <span className="sr-only">Enviar</span>
                <svg aria-hidden className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
            <p className="text-[11px] text-ink-mute">{NOMBRE_DEL_ASISTENTE} puede equivocarse. Nada se guarda sin que lo confirmes.</p>
          </form>
        </div>
      </dialog>
    </>
  )
}

function TarjetaDePropuesta({ propuesta, alConfirmar, alCorregir }: { propuesta: Propuesta; alConfirmar: () => void; alCorregir: () => void }) {
  const personas = propuesta.invitaciones.reduce((s, i) => s + i.personas.length, 0)
  const n = propuesta.invitaciones.length
  return (
    <section aria-label="Invitados para confirmar" className="rounded-[16px] border border-gold/40 bg-bg-top px-4 py-3.5">
      <p className="font-mono text-[10.5px] tracking-[0.14em] text-gold-deep uppercase">
        {n === 1 ? '1 invitación' : `${n} invitaciones`} · {personas === 1 ? '1 persona' : `${personas} personas`}
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {propuesta.invitaciones.map((inv, i) => (
          <li className="text-[13px] leading-snug text-ink" key={i}>
            <span className="font-medium">{inv.personas[0]}</span>
            {inv.personas.length > 1 ? <span className="text-ink-soft"> y {inv.personas.slice(1).join(', ')}</span> : null}
            {inv.telefono === null ? null : <span className="block text-[12px] text-ink-mute">WhatsApp {inv.telefono}</span>}
          </li>
        ))}
      </ul>
      {propuesta.estado === 'guardada' ? (
        <p className="mt-3 text-[12.5px] text-sage-deep" role="status">
          {propuesta.resultado}
        </p>
      ) : propuesta.estado === 'descartada' ? (
        <p className="mt-3 text-[12.5px] text-ink-mute">Descartada. Dime cómo corregirla.</p>
      ) : (
        <>
          {propuesta.resultado === undefined ? null : (
            <p className="mt-3 text-[12.5px] text-danger" role="alert">
              {propuesta.resultado}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              aria-busy={propuesta.estado === 'guardando'}
              className="cursor-pointer rounded-full bg-ink px-4 py-2 text-[12.5px] font-medium text-white disabled:opacity-50"
              disabled={propuesta.estado === 'guardando'}
              onClick={alConfirmar}
              type="button"
            >
              {propuesta.estado === 'guardando' ? 'Guardando…' : 'Confirmar'}
            </button>
            <button className="cursor-pointer rounded-full border border-line-panel-strong bg-white px-4 py-2 text-[12.5px] text-ink" disabled={propuesta.estado === 'guardando'} onClick={alCorregir} type="button">
              Corregir
            </button>
          </div>
        </>
      )}
    </section>
  )
}

function Chispa({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z" />
    </svg>
  )
}
