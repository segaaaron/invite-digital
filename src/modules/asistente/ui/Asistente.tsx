'use client'

import Link from 'next/link'
import { Fragment, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { uploadMediaAction } from '@/app/_acciones/events/actions'
import { ensureInvitationLinkAction, sendInvitationAction } from '@/app/_acciones/guests/actions'
import { uploadDocumentAction } from '@/app/_acciones/planner/dia-actions'
import { reducirFoto } from '@/shared/design/ui/reducir-foto'
import { markReminderSentAction } from '@/app/_acciones/reminders/actions'
import { conCanal, whatsappLink } from '@/modules/guests'
import type { FilaDeEnvio, Propuesta as Contenido } from '../domain/herramientas'
import type { Salida } from '../application/conversar'
import { NOMBRE_DEL_ASISTENTE } from '../domain/reglas'
import { elegirVoz, idiomaDelTexto } from './voz'

/** `muestra`: lo que se ve en la burbuja cuando el texto para Luxury lleva datos de más (el id de un adjunto). */
type Burbuja = { rol: 'usuario' | 'asistente'; texto: string; muestra?: string; envio?: Contenido; error?: boolean }

const ERRORES_DE_SUBIDA: Record<string, string> = {
  too_large: 'Pesa demasiado: fotos hasta 8 MB, canciones hasta 30 MB.',
  unsupported_type: 'Ese archivo no vale: fotos en JPG, PNG, WEBP o AVIF; canciones en MP3, M4A o WAV; documentos en PDF o imagen.',
  photo_limit: 'Ya subiste todas las fotos que incluye tu plan. Quita una para subir otra.',
  storage_failure: 'No se pudo guardar el archivo. Vuelve a intentarlo.',
}
const TIPOS_DE_DOCUMENTO = [
  ['contrato', 'Contrato'],
  ['cotizacion', 'Cotización'],
  ['factura', 'Factura'],
] as const

const SUGERENCIAS = ['¿Qué me falta esta semana?', '¿Quién falta por responder?', 'Quiero registrar invitados', '¿Cómo mando las invitaciones?']

/** Lo que se ve mientras Luxury consulta: dice qué está mirando, no «pensando…». */
const CONSULTANDO: Record<string, string> = {
  resumen_del_evento: 'Mirando las cifras de tu evento…',
  buscar_invitados: 'Revisando tu lista de invitados…',
  tareas: 'Revisando tus tareas…',
  presupuesto: 'Revisando tu presupuesto…',
  proveedores: 'Revisando tus proveedores…',
  cronograma: 'Revisando el cronograma…',
  agenda: 'Revisando tu agenda…',
  mi_invitacion: 'Leyendo tu invitación…',
  mesas: 'Revisando tus mesas…',
  regalos: 'Revisando tu mesa de regalos…',
  mensajes: 'Leyendo tu libro de firmas…',
  como_se_hace: 'Buscando cómo se hace…',
  preparar_envio: 'Preparando el envío…',
  preparar_recordatorios: 'Viendo a quién recordar…',
  registrar_invitados: 'Registrando invitados…',
  cambiar_invitados: 'Cambiando tus invitados…',
  escribir_invitacion: 'Escribiendo tu invitación…',
  renombrar_evento: 'Cambiando el nombre del evento…',
  gestionar_tareas: 'Actualizando tus tareas…',
  gestionar_presupuesto: 'Actualizando tu presupuesto…',
  gestionar_cronograma: 'Actualizando el cronograma…',
  gestionar_agenda: 'Actualizando tu agenda…',
  gestionar_proveedores: 'Actualizando tus proveedores…',
  gestionar_mesas: 'Actualizando tus mesas…',
  gestionar_regalos: 'Actualizando tu mesa de regalos…',
  agradecer_mensajes: 'Escribiendo los agradecimientos…',
  registrar_ingreso: 'Registrando el ingreso…',
  documentos: 'Revisando tus documentos…',
  borrar_documento: 'Borrando el documento…',
  qr_de_transferencia: 'Guardando el QR de tu banco…',
  poner_foto: 'Poniendo la foto…',
  opciones_de_invitacion: 'Guardando las opciones…',
  estilo_de_invitacion: 'Cambiando colores y letra…',
  cortejo: 'Revisando el cortejo…',
  gestionar_cortejo: 'Actualizando el cortejo…',
  recepcion: 'Revisando la recepción…',
  gestionar_recepcion: 'Actualizando la recepción…',
  sumar_planner: 'Dando acceso a tu planner…',
  deshacer_ingreso: 'Deshaciendo el ingreso…',
  extras: 'Revisando los extras…',
  pedir_extra: 'Pidiendo el extra…',
  puerta: 'Mirando el ingreso…',
  encargo: 'Revisando tu diseño…',
  gestionar_encargo: 'Hablando con el atelier…',
  gestionar_ensayos: 'Agendando el ensayo…',
  quitar_planner: 'Quitando el acceso…',
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
 * respuesta llega por trozos y se va escribiendo. **Hace lo que se le pide** con las mismas acciones de
 * las pantallas (7 de octubre); al terminar algo, el panel de detrás se vuelve a pintar. Solo el envío por
 * WhatsApp lleva tarjeta: cada mensaje necesita el toque de la persona.
 */
export function Asistente({ eventId, slug }: { eventId: string; slug: string }) {
  const [burbujas, setBurbujas] = useState<Burbuja[]>([])
  const [texto, setTexto] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [consultando, setConsultando] = useState<string | null>(null)
  const dialogo = useRef<HTMLDialogElement>(null)
  const final = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLTextAreaElement>(null)
  const titulo = useId()
  const router = useRouter()
  /** La petición en curso, para «Detener» y para cortarla si se queda sin responder. */
  const peticion = useRef<AbortController | null>(null)
  const lectura = useLectura()
  const selectorDeArchivo = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState<string | null>(null)
  const [avisoDeSubida, setAvisoDeSubida] = useState<string | null>(null)
  /** Un PDF espera a que se diga qué es (contrato, cotización, factura) antes de subirse a Documentos. */
  const [documento, setDocumento] = useState<File | null>(null)
  // Hablarle es una conversación: lo dicho se ve en el campo mientras se habla y, al callarse, se envía
  // solo (7 de octubre: había que hablar, parar, revisar y tocar enviar, y era casi imposible de usar).
  const enviarAlTerminar = useRef<(dicho: string) => void>(() => {})
  const dictado = useDictado(
    (parcial) => setTexto(parcial),
    (dicho) => enviarAlTerminar.current(dicho),
  )

  // Con llaves: en Chrome reciente `scrollIntoView` devuelve una promesa, y un efecto que devuelve algo que
  // no es una función revienta React al limpiarlo («i is not a function»).
  useEffect(() => {
    final.current?.scrollIntoView({ block: 'end' })
  }, [burbujas, consultando])

  const abrir = () => {
    dialogo.current?.showModal()
    campo.current?.focus()
  }
  const cerrar = () => {
    dictado.cancelar()
    lectura.callar()
    dialogo.current?.close()
  }

  /** Cambia la última burbuja de Luxury (la que se está escribiendo). */
  const enLaUltima = (cambio: (b: Burbuja) => Burbuja) =>
    setBurbujas((todas) => {
      const copia = [...todas]
      const i = copia.length - 1
      if (i >= 0 && copia[i]!.rol === 'asistente') copia[i] = cambio(copia[i]!)
      return copia
    })

  async function enviar(pregunta: string, porVoz = false, muestra?: string) {
    const limpia = pregunta.trim()
    if (limpia === '' || ocupado) return
    // Escribir o enviar corta la escucha: el micrófono nunca deja sin poder mandar.
    if (dictado.estado === 'escuchando') dictado.cancelar()
    lectura.callar()
    const historial = [...burbujas.filter((b) => !b.error && b.texto !== ''), { rol: 'usuario' as const, texto: limpia }]
    setBurbujas([...burbujas, { rol: 'usuario', texto: limpia, ...(muestra === undefined ? {} : { muestra }) }, { rol: 'asistente', texto: '' }])
    setTexto('')
    setOcupado(true)
    const control = new AbortController()
    peticion.current = control
    // Si la respuesta deja de llegar, se corta y se dice: antes el panel quedaba «Escribiendo…» para siempre.
    // ponytail: temporizador sin red, solo vigila; se reinicia con cada trozo que llega.
    let vigia = setTimeout(() => control.abort('lento'), 45_000)
    const reiniciarVigia = () => {
      clearTimeout(vigia)
      vigia = setTimeout(() => control.abort('lento'), 45_000)
    }
    let respuestaEntera = ''
    let huboCambios = false
    try {
      const respuesta = await fetch(`/panel/eventos/${slug}/asistente`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // El idioma del aparato: Luxury responde en inglés si el celular o la computadora está en inglés.
        body: JSON.stringify({ mensajes: historial.map((b) => ({ rol: b.rol, texto: b.texto })), idioma: navigator.language, porVoz }),
        signal: control.signal,
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
        reiniciarVigia()
        pendiente += decodificador.decode(value, { stream: true })
        let corte: number
        while ((corte = pendiente.indexOf('\n')) !== -1) {
          const linea = pendiente.slice(0, corte)
          pendiente = pendiente.slice(corte + 1)
          if (linea.trim() === '') continue
          const salida = JSON.parse(linea) as Salida
          if (salida.tipo === 'texto') {
            setConsultando(null)
            respuestaEntera += salida.delta
            enLaUltima((b) => ({ ...b, texto: b.texto + salida.delta }))
          } else if (salida.tipo === 'consultando') setConsultando(CONSULTANDO[salida.herramienta] ?? 'Consultando…')
          else if (salida.tipo === 'propuesta') {
            const envio = salida.propuesta
            enLaUltima((b) => ({ ...b, envio }))
          } else if (salida.tipo === 'hecho') huboCambios = true
          else if (salida.tipo === 'error') enLaUltima((b) => ({ ...b, texto: b.texto === '' ? salida.mensaje : `${b.texto}\n\n${salida.mensaje}`, error: b.texto === '' }))
        }
      }
      // Si le hablaste, te contesta en voz alta.
      if (porVoz && respuestaEntera.trim() !== '') lectura.leer(respuestaEntera)
    } catch {
      const motivo = control.signal.reason
      const aviso = motivo === 'detenido' ? 'Detenido.' : motivo === 'lento' ? 'Tardé demasiado en responder. Vuelve a preguntarme.' : 'Se cortó la conexión. Vuelve a intentarlo.'
      enLaUltima((b) => ({ ...b, texto: b.texto === '' ? aviso : `${b.texto}\n\n${aviso}`, error: b.texto === '' }))
    } finally {
      // Lo que Luxury cambió se ve en el panel de detrás sin recargar.
      if (huboCambios) router.refresh()
      clearTimeout(vigia)
      peticion.current = null
      setConsultando(null)
      setOcupado(false)
      campo.current?.focus()
    }
  }

  /**
   * **Adjuntar en el chat** (7 de octubre): la foto se sube a las del evento y Luxury la pone donde se le
   * pida; la canción, al subirla, ya es la de la invitación; un PDF va a Documentos con su tipo. Se suben
   * con las mismas acciones del panel (sus topes y su plan), y Luxury recibe qué se adjuntó.
   */
  async function adjuntar(archivo: File) {
    setAvisoDeSubida(null)
    const pedido = texto.trim()
    if (archivo.type === 'application/pdf') {
      setDocumento(archivo)
      return
    }
    const esFoto = archivo.type.startsWith('image/')
    const esCancion = archivo.type.startsWith('audio/')
    if (!esFoto && !esCancion) return setAvisoDeSubida(ERRORES_DE_SUBIDA.unsupported_type!)
    setSubiendo(`Subiendo «${archivo.name}»…`)
    try {
      const fd = new FormData()
      fd.set('eventId', eventId)
      fd.set('eventSlug', slug)
      fd.set('file', esFoto ? await reducirFoto(archivo) : archivo)
      const r = await uploadMediaAction({ status: 'idle' }, fd)
      if (r.status !== 'success' || r.mediaId === undefined) return setAvisoDeSubida(r.status === 'error' ? (ERRORES_DE_SUBIDA[r.message] ?? ERRORES_DE_SUBIDA.storage_failure!) : ERRORES_DE_SUBIDA.storage_failure!)
      setTexto('')
      if (esFoto) {
        const pide = pedido === '' ? 'Pon esta foto en mi invitación donde mejor quede.' : pedido
        void enviar(`${pide}\n[Adjunto: foto «${archivo.name}», foto_id ${r.mediaId}]`, false, `${pide}\n📎 ${archivo.name}`)
      } else {
        const dice = pedido === '' ? 'Te mandé la canción de la invitación.' : pedido
        void enviar(`${dice}\n[Adjunto: canción «${archivo.name}»: ya se subió y ya es la canción que suena en la invitación]`, false, `${dice}\n📎 ${archivo.name}`)
      }
    } catch {
      setAvisoDeSubida('No se pudo subir: se cortó la conexión. Vuelve a intentarlo.')
    } finally {
      setSubiendo(null)
    }
  }

  async function subirDocumento(tipo: (typeof TIPOS_DE_DOCUMENTO)[number][0]) {
    const archivo = documento
    if (archivo === null) return
    setDocumento(null)
    setSubiendo(`Subiendo «${archivo.name}»…`)
    try {
      const fd = new FormData()
      fd.set('eventId', eventId)
      fd.set('eventSlug', slug)
      fd.set('kind', tipo)
      fd.set('file', archivo)
      const r = await uploadDocumentAction({ status: 'idle' }, fd)
      if (r.status === 'error') return setAvisoDeSubida(r.message)
      const nombre = TIPOS_DE_DOCUMENTO.find(([k]) => k === tipo)![1].toLowerCase()
      const dice = texto.trim() === '' ? `Te mandé un documento: ${nombre}.` : texto.trim()
      setTexto('')
      void enviar(`${dice}\n[Adjunto: «${archivo.name}» guardado en Documentos como ${nombre}]`, false, `${dice}\n📎 ${archivo.name}`)
    } catch {
      setAvisoDeSubida('No se pudo subir: se cortó la conexión. Vuelve a intentarlo.')
    } finally {
      setSubiendo(null)
    }
  }

  // Lo dicho se envía con el `enviar` de este pintado (lee la conversación al día), no con el de cuando se tocó.
  useEffect(() => {
    enviarAlTerminar.current = (dicho) => void enviar(dicho, true)
  })

  return (
    <>
      <button
        aria-label={`Abrir a ${NOMBRE_DEL_ASISTENTE}, tu asistente`}
        // En el celular, solo el círculo: con el nombre tapaba tarjetas y buscadores al desplazarse.
        className="fixed right-4 bottom-4 z-30 max-[859px]:right-auto max-[859px]:left-4 max-[767px]:bottom-[calc(92px+env(safe-area-inset-bottom))] min-[768px]:max-[859px]:left-[92px] inline-flex size-13 cursor-pointer items-center justify-center gap-2 rounded-full bg-ink text-[13.5px] font-medium text-white shadow-float ring-1 ring-gold/40 transition-transform hover:-translate-y-0.5 min-[860px]:right-5 min-[860px]:bottom-5 min-[860px]:w-auto min-[860px]:pr-5 min-[860px]:pl-4 print:hidden"
        onClick={abrir}
        type="button"
      >
        <Chispa className="size-5 text-gold" />
        <span className="max-[859px]:sr-only">{NOMBRE_DEL_ASISTENTE}</span>
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
            <div className="flex shrink-0 items-center gap-2">
              {lectura.disponible ? (
                // Que conteste en voz alta cuando se le habla; se apaga aquí (y «Callar» corta la que suena).
                <button
                  aria-label={lectura.activa ? 'No leer las respuestas en voz alta' : 'Leer las respuestas en voz alta'}
                  aria-pressed={lectura.activa}
                  className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-line-panel bg-white text-ink-soft transition-colors hover:border-ink hover:text-ink max-[859px]:size-11"
                  onClick={() => lectura.alternar()}
                  title={lectura.activa ? 'Responde en voz alta cuando le hablas' : 'Solo responde por escrito'}
                  type="button"
                >
                  <Altavoz apagado={!lectura.activa} className="size-[18px]" />
                </button>
              ) : null}
              <button
                aria-label="Cerrar"
                className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line-panel bg-white text-[13px] transition-colors hover:border-ink max-[859px]:size-11"
                onClick={cerrar}
                type="button"
              >
                <span aria-hidden>✕</span>
              </button>
            </div>
          </header>

          <div aria-busy={ocupado} aria-live="polite" className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-5">
            {burbujas.length === 0 ? (
              <div className="flex flex-col gap-4">
                <p className="text-[14px] leading-relaxed text-ink-soft">
                  Hola, soy {NOMBRE_DEL_ASISTENTE}. Pregúntame por tus invitados, tus tareas o tu presupuesto, o pídeme lo que quieras hacer —registrar
                  invitados, escribir tu invitación, armar mesas o tareas— y lo hago. {dictado.disponible ? 'Puedes escribirme o tocar el micrófono y hablarme: te respondo en voz alta.' : null}
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGERENCIAS.map((s) => (
                    <button
                      className="min-h-11 cursor-pointer rounded-full border border-line-panel-strong bg-white px-3.5 py-2 text-[13px] text-ink-soft transition-colors hover:border-ink hover:text-ink"
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
                    {b.muestra ?? b.texto}
                  </p>
                ) : (
                  <div className="flex max-w-[92%] flex-col gap-2 self-start" key={i}>
                    {b.texto === '' ? null : (
                      <p className={`rounded-[16px] rounded-bl-[4px] border px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap ${b.error ? 'border-danger/30 bg-danger/5 text-danger' : 'border-line-panel bg-white text-ink'}`}>
                        {conEnlaces(b.texto, slug, cerrar)}
                      </p>
                    )}
                    {b.envio === undefined ? null : <TarjetaDeEnvio eventId={eventId} filas={b.envio.filas} slug={slug} tipo={b.envio.tipo} />}
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
            className="flex flex-col gap-2 border-t border-line-panel px-5 pt-4 pb-[max(env(safe-area-inset-bottom),16px)]"
            onSubmit={(e) => {
              e.preventDefault()
              void enviar(texto)
            }}
          >
            <div className="flex items-end gap-2">
              <label className="sr-only" htmlFor={`${titulo}-campo`}>
                Escríbele a {NOMBRE_DEL_ASISTENTE}
              </label>
              {/* 16 px en el celular: con menos, el iPhone hace zoom al tocar el campo y descoloca el panel. */}
              <textarea
                className="max-h-36 min-h-11 flex-1 resize-none rounded-[14px] border border-line-panel-strong bg-white px-3.5 py-2.5 text-[16px] leading-relaxed text-ink outline-none focus:border-ink min-[860px]:text-[13.5px]"
                id={`${titulo}-campo`}
                maxLength={2000}
                onChange={(e) => {
                  // Escribir a mano corta la escucha: el dictado ya no pisa lo que se teclea.
                  if (dictado.estado === 'escuchando') dictado.cancelar()
                  setTexto(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void enviar(texto)
                  }
                }}
                placeholder={dictado.disponible ? 'Escríbele o háblale…' : `Escríbele a ${NOMBRE_DEL_ASISTENTE}…`}
                ref={campo}
                rows={1}
                value={texto}
              />
              <input
                accept="image/*,audio/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const archivo = e.target.files?.[0]
                  e.target.value = ''
                  if (archivo !== undefined) void adjuntar(archivo)
                }}
                ref={selectorDeArchivo}
                type="file"
              />
              <button
                aria-label="Adjuntar una foto, la canción o un documento"
                className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-line-panel-strong bg-white text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
                disabled={ocupado || subiendo !== null}
                onClick={() => selectorDeArchivo.current?.click()}
                title="Adjuntar una foto, la canción o un documento"
                type="button"
              >
                <Clip className="size-[18px]" />
              </button>
              {dictado.disponible ? (
                dictado.estado === 'escuchando' ? (
                  <button
                    aria-label="Terminar de hablar y enviar"
                    className="relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-danger text-white"
                    onClick={dictado.terminar}
                    type="button"
                  >
                    <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-danger/40 motion-reduce:animate-none" />
                    <span aria-hidden className="relative size-3.5 rounded-[3px] bg-white" />
                  </button>
                ) : (
                  <button
                    aria-label={`Hablarle a ${NOMBRE_DEL_ASISTENTE}`}
                    className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-line-panel-strong bg-white text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={ocupado}
                    onClick={() => {
                      lectura.callar()
                      dictado.empezar(texto)
                    }}
                    type="button"
                  >
                    <Microfono className="size-[18px]" />
                  </button>
                )
              ) : null}
              {ocupado ? (
                // Mientras responde, «Detener»: antes no había forma de cortar una respuesta que no llegaba.
                <button
                  aria-label="Detener la respuesta"
                  className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-ink text-white"
                  onClick={() => peticion.current?.abort('detenido')}
                  type="button"
                >
                  <span aria-hidden className="size-3 rounded-[2px] bg-white" />
                </button>
              ) : (
                <button
                  className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-ink text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={texto.trim() === ''}
                  type="submit"
                >
                  <span className="sr-only">Enviar</span>
                  <svg aria-hidden className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
              )}
            </div>
            {dictado.estado === 'escuchando' ? (
              <p aria-live="polite" className="flex items-center gap-2 text-[12.5px] text-ink-soft" role="status">
                <span aria-hidden className="size-2 animate-pulse rounded-full bg-danger" />
                Te escucho… Al terminar de hablar, te respondo.
              </p>
            ) : lectura.hablando ? (
              <p aria-live="polite" className="flex items-center gap-2 text-[12.5px] text-ink-soft" role="status">
                <span aria-hidden className="size-2 animate-pulse rounded-full bg-gold" />
                Te estoy respondiendo en voz alta.
                <button className="min-h-9 cursor-pointer rounded-full border border-line-panel-strong bg-white px-3 text-[12.5px] text-ink" onClick={lectura.callar} type="button">
                  Callar
                </button>
              </p>
            ) : null}
            {subiendo === null ? null : (
              <p aria-live="polite" className="flex items-center gap-2 text-[12.5px] text-ink-soft" role="status">
                <span aria-hidden className="size-2 animate-pulse rounded-full bg-gold" />
                {subiendo}
              </p>
            )}
            {documento === null ? null : (
              <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-soft" role="group" aria-label={`Qué es «${documento.name}»`}>
                <span>¿Qué es «{documento.name}»?</span>
                {TIPOS_DE_DOCUMENTO.map(([clave, nombre]) => (
                  <button className="min-h-9 cursor-pointer rounded-full border border-line-panel-strong bg-white px-3 text-ink hover:border-ink" key={clave} onClick={() => void subirDocumento(clave)} type="button">
                    {nombre}
                  </button>
                ))}
                <button className="min-h-9 cursor-pointer px-2 text-ink-mute underline" onClick={() => setDocumento(null)} type="button">
                  Cancelar
                </button>
              </div>
            )}
            {avisoDeSubida === null ? null : (
              <p className="text-[12.5px] text-danger" role="alert">
                {avisoDeSubida}
              </p>
            )}
            {dictado.aviso === null ? null : (
              <p className="text-[12.5px] text-danger" role="alert">
                {dictado.aviso}
              </p>
            )}
            <p className="text-[11px] text-ink-mute">{NOMBRE_DEL_ASISTENTE} puede equivocarse: revisa lo que hace en tu panel.</p>
          </form>
        </div>
      </dialog>
    </>
  )
}

/**
 * **El envío, de uno en uno**: un botón de WhatsApp por invitado con su mensaje y su enlace ya escritos
 * (los arma el servidor). WhatsApp no deja enviar sin el toque de la persona, así que cada toque abre su
 * chat y deja la invitación marcada enviada, con las mismas acciones que «Enviar invitaciones».
 */
function TarjetaDeEnvio({ filas, tipo, slug, eventId }: { filas: readonly FilaDeEnvio[]; tipo: 'invitacion' | 'recordatorio'; slug: string; eventId: string }) {
  const [hechas, setHechas] = useState<ReadonlySet<string>>(new Set())
  const [aviso, setAviso] = useState<string | null>(null)

  const marcar = async (f: FilaDeEnvio): Promise<string | null> => {
    if (tipo === 'recordatorio' && f.recordatorio !== undefined) {
      const r = await markReminderSentAction({ eventId, eventSlug: slug, guestGroupId: f.id, kind: f.recordatorio }).catch(() => ({ status: 'error' as const, message: 'se cortó la conexión' }))
      return r.status === 'error' ? r.message : null
    }
    const fd = new FormData()
    fd.set('eventSlug', slug)
    fd.set('groupId', f.id)
    const r = await sendInvitationAction({ status: 'idle' }, fd).catch(() => ({ status: 'error' as const, message: 'se cortó la conexión' }))
    return r.status === 'error' ? r.message : null
  }

  const enviar = (f: FilaDeEnvio) => {
    setAviso(null)
    if (f.conEnlace) {
      // Síncrono en el toque: abrirlo tras un `await` lo bloquea Safari como ventana emergente.
      window.open(whatsappLink({ phone: f.telefono, message: f.mensaje }), '_blank')
      void marcar(f).then((error) => (error === null ? setHechas((h) => new Set(h).add(f.id)) : setAviso(`${f.nombre}: ${error}`)))
      return
    }
    const ventana = window.open('', '_blank')
    void ensureInvitationLinkAction({ eventSlug: slug, groupId: f.id }).then(async (r) => {
      if (r.status !== 'success') {
        ventana?.close()
        setAviso(`${f.nombre}: ${r.message}`)
        return
      }
      const destino = whatsappLink({ phone: f.telefono, message: f.mensaje.replaceAll('{enlace}', conCanal(r.url, 'whatsapp')) })
      if (ventana !== null) ventana.location.href = destino
      else window.location.href = destino
      const error = await marcar(f)
      if (error === null) setHechas((h) => new Set(h).add(f.id))
      else setAviso(`${f.nombre}: ${error}`)
    })
  }

  return (
    <section aria-label={tipo === 'invitacion' ? 'Invitaciones para enviar' : 'Recordatorios para enviar'} className="rounded-[16px] border border-gold/40 bg-bg-top px-4 py-3.5">
      <p className="font-mono text-[10.5px] tracking-[0.14em] text-gold-deep uppercase">
        {tipo === 'invitacion' ? `${hechas.size} de ${filas.length} enviadas` : `${hechas.size} de ${filas.length} recordados`}
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {filas.map((f) => (
          <li className="flex items-center gap-3" key={f.id}>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] leading-snug font-medium text-ink [overflow-wrap:anywhere]">{f.nombre}</span>
              <span className="block text-[12px] text-ink-mute">{f.telefono ?? 'Sin WhatsApp: elegirás el chat al abrirlo'}</span>
            </span>
            {hechas.has(f.id) ? (
              <span className="shrink-0 text-[12.5px] text-sage-deep">Enviada ✓</span>
            ) : (
              <button
                aria-label={`Mandar por WhatsApp a ${f.nombre}`}
                className="min-h-11 shrink-0 cursor-pointer rounded-full bg-whatsapp px-4 text-[13px] font-medium text-white hover:brightness-110"
                onClick={() => enviar(f)}
                type="button"
              >
                WhatsApp
              </button>
            )}
          </li>
        ))}
      </ul>
      {aviso === null ? null : (
        <p className="mt-2 text-[12.5px] text-danger" role="alert">
          {aviso}
        </p>
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

function Clip({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24">
      <path d="M20.5 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.6-8.6a3.4 3.4 0 0 1 4.8 4.8l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9" />
    </svg>
  )
}

function Microfono({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24">
      <rect height="12" rx="3" width="6" x="9" y="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </svg>
  )
}

function Altavoz({ className, apagado }: { className?: string; apagado: boolean }) {
  return (
    <svg aria-hidden className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      {apagado ? <path d="M16 9.5l5 5M21 9.5l-5 5" /> : <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />}
    </svg>
  )
}

const sinCambios = () => () => {}

/** Lo mínimo del reconocimiento de voz del navegador (Web Speech API), que TypeScript no trae. */
type Reconocedor = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type ConstructorDeReconocedor = new () => Reconocedor
const reconocedorDelNavegador = (): ConstructorDeReconocedor | null => {
  const w = window as unknown as { SpeechRecognition?: ConstructorDeReconocedor; webkitSpeechRecognition?: ConstructorDeReconocedor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Lo que se le dice a la persona cuando el navegador no puede escuchar, según su error. */
const AVISO_DE_VOZ: Record<string, string> = {
  'no-speech': 'No te oí. Toca el micrófono y vuelve a hablar.',
  'not-allowed': 'Para hablarme, permite el micrófono: toca el candado junto a la dirección, activa «Micrófono» y vuelve a tocarlo.',
  'service-not-allowed':
    'Tu aparato no deja dictar aquí. En iPhone, activa Ajustes › General › Teclado › Dictado; o usa el micrófono de tu teclado para dictar.',
  'audio-capture': 'No encontré un micrófono en este aparato. Puedes escribirme.',
  network: 'Tu navegador no pudo escucharte ahora (sin conexión). Usa el micrófono de tu teclado o escríbeme.',
}

/**
 * **Hablarle a Luxury** con el reconocimiento de voz **del propio navegador** (Web Speech API): gratis, sin
 * mandar audio a nuestro servidor, y con el permiso del micrófono que pide el navegador, como Google Meet.
 * Lo dicho aparece en el campo mientras se habla y **se envía solo al callarse** (o al tocar «Terminar»).
 * Donde el navegador no lo trae (Firefox), no hay botón: se escribe, o se dicta con el teclado del celular.
 *
 * **Nunca se queda escuchando**: si el navegador no avisa de que terminó (pasa en iPhone), se suelta solo
 * tras unos segundos de silencio. Escribir o enviar a mano lo corta (`cancelar`).
 */
function useDictado(alOir: (texto: string) => void, alTerminar: (texto: string) => void) {
  const disponible = useSyncExternalStore(sinCambios, () => reconocedorDelNavegador() !== null, () => false)
  const [estado, setEstado] = useState<'quieto' | 'escuchando'>('quieto')
  const [aviso, setAviso] = useState<string | null>(null)
  const actual = useRef<{ cerrar: (enviar: boolean) => void } | null>(null)

  // Si se va de la página a mitad, se suelta el micrófono.
  useEffect(() => () => actual.current?.cerrar(false), [])

  function empezar(textoActual: string) {
    const Reconocer = reconocedorDelNavegador()
    if (Reconocer === null) return
    actual.current?.cerrar(false)
    setAviso(null)
    const base = textoActual.trim()
    // Uno nuevo cada vez: en iPhone, reusar el anterior lo deja callado a la segunda.
    const r = new Reconocer()
    r.lang = navigator.language || 'es-BO'
    r.interimResults = true
    // Una frase por toque: en Android, el modo continuo repite lo ya dicho.
    r.continuous = false
    let dicho = ''
    let cerrado = false
    // ponytail: temporizadores sin red, solo para soltar el micrófono si el navegador no avisa de que terminó.
    let silencio: ReturnType<typeof setTimeout> | undefined
    let respaldo: ReturnType<typeof setTimeout> | undefined
    const unido = () => [base, dicho].filter((t) => t !== '').join(' ')
    const cerrar = (enviar: boolean) => {
      if (cerrado) return
      cerrado = true
      clearTimeout(silencio)
      clearTimeout(respaldo)
      if (actual.current?.cerrar === cerrar) actual.current = null
      setEstado('quieto')
      try {
        r.abort()
      } catch {
        // Ya estaba cerrado.
      }
      if (enviar && dicho !== '') alTerminar(unido())
    }
    const esperarSilencio = (ms: number) => {
      clearTimeout(silencio)
      silencio = setTimeout(() => {
        try {
          r.stop()
        } catch {
          // Ya estaba parado.
        }
        respaldo = setTimeout(() => cerrar(true), 2500)
      }, ms)
    }
    r.onresult = (e) => {
      dicho = Array.from(e.results, (resultado) => resultado[0]?.transcript ?? '').join('').trim()
      alOir(unido())
      esperarSilencio(2500)
    }
    r.onerror = (e) => {
      if (e.error !== 'aborted') setAviso(AVISO_DE_VOZ[e.error] ?? 'Tu navegador no pudo escucharte. Puedes escribirme.')
    }
    r.onend = () => cerrar(true)
    actual.current = { cerrar }
    setEstado('escuchando')
    esperarSilencio(8000)
    try {
      r.start()
    } catch {
      cerrar(false)
      setAviso('Tu navegador no pudo escucharte. Puedes escribirme.')
    }
  }

  return {
    disponible,
    estado,
    aviso,
    empezar,
    terminar: () => actual.current?.cerrar(true),
    cancelar: () => actual.current?.cerrar(false),
  }
}

/**
 * **Luxury contesta en voz alta cuando se le habla** con la voz del propio navegador (`speechSynthesis`):
 * gratis y sin servidor. Por frases (Chrome corta las locuciones largas a los ~15 s) y sin los enlaces del
 * panel, que leídos en voz alta no dicen nada. Se apaga con el altavoz de la cabecera.
 */
function useLectura() {
  const disponible = useSyncExternalStore(sinCambios, () => 'speechSynthesis' in window, () => false)
  const [activa, setActiva] = useState(true)
  const [hablando, setHablando] = useState(false)

  // Chrome carga sus voces tarde: se piden al montar para que la primera respuesta ya tenga la buena.
  useEffect(() => {
    const voz = window.speechSynthesis
    if (voz === undefined) return
    voz.getVoices()
    const precargar = () => voz.getVoices()
    voz.addEventListener?.('voiceschanged', precargar)
    return () => {
      voz.removeEventListener?.('voiceschanged', precargar)
      voz.cancel()
    }
  }, [])

  const callar = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    setHablando(false)
  }

  function leer(texto: string) {
    if (!disponible || !activa) return
    const voz = window.speechSynthesis
    voz.cancel()
    const limpio = texto.replace(/\/panel\/eventos\/\S+/g, '').replace(/[*_#`]/g, '')
    const frases = (limpio.match(/[^.!?¿¡\n]+[.!?]*/g) ?? []).map((f) => f.trim()).filter((f) => f.length > 1)
    if (frases.length === 0) return
    // Mujer latinoamericana en español, mujer nativa en inglés; el idioma, el de la respuesta (`voz.ts`).
    const idioma = idiomaDelTexto(limpio, navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es')
    const elegida = elegirVoz(voz.getVoices(), idioma)
    frases.forEach((frase, i) => {
      const u = new SpeechSynthesisUtterance(frase)
      u.lang = elegida?.lang ?? (idioma === 'en' ? 'en-US' : 'es-MX')
      if (elegida !== undefined) u.voice = elegida
      if (i === 0) u.onstart = () => setHablando(true)
      if (i === frases.length - 1) {
        u.onend = () => setHablando(false)
        u.onerror = () => setHablando(false)
      }
      voz.speak(u)
    })
  }

  const alternar = () => {
    if (activa) callar()
    setActiva(!activa)
  }

  return { disponible, activa, hablando, leer, callar, alternar }
}
