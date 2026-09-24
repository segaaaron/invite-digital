'use client'

import jsQR from 'jsqr'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { adjustArrivalAction, checkInByGroupAction, recordScansAction, voidArrivalAction, type DoorActionState, type ScanInput } from '@/app/_acciones/checkin/actions'
import type { ScanOutcome } from '../application/check-in-by-scan'
import type { DoorManifest, DoorManifestGroup } from '../application/get-door-manifest'
import { unirLlegadas, type ResolvedArrival } from '../domain/conflict'
import { doorTally } from '../domain/door-tally'
import { ManualPassDialog } from './ManualPassDialog'
import { DoorSearchSheet } from './DoorSearchSheet'
import { EligePersonas } from './EligePersonas'
import { resolveLocally } from './local-resolve'
import { openOutbox, type Outbox } from './outbox'
import { ScanResultCard } from './ScanResultCard'

// El bucle va sobre setTimeout, jamás sobre requestAnimationFrame: con la pestaña de
// fondo el navegador lo baja a un fotograma por segundo y el escáner se para solo. Ya
// se midió y se corrigió una vez en la maqueta.
const SCAN_MS = 110
// Ventana de gracia por código, contada desde que se cierra la tarjeta: sin ella la
// cámara vuelve a leer el mismo QR que sigue delante y registra en bucle.
const GRACE_MS = 2600

/**
 * Las acciones con las que la puerta habla con el servidor. Por defecto, las del panel —con
 * sesión—; la puerta del portero pasa las suyas, que se autorizan con su enlace y sacan el
 * evento del portero, no de lo que mande el navegador.
 */
export type DoorActions = {
  recordScans: (input: { eventId: string; eventSlug: string; scans: ScanInput[] }) => Promise<ScanOutcome[]>
  checkInByGroup: (input: {
    eventId: string
    eventSlug: string
    groupId: string
    scanId: string
    arrivedCount: number | null
    scannedAtMs: number
    personIds?: readonly string[] | null
  }) => Promise<ScanOutcome>
  adjust: (input: { eventId: string; scanId: string; arrivedCount: number; eventSlug: string }) => Promise<DoorActionState>
  void: (input: { eventId: string; scanId: string; eventSlug: string }) => Promise<DoorActionState>
  /** Solo el portero: si su acceso sigue abierto. Se pregunta cuando el servidor rechaza. */
  comprobarAcceso?: () => Promise<boolean>
}

const ACCIONES_DEL_PANEL: DoorActions = {
  recordScans: recordScansAction,
  checkInByGroup: checkInByGroupAction,
  adjust: adjustArrivalAction,
  void: voidArrivalAction,
}

/** Lo que la tarjeta del escaneo necesita de un grupo del manifiesto. */
const vistaDe = (group: DoorManifestGroup) => ({
  id: group.id,
  label: group.label,
  leadName: group.leadName,
  seats: group.seats,
  tableLabel: group.tableLabel,
  people: group.people,
})

const ACCESO_CERRADO = 'Tu acceso a esta puerta se cerró. Pide a quien te sumó un enlace nuevo.'

type Props = {
  eventId: string
  eventSlug: string
  manifest: DoorManifest
  acciones?: DoorActions
  /** Quién y dónde, para la puerta del portero: «XV de Valeria · Puerta 1 · Carlos». */
  cabecera?: string
}

export function DoorMode({ eventId, eventSlug, manifest, acciones = ACCIONES_DEL_PANEL, cabecera }: Props) {
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  /**
   * Una invitación con varias personas por llegar: se elige quién entra ahora. `scanned` es el
   * pase leído; nulo si se llegó desde el buscador por nombre, que registra por el grupo.
   */
  const [eligiendo, setEligiendo] = useState<{ group: DoorManifestGroup; scanned: string | null } | null>(null)
  /** Lo que registró el último escaneo por persona, para poder deshacerlo. */
  const ultimoPorPersona = useRef<{ scanId: string; groupId: string; personIds: readonly string[] } | null>(null)
  const [arrivals, setArrivals] = useState<readonly ResolvedArrival[]>(manifest.arrivals)
  // Cuando llega un estado nuevo del servidor —otra puerta registró (en vivo) o se recargó—, se
  // adopta sin perder lo registrado aquí sin red que todavía no subió.
  const manifestoVisto = useRef(manifest.arrivals)
  useEffect(() => {
    if (manifestoVisto.current === manifest.arrivals) return
    manifestoVisto.current = manifest.arrivals
    setArrivals((locales) => unirLlegadas(manifest.arrivals, locales))
  }, [manifest.arrivals])
  /**
   * Lo que el servidor rechazó después de que la pantalla ya se hubiera corregido. A la
   * puerta no se la hace esperar, así que el contador de arriba puede quedarse diciendo
   * una cosa y la base otra: eso hay que cantarlo en el momento, no al cerrar el salón.
   */
  const [desajuste, setDesajuste] = useState<string | null>(null)
  const [cameraMessage, setCameraMessage] = useState('Encendiendo la cámara…')
  const [pending, setPending] = useState(0)
  const outboxRef = useRef<Promise<Outbox | null> | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastRef = useRef<{ code: string; at: number }>({ code: '', at: 0 })
  const typedRef = useRef<{ buffer: string; at: number }>({ buffer: '', at: 0 })
  // La cámara no puede reiniciarse cada vez que aparece una tarjeta: el bucle lee estas
  // banderas por referencia en vez de por dependencia del efecto.
  const busyRef = useRef(false)
  useEffect(() => {
    busyRef.current = outcome !== null || sheetOpen || eligiendo !== null
  }, [outcome, sheetOpen, eligiendo])

  const arrivedIds = useMemo(() => new Set(arrivals.map((a) => a.guestGroupId)), [arrivals])
  const tally = useMemo(
    () =>
      doorTally(
        manifest.groups.map((g) => ({
          id: g.id,
          label: g.label,
          seats: g.seats,
          attending: g.attending,
          revoked: g.revoked,
        })),
        arrivals,
      ),
    [manifest.groups, arrivals],
  )

  const apply = useCallback((result: ScanOutcome) => {
    setOutcome(result)
    if (result.kind !== 'welcome') return
    setArrivals((prev) => [
      ...prev.filter((a) => a.guestGroupId !== result.group.id),
      {
        guestGroupId: result.group.id,
        arrivedAt: prev.find((a) => a.guestGroupId === result.group.id)?.arrivedAt ?? new Date(),
        arrivedCount: result.arrivedCount,
        scanCount: 1,
        personas: result.personas,
      },
    ])
  }, [])

  /** Quién de esta invitación está ya dentro, según lo que sabe el dispositivo. */
  const dentroDe = useCallback(
    (groupId: string): Readonly<Record<string, Date>> => arrivals.find((a) => a.guestGroupId === groupId)?.personas ?? {},
    [arrivals],
  )

  /**
   * Se guarda la promesa, no la bandeja ya abierta: abrir IndexedDB tarda, y el primer
   * escaneo puede llegar antes de que termine. Con una referencia a la bandeja abierta
   * ese escaneo se caía por el hueco y no llegaba a la cola.
   *
   * Sin IndexedDB —navegación privada, almacenamiento bloqueado— devuelve `null` y la
   * puerta sigue registrando contra el servidor: pierde el aguante sin red, no la
   * función.
   */
  const getOutbox = useCallback((): Promise<Outbox | null> => {
    outboxRef.current ??= openOutbox().catch(() => null)
    return outboxRef.current
  }, [])

  useEffect(() => {
    void getOutbox().then(async (box) => {
      if (box) setPending(await box.count())
    })
  }, [getOutbox])

  /**
   * Sube lo acumulado. Se llama al registrar, al volver la red y al volver a primer plano:
   * **nunca por reloj** (nada de reintentos cada N segundos que llamen al servidor). Un fallo
   * deja el lote donde está y sube con el siguiente de esos momentos: nada se pierde.
   */
  const flush = useCallback(async () => {
    const box = await getOutbox()
    if (!box) return
    const batch = await box.all()
    if (batch.length === 0) return

    try {
      const outcomes = await acciones.recordScans({
        eventId,
        eventSlug,
        scans: batch.map((scan) => ({
          scanId: scan.scanId,
          scanned: scan.scanned,
          arrivedCount: scan.arrivedCount,
          scannedAtMs: scan.scannedAtMs,
          personIds: scan.personIds ?? null,
        })),
      })
      await box.drop(outcomes.map((o) => o.scanId))
    } catch {
      await box.bumpTries(batch.map((s) => s.scanId))
      if (acciones.comprobarAcceso && !(await acciones.comprobarAcceso())) setDesajuste(ACCESO_CERRADO)
    }
    setPending(await box.count())
  }, [acciones, eventId, eventSlug, getOutbox])

  useEffect(() => {
    const onOnline = () => void flush()
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onOnline)
    return () => {
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onOnline)
    }
  }, [flush])

  const submit = useCallback(
    async (scanned: string) => {
      // Un QR que solo lleva el código corto del pase (`K7P3X`): el del panel para invitaciones
      // sin enlace guardado. Se registra por la invitación, como buscar por nombre.
      const corto = scanned.replace(/[\s-]/g, '').toUpperCase()
      const porCodigo = manifest.groups.find((g) => g.passCode !== undefined && g.passCode !== null && g.passCode === corto)
      if (porCodigo !== undefined) {
        elegirGrupo(porCodigo.id)
        return
      }
      // La pantalla responde con lo que decide el dispositivo, no con lo que diga la
      // red: en un salón sin wifi la puerta no puede quedarse esperando a un servidor.
      const local = await resolveLocally(scanned, manifest.groups, arrivedIds)
      const scanId = crypto.randomUUID()

      if (local.kind === 'unknown' || !local.group) {
        setOutcome({ scanId, kind: 'unknown' })
        return
      }

      // Con personas, la puerta decide por nombres: nadie por llegar, uno solo —entra de un
      // escaneo, como siempre— o varios, y entonces se elige quién entra ahora.
      if (local.group.people.length > 0) {
        const dentro = dentroDe(local.group.id)
        const porLlegar = local.group.people.filter((p) => dentro[p.id] === undefined)
        if (porLlegar.length === 0) {
          const primera = Object.values(dentro).sort((a, b) => a.getTime() - b.getTime())[0] ?? new Date()
          setOutcome({ scanId, kind: 'already', group: vistaDe(local.group), arrivedAt: primera, arrivedCount: Object.keys(dentro).length, personas: dentro })
          return
        }
        if (porLlegar.length === 1) {
          await registrarPersonas(local.group, scanned, [porLlegar[0]!.id])
          return
        }
        setEligiendo({ group: local.group, scanned })
        return
      }

      const group = vistaDe(local.group)
      const arrivedCount = local.arrivedCount ?? 1

      if (local.kind === 'already') {
        setOutcome({ scanId, kind: 'already', group, arrivedAt: new Date(), arrivedCount, personas: {} })
      } else {
        apply({ scanId, kind: 'welcome', group, arrivedCount, personas: {} })
      }

      // **También cuando ya había ingresado**, y esa es la corrección: en una boda la
      // familia llega partida y el segundo escaneo es el de los que faltaban. Antes este
      // camino salía sin encolar nada, así que el ajuste posterior no tenía fila que
      // ajustar y los que llegaron tarde no se registraban nunca.
      const box = await getOutbox()
      if (box) {
        await box.push({ scanId, scanned, arrivedCount, scannedAtMs: Date.now(), tries: 0 })
        setPending(await box.count())
      }
      void flush()
    },
    // `registrarPersonas` se declara debajo y se usa por referencia estable: no cambia entre pintados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [manifest.groups, arrivedIds, apply, flush, getOutbox, dentroDe],
  )

  /**
   * Registra a personas concretas de una invitación. La pantalla responde en el acto y el
   * escaneo va a la bandeja de salida con sus nombres: sin red, la puerta sigue sabiendo quién
   * entró. Desde el buscador (`scanned` nulo) se registra por el grupo, con red.
   */
  async function registrarPersonas(group: DoorManifestGroup, scanned: string | null, personIds: readonly string[]) {
    setEligiendo(null)
    const scanId = crypto.randomUUID()
    const ahora = new Date()
    const personas = { ...dentroDe(group.id) }
    for (const id of personIds) personas[id] ??= ahora
    ultimoPorPersona.current = { scanId, groupId: group.id, personIds }
    apply({ scanId, kind: 'welcome', group: vistaDe(group), arrivedCount: Object.keys(personas).length, personas })

    if (scanned === null) {
      void acciones
        .checkInByGroup({ eventId, eventSlug, groupId: group.id, scanId, arrivedCount: null, scannedAtMs: ahora.getTime(), personIds })
        .catch(async () => {
          if (acciones.comprobarAcceso && !(await acciones.comprobarAcceso())) setDesajuste(ACCESO_CERRADO)
          else setDesajuste('No se pudo registrar la llegada. Vuelve a intentarlo.')
        })
      return
    }

    const box = await getOutbox()
    if (box) {
      await box.push({ scanId, scanned, arrivedCount: personIds.length, scannedAtMs: ahora.getTime(), tries: 0, personIds })
      setPending(await box.count())
      void flush()
    } else {
      void acciones.recordScans({
        eventId,
        eventSlug,
        scans: [{ scanId, scanned, arrivedCount: personIds.length, scannedAtMs: ahora.getTime(), personIds }],
      })
    }
  }

  const onCode = useCallback(
    (raw: string) => {
      const now = Date.now()
      if (raw === lastRef.current.code && now - lastRef.current.at < GRACE_MS) return
      lastRef.current = { code: raw, at: now }
      void submit(raw)
    },
    [submit],
  )

  // Un lector de códigos por USB o Bluetooth se comporta como un teclado: teclea el
  // código de golpe y remata con Enter. Aquí no hay campo donde escribir.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (busyRef.current) return
      if (e.key === 'Enter') {
        const code = typedRef.current.buffer
        typedRef.current.buffer = ''
        if (code) onCode(code)
        return
      }
      if (e.key.length !== 1) return
      if (Date.now() - typedRef.current.at > 1200) typedRef.current.buffer = ''
      typedRef.current.at = Date.now()
      typedRef.current.buffer = (typedRef.current.buffer + e.key).slice(-64)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCode])

  useEffect(() => {
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    const start = async () => {
      if (!window.isSecureContext) {
        setCameraMessage('La cámara necesita HTTPS o localhost. Busca al invitado por su nombre.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
      } catch {
        setCameraMessage('No se pudo abrir la cámara. Busca al invitado por su nombre.')
        return
      }
      const video = videoRef.current
      if (!video || stopped) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      video.srcObject = stream
      await video.play().catch(() => {})

      setCameraMessage('')

      // `BarcodeDetector` es nativo y mucho más rápido donde existe —Android y
      // ChromeOS—, pero no está en Safari ni en el Chromium de Playwright. jsQR sobre
      // un canvas es el respaldo: más lento, pero el mismo QR y en todas partes.
      const Detector = window.BarcodeDetector
      const detector = Detector ? new Detector({ formats: ['qr_code'] }) : null

      const readWithJsQr = (): string | null => {
        const canvas = (canvasRef.current ??= document.createElement('canvas'))
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context || video.videoWidth === 0) return null
        // Se reduce el lado largo: jsQR recorre cada píxel y a resolución de cámara
        // completa no cabe en la ventana de 110 ms.
        const scale = Math.min(1, 640 / video.videoWidth)
        canvas.width = Math.round(video.videoWidth * scale)
        canvas.height = Math.round(video.videoHeight * scale)
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const frame = context.getImageData(0, 0, canvas.width, canvas.height)
        return jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' })?.data ?? null
      }

      const tick = async () => {
        if (stopped) return
        timer = setTimeout(() => void tick(), SCAN_MS)
        if (busyRef.current || video.readyState !== video.HAVE_ENOUGH_DATA) return
        if (detector) {
          const codes = await detector.detect(video).catch(() => [])
          const first = codes[0]
          if (first?.rawValue) onCode(first.rawValue)
          return
        }
        const found = readWithJsQr()
        if (found) onCode(found)
      }
      void tick()
    }

    void start()
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onCode])

  /** Registrar a una invitación elegida sin escanear: por nombre o por el código corto del pase. */
  function elegirGrupo(groupId: string) {
          const elegido = manifest.groups.find((g) => g.id === groupId)
          if (elegido !== undefined && elegido.people.length > 0) {
            const dentro = dentroDe(elegido.id)
            const porLlegar = elegido.people.filter((p) => dentro[p.id] === undefined)
            if (porLlegar.length === 0) {
              setOutcome({ scanId: crypto.randomUUID(), kind: 'already', group: vistaDe(elegido), arrivedAt: new Date(), arrivedCount: Object.keys(dentro).length, personas: dentro })
            } else if (porLlegar.length === 1) {
              void registrarPersonas(elegido, null, [porLlegar[0]!.id])
            } else {
              setEligiendo({ group: elegido, scanned: null })
            }
            return
          }
          void acciones
            .checkInByGroup({
              eventId,
              eventSlug,
              groupId,
              scanId: crypto.randomUUID(),
              arrivedCount: null,
              scannedAtMs: Date.now(),
            })
            .then(apply)
            .catch(async () => {
              if (acciones.comprobarAcceso && !(await acciones.comprobarAcceso())) setDesajuste(ACCESO_CERRADO)
              else setDesajuste('No se pudo registrar la llegada. Vuelve a intentarlo.')
            })
          }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      <video ref={videoRef} playsInline muted className="absolute inset-0 size-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/80 via-black/15 to-black/85" />

      {cabecera ? (
        <p className="relative z-10 truncate px-4 pt-3 font-mono text-[10px] tracking-[0.2em] text-white/70 uppercase">{cabecera}</p>
      ) : null}
      <header className="relative z-10 flex items-center gap-3 p-4 text-white">
        <span className="font-mono text-[11px] tracking-[var(--tracking-luxe)]">
          <b aria-label="Invitaciones que han llegado" className="font-mono text-[19px] font-semibold">
            {tally.arrivedGroups}
          </b>{' '}
          <span className="opacity-55">
            de {tally.expectedGroups} · {tally.headsInside} dentro
          </span>
        </span>
        {pending > 0 ? (
          <span
            aria-label="Escaneos por subir"
            className="ml-auto rounded-full bg-warn px-3 py-1 font-mono text-[10px]"
          >
            {pending} por subir
          </span>
        ) : (
          // Cero pendientes es la señal de que se puede cerrar la puerta y guardar el
          // teléfono. Se anuncia siempre, aunque no ocupe sitio en pantalla.
          <span aria-label="Escaneos por subir" className="sr-only">
            0
          </span>
        )}
      </header>

      {desajuste === null ? null : (
        <div className="relative z-10 px-4">
          <p className="rounded-[14px] bg-danger px-4 py-3 font-mono text-[11px] text-white" role="alert">
            {desajuste}{' '}
            <button className="underline" onClick={() => setDesajuste(null)} type="button">
              Entendido
            </button>
          </p>
        </div>
      )}

      <div className="relative z-10 flex flex-1 items-center justify-center">
        {cameraMessage ? <p className="max-w-80 text-center text-[13px] text-white/70">{cameraMessage}</p> : null}
      </div>

      {outcome ? null : (
        <div className="relative z-10 flex gap-2.5 p-4">
          {/* El código a mano: para el invitado que llega con el teléfono muerto y lee
              el código en voz alta. Confirma antes de registrar, al revés que la cámara. */}
          <button
            type="button"
            onClick={() => setManualOpen(true)}
            className="flex-1 rounded-full border border-white/30 bg-black/40 px-4 py-4 font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] text-white"
          >
            ⌨ Código manual
          </button>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex-1 rounded-full border border-white/30 bg-black/40 px-4 py-4 font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] text-white"
          >
            ⌕ Buscar por nombre
          </button>
        </div>
      )}

      {manualOpen ? (
        <ManualPassDialog
          arrivedIds={arrivedIds}
          groups={manifest.groups}
          onClose={() => setManualOpen(false)}
          onConfirm={(scanned) => {
            setManualOpen(false)
            void submit(scanned)
          }}
          onConfirmGrupo={(groupId) => {
            setManualOpen(false)
            elegirGrupo(groupId)
          }}
        />
      ) : null}

      {eligiendo === null ? null : (
        <EligePersonas
          dentro={dentroDe(eligiendo.group.id)}
          group={eligiendo.group}
          onCancelar={() => setEligiendo(null)}
          onRegistrar={(personIds) => void registrarPersonas(eligiendo.group, eligiendo.scanned, personIds)}
        />
      )}

      {outcome ? (
        <ScanResultCard
          outcome={outcome}
          onAdjust={(scanId, arrivedCount) => {
            setOutcome((prev) => (prev && prev.kind !== 'unknown' ? { ...prev, arrivedCount } : prev))
            setArrivals((prev) =>
              prev.map((a) =>
                outcome.kind !== 'unknown' && a.guestGroupId === outcome.group.id ? { ...a, arrivedCount } : a,
              ),
            )
            void acciones.adjust({ eventId, scanId, arrivedCount, eventSlug }).then((r) => {
              if (r.status === 'error') setDesajuste('No se pudo corregir la cantidad. El contador de arriba no es el del servidor.')
            })
          }}
          onUndo={(scanId) => {
            // Deshacer retira al grupo del contador, no reinicia la lista entera: en la
            // puerta ya hay otras llegadas dentro y borrarlas sería peor que el error.
            if (outcome.kind !== 'unknown') {
              const groupId = outcome.group.id
              const ultimo = ultimoPorPersona.current
              if (ultimo !== null && ultimo.scanId === scanId) {
                // Por persona se retira solo a quienes entraron en este escaneo: su pareja sigue dentro.
                setArrivals((prev) =>
                  prev.flatMap((a) => {
                    if (a.guestGroupId !== groupId) return [a]
                    const personas = Object.fromEntries(Object.entries(a.personas).filter(([id]) => !ultimo.personIds.includes(id)))
                    const quedan = Object.keys(personas).length
                    return quedan === 0 ? [] : [{ ...a, personas, arrivedCount: quedan }]
                  }),
                )
              } else {
                setArrivals((prev) => prev.filter((a) => a.guestGroupId !== groupId))
              }
            }
            setOutcome(null)
            void acciones.void({ eventId, scanId, eventSlug }).then((r) => {
              if (r.status === 'error') setDesajuste('No se pudo deshacer la llegada. Sigue registrada en el servidor.')
            })
          }}
          onDismiss={() => {
            lastRef.current = { code: lastRef.current.code, at: Date.now() }
            setOutcome(null)
          }}
        />
      ) : null}

      <DoorSearchSheet
        groups={manifest.groups}
        arrivedIds={arrivedIds}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onPick={(groupId) => {
          setSheetOpen(false)
          elegirGrupo(groupId)
        }}
      />
    </div>
  )
}
