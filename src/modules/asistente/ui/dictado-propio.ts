/**
 * **El dictado propio de Luxury** (8 de octubre): donde Apple no deja su dictado pero sí grabar —Chrome de iPhone,
 * los navegadores de WhatsApp o Instagram, el panel instalado—, Luxury graba con el permiso del micrófono
 * (`getUserMedia`) y entiende **en el propio teléfono** con Vosk en español: gratis, sin OpenAI y sin mandar audio
 * a ningún servidor. Lo que entiende es texto, y Luxury contesta como siempre.
 *
 * El motor y el modelo (`/vosk/…`, unos 45 MB) se bajan la primera vez y el navegador los guarda (caché de un año).
 */

/** Lo mínimo de vosk-browser (UMD en `window.Vosk`). */
type Reconocedor = {
  on(evento: 'result', cb: (m: { result: { text: string } }) => void): void
  on(evento: 'partialresult', cb: (m: { result: { partial: string } }) => void): void
  acceptWaveform(buffer: AudioBuffer): void
  remove(): void
}
type Modelo = { KaldiRecognizer: new (sampleRate: number) => Reconocedor }
type Vosk = { createModel(url: string, logLevel?: number): Promise<Modelo> }

const MOTOR = '/vosk/vosk-0.0.8.js'
/** La primera descarga (~45 MB): pasado esto, se dice y se dicta con el teclado; la próxima vez se reintenta. */
const DESCARGA_MAXIMA_MS = 90_000
const MODELO = '/vosk/es-0.42.tar.gz'

let motor: Promise<Vosk> | null = null
let modelo: Promise<Modelo> | null = null
/** Un solo `AudioContext` para todo: iOS solo deja arrancarlo en un toque, y así la conversación lo reutiliza. */
let audio: AudioContext | null = null

function cargarMotor(): Promise<Vosk> {
  motor ??= new Promise<Vosk>((listo, falla) => {
    const ya = (window as unknown as { Vosk?: Vosk }).Vosk
    if (ya !== undefined) return listo(ya)
    const s = document.createElement('script')
    s.src = MOTOR
    s.async = true
    s.onload = () => {
      const v = (window as unknown as { Vosk?: Vosk }).Vosk
      if (v === undefined) falla(new Error('vosk sin cargar'))
      else listo(v)
    }
    s.onerror = () => falla(new Error('no se pudo bajar el motor de dictado'))
    document.head.appendChild(s)
  }).catch((e: unknown) => {
    motor = null
    throw e
  })
  return motor
}

/** Si el modelo ya está listo (sin la espera de la primera vez). */
export const dictadoPropioListo = (): boolean => modelo !== null

/** Prepara motor y modelo (la primera vez, la descarga). Se puede llamar de antemano. */
export function prepararDictadoPropio(): Promise<Modelo> {
  modelo ??= cargarMotor()
    .then((v) => v.createModel(new URL(MODELO, window.location.origin).href, -1))
    .catch((e: unknown) => {
      modelo = null
      throw e
    })
  return modelo
}

/** Se llama **dentro del toque** al micrófono: crea o reanuda el audio, que iOS no deja arrancar sin gesto. */
export function despertarAudio(): void {
  const Contexto = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (Contexto === undefined) return
  audio ??= new Contexto()
  if (audio.state === 'suspended') void audio.resume()
}

export type Escucha = { parar: (enviar: boolean) => void }

/**
 * Escucha una frase: `alOir` con lo que va entendiendo, `alTerminar` con la frase entera al callarse (Vosk detecta
 * el final), `alFallar` si no hay permiso, motor o audio. Se corta solo si nadie habla (`silencioMs`).
 */
export async function escucharPropio(p: {
  alOir: (texto: string) => void
  alTerminar: (texto: string) => void
  alCallar: () => void
  alFallar: (motivo: string) => void
  /** Ya escucha (motor y micrófono listos): hasta aquí, lo que se diga se perdería. */
  alListo?: () => void
  /** Si todavía hace falta escuchar: cerrado Luxury mientras se preparaba, el micrófono ni se abre. */
  sigue?: () => boolean
  silencioMs?: number
  /** El silencio tras un trozo cerrado que da la frase por terminada. */
  pausaMs?: number
}): Promise<Escucha> {
  let cerrado = false
  let flujo: MediaStream | null = null
  let nodo: ScriptProcessorNode | null = null
  let fuente: MediaStreamAudioSourceNode | null = null
  let rec: Reconocedor | null = null
  let dicho = ''
  // ponytail: temporizador sin red, solo suelta el micrófono si nadie habla.
  let vigia: ReturnType<typeof setTimeout> | undefined
  const soltar = () => {
    clearTimeout(vigia)
    nodo?.disconnect()
    fuente?.disconnect()
    flujo?.getTracks().forEach((t) => t.stop())
    try {
      rec?.remove()
    } catch {
      // Ya estaba quitado.
    }
  }
  const parar = (enviar: boolean) => {
    if (cerrado) return
    cerrado = true
    soltar()
    if (enviar && dicho.trim() !== '') p.alTerminar(dicho.trim())
    else if (enviar) p.alCallar()
  }
  const escucha: Escucha = { parar }

  try {
    despertarAudio()
    if (audio === null) throw new Error('sin audio')
    // Reabierto sin toque (la conversación), iOS puede dejar el audio en pausa: sin frames no hay nada que oír.
    if (audio.state !== 'running') await audio.resume().catch(() => undefined)
    if (audio.state !== 'running') throw new Error('audio-en-pausa')
    // Primero el motor y después el micrófono: lo dicho mientras se baja el modelo se perdía (se oía «…responder»).
    // ponytail: temporizador sin red, solo corta una primera descarga colgada (40 MB con datos lentos).
    let cortaDescarga: ReturnType<typeof setTimeout> | undefined
    const m = await Promise.race([
      prepararDictadoPropio(),
      new Promise<never>((_, falla) => {
        cortaDescarga = setTimeout(() => {
          modelo = null
          falla(new Error('descarga-lenta'))
        }, DESCARGA_MAXIMA_MS)
      }),
    ]).finally(() => clearTimeout(cortaDescarga))
    if (cerrado || p.sigue?.() === false) {
      cerrado = true
      return escucha
    }
    flujo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } })
    if (cerrado) {
      soltar()
      return escucha
    }
    rec = new m.KaldiRecognizer(audio.sampleRate)
    rec.on('partialresult', (r) => {
      if (cerrado || r.result.partial === '') return
      clearTimeout(vigia)
      vigia = setTimeout(() => parar(true), p.silencioMs ?? 4000)
      p.alOir([dicho, r.result.partial].filter((t) => t !== '').join(' '))
    })
    rec.on('result', (r) => {
      if (cerrado || r.result.text === '') return
      dicho = [dicho, r.result.text].filter((t) => t !== '').join(' ')
      p.alOir(dicho)
      // Vosk cierra un trozo en cada pausa corta («quien falta por» … «responder»): se espera un poco más de silencio
      // antes de enviar, y lo que siga se junta en el mismo mensaje.
      clearTimeout(vigia)
      vigia = setTimeout(() => parar(true), p.pausaMs ?? 1200)
    })
    fuente = audio.createMediaStreamSource(flujo)
    nodo = audio.createScriptProcessor(4096, 1, 1)
    nodo.onaudioprocess = (e) => {
      if (cerrado || rec === null) return
      try {
        rec.acceptWaveform(e.inputBuffer)
      } catch {
        // Un trozo que no entra no tumba la escucha.
      }
    }
    fuente.connect(nodo)
    nodo.connect(audio.destination)
    vigia = setTimeout(() => parar(true), p.silencioMs ?? 8000)
    p.alListo?.()
  } catch (causa) {
    cerrado = true
    soltar()
    p.alFallar(causa instanceof DOMException ? causa.name : causa instanceof Error ? causa.message : 'desconocido')
  }
  return escucha
}
