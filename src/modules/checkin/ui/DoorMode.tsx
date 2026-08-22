'use client'

import jsQR from 'jsqr'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { adjustArrivalAction, checkInByGroupAction, recordScansAction, voidArrivalAction } from '../actions'
import type { ScanOutcome } from '../application/check-in-by-scan'
import type { DoorManifest } from '../application/get-door-manifest'
import type { ResolvedArrival } from '../domain/conflict'
import { doorTally } from '../domain/door-tally'
import { DoorSearchSheet } from './DoorSearchSheet'
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

type Props = { eventId: string; eventSlug: string; manifest: DoorManifest }

export function DoorMode({ eventId, eventSlug, manifest }: Props) {
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [arrivals, setArrivals] = useState<readonly ResolvedArrival[]>(manifest.arrivals)
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
    busyRef.current = outcome !== null || sheetOpen
  }, [outcome, sheetOpen])

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
      ...prev,
      { guestGroupId: result.group.id, arrivedAt: new Date(), arrivedCount: result.arrivedCount, scanCount: 1 },
    ])
  }, [])

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
   * Sube lo acumulado. Se llama al registrar, al volver la red, al volver a primer
   * plano y cada treinta segundos mientras quede algo. Un fallo deja el lote donde
   * está: nada se pierde y nada se descarta.
   */
  const flush = useCallback(async () => {
    const box = await getOutbox()
    if (!box) return
    const batch = await box.all()
    if (batch.length === 0) return

    try {
      const outcomes = await recordScansAction({
        eventId,
        eventSlug,
        scans: batch.map((scan) => ({
          scanId: scan.scanId,
          scanned: scan.scanned,
          arrivedCount: scan.arrivedCount,
          scannedAtMs: scan.scannedAtMs,
        })),
      })
      await box.drop(outcomes.map((o) => o.scanId))
    } catch {
      await box.bumpTries(batch.map((s) => s.scanId))
    }
    setPending(await box.count())
  }, [eventId, eventSlug, getOutbox])

  useEffect(() => {
    const onOnline = () => void flush()
    const timer = setInterval(() => void flush(), 30_000)
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onOnline)
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onOnline)
    }
  }, [flush])

  const submit = useCallback(
    async (scanned: string) => {
      // La pantalla responde con lo que decide el dispositivo, no con lo que diga la
      // red: en un salón sin wifi la puerta no puede quedarse esperando a un servidor.
      const local = await resolveLocally(scanned, manifest.groups, arrivedIds)
      const scanId = crypto.randomUUID()

      if (local.kind === 'unknown' || !local.group) {
        setOutcome({ scanId, kind: 'unknown' })
        return
      }

      const group = {
        id: local.group.id,
        label: local.group.label,
        seats: local.group.seats,
        tableLabel: local.group.tableLabel,
      }
      const arrivedCount = local.arrivedCount ?? 1

      if (local.kind === 'already') {
        setOutcome({ scanId, kind: 'already', group, arrivedAt: new Date(), arrivedCount })
        return
      }

      apply({ scanId, kind: 'welcome', group, arrivedCount })

      const box = await getOutbox()
      if (box) {
        await box.push({ scanId, scanned, arrivedCount, scannedAtMs: Date.now(), tries: 0 })
        setPending(await box.count())
      }
      void flush()
    },
    [manifest.groups, arrivedIds, apply, flush, getOutbox],
  )

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

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      <video ref={videoRef} playsInline muted className="absolute inset-0 size-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/80 via-black/15 to-black/85" />

      <header className="relative z-10 flex items-center gap-3 p-4 text-white">
        <span className="font-mono text-[11px] tracking-[var(--tracking-luxe)]">
          <b aria-label="Grupos que han llegado" className="font-mono text-[19px] font-semibold">
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

      <div className="relative z-10 flex flex-1 items-center justify-center">
        {cameraMessage ? <p className="max-w-80 text-center text-[13px] text-white/70">{cameraMessage}</p> : null}
      </div>

      {outcome ? null : (
        <div className="relative z-10 p-4">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="w-full rounded-full border border-white/30 bg-black/40 px-4 py-4 font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] text-white"
          >
            ⌕ Buscar por nombre
          </button>
        </div>
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
            void adjustArrivalAction({ scanId, arrivedCount, eventSlug })
          }}
          onUndo={(scanId) => {
            // Deshacer retira al grupo del contador, no reinicia la lista entera: en la
            // puerta ya hay otras llegadas dentro y borrarlas sería peor que el error.
            if (outcome.kind !== 'unknown') {
              const groupId = outcome.group.id
              setArrivals((prev) => prev.filter((a) => a.guestGroupId !== groupId))
            }
            setOutcome(null)
            void voidArrivalAction({ scanId, eventSlug })
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
          void checkInByGroupAction({
            eventId,
            eventSlug,
            groupId,
            scanId: crypto.randomUUID(),
            arrivedCount: null,
            scannedAtMs: Date.now(),
          }).then(apply)
        }}
      />
    </div>
  )
}
