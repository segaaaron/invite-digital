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
import { RobotLuxury, TarjetaDeLuxury } from './RobotLuxury'
import { despertarAudio, dictadoPropioListo, escucharPropio, type Escucha } from './dictado-propio'
import { comoDictar, elegirVoz, esDespedida, frasesListas, idiomaDelTexto, paraLeer, vocesParaElegir } from './voz'

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
  /**
   * **Modo conversación** (8 de octubre): se toca el micrófono una vez y se habla como con Siri. Al callarse se
   * envía, Luxury contesta en voz alta y el micrófono **se vuelve a abrir solo**; «listo» o «gracias» lo terminan.
   * `rondas`: cuántas veces ya se le habló en esta conversación (la primera, si falla, pasa al teclado).
   */
  const [conversacion, setConversacion] = useState(false)
  const [verVoces, setVerVoces] = useState(false)
  /** Lo que Luxury dice **con el chat cerrado**, en su tarjeta junto al robot. */
  const [afuera, setAfuera] = useState<{ id: number; texto: string } | null>(null)
  const [afueraHablando, setAfueraHablando] = useState(false)
  /**
   * **Hablarle sin abrir el chat** (9 de octubre): el micrófono junto al robot abre la conversación por voz y la
   * tarjeta del robot va diciendo «Te escucho…», lo dicho y la respuesta. El chat guarda todo igual.
   */
  const [modoFuera, setModoFuera] = useState(false)
  const modoFueraRef = useRef(false)
  /** Lo último que dijo al terminar fuera del chat («Cuando quieras»), para que la tarjeta no repita la respuesta anterior. */
  const [despedidaFuera, setDespedidaFuera] = useState<string | null>(null)
  /** Desde qué mensaje empieza la conversación de fuera: las respuestas anteriores no se enseñan en la tarjeta. */
  const inicioFuera = useRef(0)
  useEffect(() => {
    modoFueraRef.current = modoFuera
  })
  const decirAfuera = useRef((texto: string) => void texto)
  useEffect(() => {
    // ponytail: temporizadores sin red: cuánto mueve la boca y cuándo se va la tarjeta.
    let quitar: ReturnType<typeof setTimeout> | undefined
    let callar: ReturnType<typeof setTimeout> | undefined
    decirAfuera.current = (texto) => {
      clearTimeout(quitar)
      clearTimeout(callar)
      setAfuera({ id: Date.now(), texto })
      setAfueraHablando(true)
      callar = setTimeout(() => setAfueraHablando(false), Math.min(4000, texto.length * 35))
      quitar = setTimeout(() => setAfuera(null), 5000 + texto.length * 40)
    }
    // Un saludo al día en este aparato: así se sabe que Luxury está y que se le toca.
    let saludo: ReturnType<typeof setTimeout> | undefined
    try {
      const hoy = new Date().toISOString().slice(0, 10)
      if (window.localStorage.getItem(CLAVE_DEL_SALUDO) !== hoy) {
        window.localStorage.setItem(CLAVE_DEL_SALUDO, hoy)
        saludo = setTimeout(() => decirAfuera.current('Hola, soy Luxury. Tócame para escribirme, o toca el micrófono y háblame: te ayudo con tu evento.'), 1500)
      }
    } catch {
      // Sin almacenamiento (privado): sin saludo.
    }
    return () => {
      clearTimeout(quitar)
      clearTimeout(callar)
      clearTimeout(saludo)
    }
  }, [])
  const conversando = useRef(false)
  const rondas = useRef(0)
  const seguirConversacion = useRef(() => {})
  const lectura = useLectura(() => seguirConversacion.current())
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
    // Para dictar con el teclado hace falta el campo: fuera del chat, se abre el chat.
    () => (modoFueraRef.current ? abrir() : campo.current?.focus()),
    {
      enRonda: () => conversando.current && rondas.current > 0,
      cortar: (aviso) => terminarConversacion(aviso),
    },
  )

  function empezarConversacion() {
    lectura.callar()
    // En iPhone la voz solo suena si se estrenó en un toque: se estrena aquí.
    lectura.estrenar()
    if (dictado.modo === 'navegador' || dictado.modo === 'propio') {
      conversando.current = true
      rondas.current = 0
      setConversacion(true)
    }
    dictado.empezar(texto)
  }
  // Lo que dice la tarjeta del robot cuando se le habla fuera del chat: la última respuesta **de esta conversación**
  // (se sigue viendo mientras vuelve a escuchar) y, debajo, en qué está.
  const ultima = burbujas.at(-1)
  const respuestaFuera = ultima?.rol === 'asistente' && ultima.texto !== '' && burbujas.length > inicioFuera.current ? paraLeer(ultima.texto) : null
  const fuera = {
    texto: despedidaFuera !== null && !conversacion ? despedidaFuera : respuestaFuera,
    estado:
      dictado.aviso !== null && dictado.estado !== 'escuchando'
        ? dictado.aviso
        : dictado.estado === 'escuchando'
          ? 'Te escucho…'
          : ocupado && respuestaFuera === null
            ? 'Pensando…'
            : null,
    dicho: dictado.estado === 'escuchando' ? texto : '',
  }
  // Terminada la conversación (dijo «listo», calló o falló), la tarjeta se queda un momento y se va.
  const quieto = modoFuera && !conversacion && !ocupado && !lectura.hablando && dictado.estado !== 'escuchando'
  useEffect(() => {
    if (!quieto) return
    // ponytail: temporizador sin red, solo retira la tarjeta.
    const t = setTimeout(() => setModoFuera(false), 6000)
    return () => clearTimeout(t)
  }, [quieto])

  function terminarConversacion(aviso: string | null = null) {
    conversando.current = false
    setConversacion(false)
    dictado.cancelar()
    if (aviso !== null) dictado.avisar(aviso)
  }

  // Con llaves: en Chrome reciente `scrollIntoView` devuelve una promesa, y un efecto que devuelve algo que
  // no es una función revienta React al limpiarlo («i is not a function»).
  useEffect(() => {
    final.current?.scrollIntoView({ block: 'end' })
  }, [burbujas, consultando])

  const abrir = () => {
    setAfuera(null)
    setModoFuera(false)
    dialogo.current?.showModal()
    campo.current?.focus()
  }
  const cerrar = () => {
    terminarConversacion()
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
    // Escribir o enviar corta la escucha: el micrófono nunca deja sin poder mandar. Escribir a mano termina la conversación.
    if (dictado.estado === 'escuchando') dictado.cancelar()
    if (!porVoz && conversando.current) terminarConversacion()
    lectura.callar()
    // Si le hablaste, contesta en voz alta mientras llega (frase a frase), y al callarse vuelve a escuchar.
    const leyendo = porVoz && lectura.empezar()
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
    let huboCambios = false
    let recibido = ''
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
            recibido += salida.delta
            if (leyendo) lectura.alimentar(salida.delta)
            enLaUltima((b) => ({ ...b, texto: b.texto + salida.delta }))
          } else if (salida.tipo === 'consultando') setConsultando(CONSULTANDO[salida.herramienta] ?? 'Consultando…')
          else if (salida.tipo === 'propuesta') {
            const envio = salida.propuesta
            // Los botones de WhatsApp piden tocarlos: la conversación por voz termina aquí.
            conversando.current = false
            setConversacion(false)
            enLaUltima((b) => ({ ...b, envio }))
          } else if (salida.tipo === 'hecho') huboCambios = true
          else if (salida.tipo === 'error') {
            if (leyendo) lectura.alimentar(` ${salida.mensaje}`)
            enLaUltima((b) => ({ ...b, texto: b.texto === '' ? salida.mensaje : `${b.texto}\n\n${salida.mensaje}`, error: b.texto === '' }))
          }
        }
      }
      // Si se cerró el chat mientras contestaba, lo dice en su tarjeta junto al robot.
      if (dialogo.current?.open !== true && !modoFueraRef.current && recibido.trim() !== '') decirAfuera.current(recorte(paraLeer(recibido)))
      // Lo que quede por leer; sin voz (apagada), la conversación sigue escuchando igual.
      if (leyendo) lectura.terminar()
      else if (porVoz) seguirConversacion.current()
    } catch {
      lectura.callar()
      if (conversando.current) terminarConversacion()
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

  // **«Hablar con Luxury» desde el icono** (Android: acceso del manifiesto → `/panel/luxury` → aquí con `?luxury=voz`):
  // se abre ya escuchando. Si el navegador pide un toque para el micrófono, el aviso lo dice.
  const alAbrirConVoz = useRef(() => {})
  useEffect(() => {
    alAbrirConVoz.current = () => {
      abrir()
      empezarConversacion()
    }
  })
  // Se lee una vez; se abre cuando el aparato ya dijo cómo dicta (al hidratar todavía es `ninguno`).
  const pidioVoz = useRef<boolean | null>(null)
  useEffect(() => {
    if (pidioVoz.current === null) {
      const url = new URL(window.location.href)
      pidioVoz.current = url.searchParams.get('luxury') === 'voz'
      if (pidioVoz.current) {
        url.searchParams.delete('luxury')
        window.history.replaceState(window.history.state, '', url)
      }
    }
    if (pidioVoz.current && dictado.modo !== 'ninguno') {
      pidioVoz.current = false
      alAbrirConVoz.current()
    }
  }, [dictado.modo])

  // Lo dicho se envía con el `enviar` de este pintado (lee la conversación al día), no con el de cuando se tocó.
  useEffect(() => {
    enviarAlTerminar.current = (dicho) => {
      // «Listo», «gracias»: se acaba la conversación sin molestar a Luxury.
      if (conversando.current && esDespedida(dicho)) {
        setTexto('')
        terminarConversacion()
        if (modoFueraRef.current) setDespedidaFuera('Cuando quieras. Toca el micrófono si me necesitas.')
        lectura.una('Cuando quieras.')
        return
      }
      rondas.current += 1
      void enviar(dicho, true)
    }
    // Al callarse Luxury (o al terminar de responder sin voz), vuelve a escuchar si la conversación sigue.
    seguirConversacion.current = () => {
      if (conversando.current && (dialogo.current?.open === true || modoFueraRef.current)) dictado.empezar('')
    }
  })

  return (
    <>
      {/* **Luxury en persona** (8 de octubre): el robot champán es el botón; tocarlo abre el chat. Con el chat
          cerrado, habla en su tarjeta (un saludo al día, o la respuesta si se cerró mientras contestaba). */}
      <div className="fixed right-3 bottom-2 z-30 max-[859px]:right-auto max-[859px]:left-3 max-[767px]:bottom-[calc(84px+env(safe-area-inset-bottom))] min-[768px]:max-[859px]:left-[84px] min-[860px]:right-4 min-[860px]:bottom-3 print:hidden">
        {modoFuera ? (
          // Hablándole fuera del chat: la tarjeta va diciendo en qué está, y deja abrir el chat o terminar.
          <div aria-live="polite" className="absolute bottom-[50px] w-[min(300px,calc(100vw-110px))] max-[859px]:left-[66px] min-[860px]:right-[86px] min-[860px]:bottom-[58px]" role="status">
            <TarjetaDeLuxury perlas={null}>
              {fuera.texto === null ? null : <span className="block max-h-[38vh] overflow-y-auto text-[13.5px] leading-normal whitespace-pre-wrap">{fuera.texto}</span>}
              {fuera.estado === null ? null : (
                <span className={`flex items-center gap-2 text-[12.5px] text-ink-soft ${fuera.texto === null ? '' : 'mt-2 border-t border-gold/25 pt-2'}`}>
                  <span aria-hidden className={`size-2 shrink-0 animate-pulse rounded-full motion-reduce:animate-none ${fuera.estado === 'Te escucho…' ? 'bg-danger' : 'bg-gold'}`} />
                  {fuera.estado}
                </span>
              )}
              {fuera.dicho === '' ? null : <span className="mt-1 block text-[12px] text-ink-mute italic">«{fuera.dicho}»</span>}
              <span className="mt-2.5 flex flex-wrap gap-2">
                <button className="min-h-11 cursor-pointer rounded-full bg-ink px-3.5 text-[12.5px] text-white" onClick={abrir} type="button">
                  Abrir el chat
                </button>
                <button
                  className="min-h-11 cursor-pointer rounded-full border border-line-panel-strong bg-white px-3.5 text-[12.5px] text-ink"
                  onClick={() => {
                    lectura.callar()
                    terminarConversacion()
                    setModoFuera(false)
                  }}
                  type="button"
                >
                  Terminar
                </button>
              </span>
            </TarjetaDeLuxury>
          </div>
        ) : afuera === null ? null : (
          // No intercepta toques (no tapa botones de la pantalla): el que abre el chat es el robot.
          <div aria-live="polite" className="pointer-events-none absolute bottom-[50px] w-[min(280px,calc(100vw-110px))] max-[859px]:left-[66px] min-[860px]:right-[86px] min-[860px]:bottom-[58px]" key={afuera.id} role="status">
            <TarjetaDeLuxury perlas={null}>
              <span className="block text-[13.5px] leading-normal">{afuera.texto}</span>
            </TarjetaDeLuxury>
          </div>
        )}
        <button aria-label={`Abrir a ${NOMBRE_DEL_ASISTENTE}, tu asistente`} className="block h-[72px] w-[60px] cursor-pointer min-[860px]:h-[86px] min-[860px]:w-[72px] transition-transform hover:-translate-y-0.5" onClick={abrir} type="button">
          <RobotLuxury
            className="h-full w-full drop-shadow-[0_6px_10px_rgb(43_39_35/0.18)]"
            hablando={(afuera !== null && afueraHablando) || (modoFuera && (lectura.hablando || (ocupado && respuestaFuera !== null)))}
          />
        </button>
        {/* Hablarle sin abrir el chat. Donde el dictado es el del teclado (no se puede dictar fuera del chat), abre el chat. */}
        {dictado.disponible && !modoFuera ? (
          <button
            aria-label={`Hablarle a ${NOMBRE_DEL_ASISTENTE} sin abrir el chat`}
            className="absolute -top-3 grid size-11 cursor-pointer place-items-center max-[859px]:-right-5 min-[860px]:-left-5"
            disabled={ocupado}
            onClick={() => {
              if (dictado.modo === 'teclado') {
                abrir()
                return empezarConversacion()
              }
              setAfuera(null)
              setDespedidaFuera(null)
              inicioFuera.current = burbujas.length
              setModoFuera(true)
              empezarConversacion()
            }}
            type="button"
          >
            <span className="grid size-8 place-items-center rounded-full border border-gold/60 bg-white text-gold-deep shadow-float">
              <Microfono className="size-4" />
            </span>
          </button>
        ) : null}
      </div>

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
              <RobotLuxury className="h-12 w-10 shrink-0" />
              <div>
                <h2 className="font-display text-[26px] leading-tight font-light" id={titulo}>
                  {NOMBRE_DEL_ASISTENTE}
                </h2>
                <p className="text-[12px] text-ink-mute">Tu planner. Responde con los datos de este evento.</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {lectura.disponible ? (
                <button
                  aria-expanded={verVoces}
                  className="flex h-10 cursor-pointer items-center rounded-full border border-line-panel bg-white px-3 text-[12.5px] text-ink-soft transition-colors hover:border-ink hover:text-ink max-[859px]:h-11"
                  onClick={() => setVerVoces(!verVoces)}
                  type="button"
                >
                  Voz
                </button>
              ) : null}
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

          {verVoces ? <VocesDeLuxury elegidas={lectura.elegidas} elegir={lectura.elegir} probar={lectura.probar} voces={lectura.voces} /> : null}

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
                  // Luxury responde en su tarjeta de invitación; la última, con él al lado (habla mientras escribe o lee).
                  <div className="flex max-w-[94%] items-end gap-2 self-start" key={i}>
                    {i === burbujas.length - 1 ? (
                      <RobotLuxury className="h-[52px] w-[44px] shrink-0" hablando={(ocupado && b.texto !== '') || lectura.hablando} />
                    ) : (
                      <span aria-hidden className="w-[44px] shrink-0" />
                    )}
                    <div className="flex min-w-0 flex-col gap-2 pl-6">
                      {b.texto === '' ? null : b.error ? (
                        <p className="rounded-[16px] rounded-bl-[4px] border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap text-danger">{conEnlaces(b.texto, slug, cerrar)}</p>
                      ) : (
                        <TarjetaDeLuxury perlas={i === burbujas.length - 1 ? 'izquierda' : null}>
                          <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{conEnlaces(b.texto, slug, cerrar)}</p>
                        </TarjetaDeLuxury>
                      )}
                      {b.envio === undefined ? null : <TarjetaDeEnvio eventId={eventId} filas={b.envio.filas} slug={slug} tipo={b.envio.tipo} />}
                    </div>
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
              lectura.estrenar()
              void enviar(campo.current?.value ?? texto, dictado.tomarTeclado())
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
                // El dictado del teclado del iPhone escribe en «composición»: hasta que termina, el estado no lo
                // tiene. Enter en mitad de eso enviaba vacío y no pasaba nada (8 de octubre); se espera al final.
                onCompositionEnd={(e) => setTexto(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                    e.preventDefault()
                    lectura.estrenar()
                    void enviar(e.currentTarget.value, dictado.tomarTeclado())
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
                    onClick={empezarConversacion}
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
                  type="submit"
                >
                  <span className="sr-only">Enviar</span>
                  <svg aria-hidden className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
              )}
            </div>
            {conversacion ? (
              <EnConversacion
                estado={dictado.estado === 'escuchando' ? 'escuchando' : lectura.hablando ? 'hablando' : 'pensando'}
                interrumpir={() => {
                  lectura.callar()
                  dictado.empezar('')
                }}
                terminar={() => {
                  lectura.callar()
                  terminarConversacion()
                }}
              />
            ) : dictado.estado === 'escuchando' ? (
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
              <p className="text-[12.5px] text-ink-soft" role="status">
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


function Clip({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24">
      <path d="M20.5 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.6-8.6a3.4 3.4 0 0 1 4.8 4.8l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9" />
    </svg>
  )
}

/**
 * **La conversación por voz, a la vista**: un círculo que dice en qué está —te escucha (late en rojo), piensa
 * (dorado quieto) o te responde (ondas doradas)— y las dos salidas: interrumpir para hablar ya, o terminar.
 */
function EnConversacion({ estado, interrumpir, terminar }: { estado: 'escuchando' | 'pensando' | 'hablando'; interrumpir: () => void; terminar: () => void }) {
  const TEXTO = {
    escuchando: 'Te escucho…',
    pensando: 'Pensando…',
    hablando: 'Te respondo. Toca para interrumpir.',
  } as const
  return (
    <div aria-live="polite" className="flex items-center gap-3 rounded-[16px] border border-line-panel bg-white px-3.5 py-2.5" role="status">
      <button
        aria-label={estado === 'hablando' ? 'Interrumpir y hablar' : TEXTO[estado]}
        className="relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-full disabled:cursor-default"
        disabled={estado !== 'hablando'}
        onClick={interrumpir}
        type="button"
      >
        <span
          aria-hidden
          className={`absolute inset-0 rounded-full motion-reduce:animate-none ${estado === 'escuchando' ? 'animate-ping bg-danger/30' : estado === 'hablando' ? 'animate-pulse bg-gold/35' : 'bg-gold/15'}`}
        />
        <span aria-hidden className={`relative size-5 rounded-full ${estado === 'escuchando' ? 'bg-danger' : 'bg-gold'}`} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-ink">{TEXTO[estado]}</p>
        <p className="text-[12px] text-ink-mute">Conversación por voz · di «listo» para terminar</p>
      </div>
      <button className="min-h-11 shrink-0 cursor-pointer rounded-full border border-line-panel-strong bg-white px-3.5 text-[12.5px] text-ink hover:border-ink" onClick={terminar} type="button">
        Terminar
      </button>
    </div>
  )
}

/**
 * **La voz de Luxury, a elección** (8 de octubre: «suena robótica»). La automática ya evita las voces de efecto;
 * aquí se elige oyéndola, por idioma, y se recuerda en este aparato. Las mejores son las «mejoradas» o «premium»
 * de Apple y las «Natural» de Windows: gratis, pero se descargan en el sistema.
 */
function VocesDeLuxury({
  voces,
  elegidas,
  elegir,
  probar,
}: {
  voces: readonly SpeechSynthesisVoice[]
  elegidas: { es?: string; en?: string }
  elegir: (idioma: 'es' | 'en', voiceURI: string | null) => void
  probar: (idioma: 'es' | 'en') => void
}) {
  const fila = (idioma: 'es' | 'en', rotulo: string) => {
    const lista = vocesParaElegir(voces, idioma)
    return (
      <div className="flex items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[12px] text-ink-mute">{rotulo}</span>
          <select
            className="min-h-11 w-full rounded-[12px] border border-line-panel-strong bg-white px-3 text-[14px] text-ink"
            onChange={(e) => elegir(idioma, e.target.value === '' ? null : e.target.value)}
            value={elegidas[idioma] ?? ''}
          >
            <option value="">Automática (la mejor de tu aparato)</option>
            {lista.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} · {v.lang}
              </option>
            ))}
          </select>
        </label>
        <button className="min-h-11 shrink-0 cursor-pointer rounded-full border border-line-panel-strong bg-white px-3.5 text-[12.5px] text-ink hover:border-ink" onClick={() => probar(idioma)} type="button">
          Probar
        </button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3 border-b border-line-panel bg-white/60 px-5 py-4">
      {fila('es', 'Voz en español')}
      {fila('en', 'Voz en inglés')}
      <details className="text-[12.5px] leading-relaxed text-ink-soft">
        <summary className="cursor-pointer text-ink">¿Suena robótica? Descarga una voz natural (gratis)</summary>
        <p className="mt-2">
          <strong>iPhone:</strong> Ajustes › Accesibilidad › Leer y hablar (o Contenido leído) › Voces › Español (México) › <strong>Paulina</strong> ›
          descarga la versión <strong>Mejorada</strong> o <strong>Premium</strong> y déjala elegida. Para inglés, English › <strong>Ava</strong> o
          Samantha, también mejorada. Vuelve aquí y toca Probar.
        </p>
        <p className="mt-1.5">
          <strong>Android:</strong> Ajustes › Accesibilidad › Salida de texto a voz › Motor de Google › Instalar datos de voz › Español (Estados Unidos o
          México). <strong>Computadora:</strong> en Edge, las voces «Natural» de Microsoft.
        </p>
      </details>
    </div>
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

/** Dónde se dicta en este aparato (`voz.ts`), como texto para que `useSyncExternalStore` lo compare. */
const modoDeDictado = (): string => {
  const como = comoDictar({
    ua: navigator.userAgent,
    instalada: window.matchMedia?.('(display-mode: standalone)').matches === true || (navigator as { standalone?: boolean }).standalone === true,
    tactil: navigator.maxTouchPoints > 0,
    lang: navigator.language,
    conReconocedor: reconocedorDelNavegador() !== null,
    conMicrofono: typeof navigator.mediaDevices?.getUserMedia === 'function',
  })
  return como.modo === 'navegador' ? `navegador:${como.lang}` : como.modo
}

/**
 * **Lo que falla de la voz queda en Admin › Registro de fallos** (8 de octubre: «no funciona ni en iOS ni en
 * Android», sin saber por qué). Qué falló, en qué aparato y en qué modo; nunca lo dicho.
 */
function anotarVoz(que: string) {
  void fetch('/api/fallos', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mensaje: `Voz de Luxury: ${que}`, pila: `${navigator.userAgent}\nmodo=${modoDeDictado()} idioma=${navigator.language}`, ruta: location.pathname }),
  }).catch(() => {})
}

const CLAVE_DE_VOCES = 'luxury.voces'
const CLAVE_DEL_SALUDO = 'luxury.saludo'

/** Lo que cabe en la tarjeta junto al robot: la primera parte, cortada en palabra. */
const recorte = (texto: string) => (texto.length <= 170 ? texto : `${texto.slice(0, 170).replace(/\s+\S*$/, '')}…`)

/** Cuánto puede tardar en decirse una frase, holgado (~9 caracteres por segundo y 3 s de margen). */
const duracionHolgada = (texto: string) => 3000 + texto.length * 110

const SEGUIR_HABLANDO = 'Toca el micrófono para seguir hablando.'

const DICTA_CON_EL_TECLADO = 'Dicta con el micrófono de tu teclado (🎤 junto a la barra espaciadora) y toca Enviar: te respondo en voz alta. En iPhone también puedes decir «Oye Siri, Luxury» (actívalo en Mi cuenta).'

/** Lo que se le dice a la persona cuando el navegador no puede escuchar, según su error. */
const AVISO_DE_VOZ: Record<string, string> = {
  'no-speech': 'No te oí. Toca el micrófono y vuelve a hablar.',
  'not-allowed': 'Para hablarme, permite el micrófono: toca el candado junto a la dirección, activa «Micrófono» y vuelve a tocarlo.',
  'service-not-allowed':
    'Tu aparato no deja dictar aquí. En iPhone, activa Ajustes › General › Teclado › Dictado; o usa el micrófono de tu teclado para dictar.',
  'audio-capture': 'No encontré un micrófono en este aparato. Puedes escribirme.',
  network: 'Tu navegador no pudo escucharte ahora (sin conexión). Usa el micrófono de tu teclado o escríbeme.',
  'language-not-supported': 'Tu navegador no dicta en este idioma. Usa el micrófono de tu teclado o escríbeme.',
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
function useDictado(
  alOir: (texto: string) => void,
  alTerminar: (texto: string) => void,
  abrirTeclado: () => void,
  /**
   * La conversación: `enRonda` dice si ya se habló en ella (el micrófono se reabrió solo). Ahí, un fallo o un
   * silencio no pasa al teclado: `cortar` termina la conversación (con un aviso, si hay que tocar para seguir).
   */
  conversacion: { enRonda: () => boolean; cortar: (aviso: string | null) => void },
) {
  const modo = useSyncExternalStore(sinCambios, modoDeDictado, () => 'ninguno')
  const disponible = modo !== 'ninguno'
  const [estado, setEstado] = useState<'quieto' | 'escuchando'>('quieto')
  const [aviso, setAviso] = useState<string | null>(null)
  const actual = useRef<{ cerrar: (enviar: boolean) => void } | null>(null)
  /** Se tocó el micrófono y se dicta con el teclado: lo que se envíe después se contesta en voz alta. */
  const porTeclado = useRef(false)
  const usarTeclado = (motivo: string) => {
    porTeclado.current = true
    setAviso(motivo)
    abrirTeclado()
  }

  // Si se va de la página a mitad, se suelta el micrófono.
  useEffect(() => () => actual.current?.cerrar(false), [])

  /** Chrome de iPhone, apps, panel instalado: Luxury graba y entiende en el teléfono (Vosk). */
  function empezarPropio(textoActual: string) {
    actual.current?.cerrar(false)
    setAviso(null)
    // Dentro del toque: iOS solo deja arrancar el audio en un gesto (al reabrir en la conversación ya está en marcha).
    despertarAudio()
    if (!dictadoPropioListo()) setAviso('Preparando el dictado de Luxury (solo la primera vez, unos 45 MB; mejor con wifi)…')
    const base = textoActual.trim()
    const unido = (t: string) => [base, t].filter((x) => x !== '').join(' ')
    let escucha: Escucha | null = null
    let pedido: boolean | null = null
    let hecho = false
    const terminarAqui = () => {
      if (hecho) return false
      hecho = true
      if (actual.current?.cerrar === cerrar) actual.current = null
      setEstado('quieto')
      return true
    }
    const cerrar = (enviar: boolean) => {
      if (escucha !== null) escucha.parar(enviar)
      else pedido = enviar
      if (!enviar) terminarAqui()
    }
    actual.current = { cerrar }
    // «Te escucho» cuando de verdad escucha: antes, el aviso de que se prepara.
    if (dictadoPropioListo()) setEstado('escuchando')
    void escucharPropio({
      sigue: () => !hecho && pedido !== false,
      alListo: () => {
        if (hecho) return
        setAviso(null)
        setEstado('escuchando')
      },
      alOir: (t) => {
        setAviso(null)
        alOir(unido(t))
      },
      alTerminar: (t) => {
        if (terminarAqui()) alTerminar(unido(t))
      },
      alCallar: () => {
        if (!terminarAqui()) return
        if (!conversacion.enRonda()) anotarVoz('el dictado propio no oyó nada')
        conversacion.cortar(null)
      },
      alFallar: (motivo) => {
        if (!terminarAqui()) return
        anotarVoz(`el dictado propio falló (${motivo})`)
        // En mitad de la conversación (reabierto sin toque), basta con tocar para seguir.
        if (conversacion.enRonda() && motivo !== 'NotAllowedError') return conversacion.cortar(SEGUIR_HABLANDO)
        conversacion.cortar(null)
        usarTeclado(
          motivo === 'NotAllowedError'
            ? AVISO_DE_VOZ['not-allowed']!
            : motivo === 'descarga-lenta'
              ? 'El dictado tarda en bajarse (unos 45 MB): prueba con wifi. Mientras, dicta con el micrófono de tu teclado y toca Enviar.'
              : DICTA_CON_EL_TECLADO,
        )
      },
    }).then((e) => {
      escucha = e
      if (pedido !== null) e.parar(pedido)
    })
  }

  function empezar(textoActual: string) {
    if (modo === 'propio') return empezarPropio(textoActual)
    const Reconocer = reconocedorDelNavegador()
    if (modo === 'teclado' || Reconocer === null) {
      usarTeclado(DICTA_CON_EL_TECLADO)
      return
    }
    actual.current?.cerrar(false)
    setAviso(null)
    const base = textoActual.trim()
    // Uno nuevo cada vez: en iPhone, reusar el anterior lo deja callado a la segunda.
    const r = new Reconocer()
    r.lang = modo.startsWith('navegador:') ? modo.slice('navegador:'.length) : navigator.language || 'es-BO'
    r.interimResults = true
    // Una frase por toque: en Android, el modo continuo repite lo ya dicho.
    r.continuous = false
    let dicho = ''
    let cerrado = false
    let fallo = false
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
      else if (enviar && !fallo) {
        // Sin oír nada, la conversación se suelta (si no, se quedaba «Pensando…»). Callarse en mitad de ella la
        // termina sin más; al primer intento, en un celular, el teclado sí dicta (el iPhone a veces calla sin error).
        const enRonda = conversacion.enRonda()
        conversacion.cortar(null)
        if (!enRonda && navigator.maxTouchPoints > 0) {
          anotarVoz('el micrófono se cerró sin oír nada')
          usarTeclado(DICTA_CON_EL_TECLADO)
        }
      }
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
      if (e.error === 'aborted') return
      fallo = true
      // Callarse en la conversación no es un fallo: se termina y ya.
      if (conversacion.enRonda()) {
        if (e.error !== 'no-speech') anotarVoz(`el micrófono no se reabrió solo (${e.error})`)
        conversacion.cortar(e.error === 'no-speech' ? null : SEGUIR_HABLANDO)
        return
      }
      anotarVoz(`el dictado del navegador falló (${e.error})`)
      conversacion.cortar(null)
      // Sin permiso se dice cómo darlo; cualquier otro fallo en el celular pasa al dictado del teclado.
      if (e.error !== 'not-allowed' && navigator.maxTouchPoints > 0) {
        cerrado = true
        clearTimeout(silencio)
        clearTimeout(respaldo)
        actual.current = null
        setEstado('quieto')
        usarTeclado(DICTA_CON_EL_TECLADO)
        return
      }
      setAviso(AVISO_DE_VOZ[e.error] ?? 'Tu navegador no pudo escucharte. Puedes escribirme.')
    }
    r.onend = () => cerrar(true)
    actual.current = { cerrar }
    setEstado('escuchando')
    esperarSilencio(8000)
    try {
      r.start()
    } catch (causa) {
      anotarVoz(`el dictado no arrancó (${causa instanceof Error ? causa.name : 'desconocido'})`)
      cerrar(false)
      // Reabrirlo solo (sin toque) lo niegan algunos navegadores: se pide el toque.
      if (conversacion.enRonda()) return conversacion.cortar(SEGUIR_HABLANDO)
      conversacion.cortar(null)
      setAviso('Tu navegador no pudo escucharte. Puedes escribirme.')
    }
  }

  return {
    disponible,
    /** `navegador` (dictado del navegador), `teclado` (dictado del teclado del celular) o `ninguno`. */
    modo: modo.startsWith('navegador') ? ('navegador' as const) : (modo as 'propio' | 'teclado' | 'ninguno'),
    estado,
    aviso,
    avisar: (texto: string) => setAviso(texto),
    empezar,
    terminar: () => actual.current?.cerrar(true),
    cancelar: () => actual.current?.cerrar(false),
    /** Si lo que se envía se dictó con el teclado tras tocar el micrófono (y lo olvida). */
    tomarTeclado: () => {
      const fue = porTeclado.current
      porTeclado.current = false
      if (fue) setAviso(null)
      return fue
    },
  }
}

/**
 * **Luxury contesta en voz alta cuando se le habla** con la voz del propio navegador (`speechSynthesis`):
 * gratis y sin servidor. Por frases (Chrome corta las locuciones largas a los ~15 s) y sin los enlaces del
 * panel, que leídos en voz alta no dicen nada. Se apaga con el altavoz de la cabecera.
 */
function useLectura(alTerminar: () => void) {
  const disponible = useSyncExternalStore(sinCambios, () => 'speechSynthesis' in window, () => false)
  const [activa, setActiva] = useState(true)
  const [hablando, setHablando] = useState(false)
  /** La respuesta que se va leyendo: lo que falta por cerrar frase, cuántas frases suenan y si ya llegó entera. */
  const ronda = useRef({ resto: '', leido: '', sonando: 0, entera: true, id: 0 })
  /** Las frases que suenan, guardadas hasta que acaben: sin referencia, el navegador puede soltarlas sin avisar del final. */
  const vivas = useRef(new Set<SpeechSynthesisUtterance>())
  const alFinal = useRef(alTerminar)
  useEffect(() => {
    alFinal.current = alTerminar
  })

  /** Las voces del aparato y la que la persona eligió por idioma (se recuerda en este aparato). */
  // Se leen al crear (el panel de voces no se pinta al hidratar: no hay desajuste con el servidor).
  const [voces, setVoces] = useState<SpeechSynthesisVoice[]>(() => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : []))
  const [elegidas, setElegidas] = useState<{ es?: string; en?: string }>(() => {
    try {
      return typeof window === 'undefined' ? {} : (JSON.parse(window.localStorage.getItem(CLAVE_DE_VOCES) ?? '{}') as { es?: string; en?: string })
    } catch {
      // Sin almacenamiento (privado): la automática.
      return {}
    }
  })
  const elegir = (idioma: 'es' | 'en', voiceURI: string | null) => {
    const nuevas = { ...elegidas, [idioma]: voiceURI ?? undefined }
    setElegidas(nuevas)
    try {
      window.localStorage.setItem(CLAVE_DE_VOCES, JSON.stringify(nuevas))
    } catch {
      // Sin almacenamiento: vale hasta cerrar.
    }
  }

  // Chrome carga sus voces tarde: se piden al montar para que la primera respuesta ya tenga la buena.
  useEffect(() => {
    const voz = window.speechSynthesis
    if (voz === undefined) return
    voz.getVoices()
    const precargar = () => setVoces(voz.getVoices())
    voz.addEventListener?.('voiceschanged', precargar)
    return () => {
      voz.removeEventListener?.('voiceschanged', precargar)
      voz.cancel()
    }
  }, [])

  const callar = () => {
    ronda.current = { resto: '', leido: '', sonando: 0, entera: true, id: ronda.current.id + 1 }
    vivas.current.clear()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    setHablando(false)
  }

  /** iOS solo deja hablar a una página que ya habló dentro de un toque: una frase vacía la estrena. */
  const estrenada = useRef(false)
  const estrenar = () => {
    if (estrenada.current || !disponible) return
    estrenada.current = true
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(''))
  }

  const terminarRonda = (id: number) => {
    if (id !== ronda.current.id) return
    setHablando(false)
    alFinal.current()
  }

  function decir(frase: string) {
    const r = ronda.current
    const texto = paraLeer(frase)
    if (texto.length < 2) return
    const voz = window.speechSynthesis
    r.leido += ` ${texto}`
    // Mujer latinoamericana en español, mujer nativa en inglés; el idioma, el de lo que va de respuesta (`voz.ts`).
    const idioma = idiomaDelTexto(r.leido, navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es')
    const elegida = elegirVoz(voz.getVoices(), idioma, elegidas[idioma])
    const u = new SpeechSynthesisUtterance(texto)
    u.lang = elegida?.lang ?? (idioma === 'en' ? 'en-US' : 'es-MX')
    if (elegida !== undefined) u.voice = elegida
    const id = r.id
    r.sonando += 1
    setHablando(true)
    vivas.current.add(u)
    // ponytail: temporizador sin red. Algunos Android no avisan del final de la frase y la conversación se quedaba
    // «Hablando…» sin reabrir el micrófono: si al empezar a sonar no acaba en un tiempo holgado para su largo, se da por dicha.
    let respaldo: ReturnType<typeof setTimeout> | undefined
    let acabada = false
    const acabo = () => {
      if (acabada) return
      acabada = true
      clearTimeout(respaldo)
      vivas.current.delete(u)
      if (id !== ronda.current.id) return
      ronda.current.sonando -= 1
      if (ronda.current.sonando === 0 && ronda.current.entera) terminarRonda(id)
    }
    u.onstart = () => {
      respaldo = setTimeout(acabo, duracionHolgada(texto))
    }
    u.onend = acabo
    u.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') anotarVoz(`no pudo leer la respuesta en voz alta (${e.error})`)
      acabo()
    }
    voz.speak(u)
  }

  /**
   * **Leer mientras llega**: `empezar` abre la ronda, `alimentar` lee cada frase en cuanto se cierra y `terminar`
   * lee lo que quede. Al callarse la última frase avisa (`alTerminar`): así vuelve a escuchar en la conversación.
   * Devuelve si va a leer (apagada o sin voz en el aparato, no).
   */
  function empezar(): boolean {
    if (!disponible || !activa) return false
    const voz = window.speechSynthesis
    // Solo si algo suena: en iOS, `cancel()` justo antes de `speak()` se traga la frase nueva.
    if (voz.speaking || voz.pending) voz.cancel()
    ronda.current = { resto: '', leido: '', sonando: 0, entera: false, id: ronda.current.id + 1 }
    return true
  }
  function alimentar(trozo: string) {
    const r = ronda.current
    if (r.entera) return
    const { frases, resto } = frasesListas(r.resto + trozo)
    r.resto = resto
    for (const f of frases) decir(f)
  }
  function terminar() {
    const r = ronda.current
    if (r.entera) return
    r.entera = true
    if (r.resto.trim() !== '') decir(r.resto)
    r.resto = ''
    if (r.sonando === 0) return terminarRonda(r.id)
    // Si el navegador no llega ni a empezar a hablar (sin voz, sin aviso), no se queda esperando.
    const id = r.id
    setTimeout(() => {
      const voz = window.speechSynthesis
      if (id === ronda.current.id && ronda.current.sonando > 0 && !voz.speaking && !voz.pending) {
        anotarVoz('la voz no llegó a sonar')
        ronda.current.sonando = 0
        terminarRonda(id)
      }
    }, 4000)
  }
  /** Una frase suelta («Cuando quieras»), sin ronda de respuesta detrás. */
  function una(frase: string) {
    if (!empezar()) return
    alimentar(frase)
    terminar()
  }

  const alternar = () => {
    if (activa) callar()
    setActiva(!activa)
  }

  /** Una frase de muestra con la voz de ese idioma, para elegir oyéndola. */
  const probar = (idioma: 'es' | 'en') => {
    callar()
    estrenar()
    if (!empezar()) return
    alimentar(idioma === 'en' ? 'Hi, I am Luxury, your event planner. ' : 'Hola, soy Luxury, tu planner. Así sueno. ')
    terminar()
  }

  return { disponible, activa, hablando, empezar, alimentar, terminar, una, callar, alternar, estrenar, voces, elegidas, elegir, probar }
}
