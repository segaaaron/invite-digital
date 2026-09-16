export type PendingScan = {
  readonly scanId: string
  readonly scanned: string
  readonly arrivedCount: number
  readonly scannedAtMs: number
  readonly tries: number
  /** Quiénes entraron, cuando la invitación tiene personas. */
  readonly personIds?: readonly string[] | null
}

export type Outbox = {
  push(scan: PendingScan): Promise<void>
  all(): Promise<PendingScan[]>
  drop(scanIds: readonly string[]): Promise<void>
  bumpTries(scanIds: readonly string[]): Promise<void>
  count(): Promise<number>
}

type StoredScan = PendingScan & { seq: number }

const DB_NAME = 'invite-door'
const STORE = 'outbox'
const VERSION = 1

const request = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

const finished = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })

const open = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'scanId' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

/**
 * El escaneo se escribe aquí ANTES de intentar subirlo, y la pantalla responde de
 * inmediato. Un salón sin wifi no puede dejar a la puerta esperando a un servidor, y un
 * escaneo perdido es un invitado que se queda fuera.
 *
 * El número de orden se calcula a partir de lo ya guardado y no de un contador en
 * memoria: recargar la página reiniciaría ese contador y la corrección de una cantidad
 * podría adelantar al registro que la produjo.
 */
export async function openOutbox(): Promise<Outbox> {
  const db = await open()

  const readAll = async (): Promise<StoredScan[]> => {
    const tx = db.transaction(STORE, 'readonly')
    const rows = await request(tx.objectStore(STORE).getAll() as IDBRequest<StoredScan[]>)
    return rows.sort((a, b) => a.seq - b.seq)
  }

  const write = async (run: (store: IDBObjectStore) => void): Promise<void> => {
    const tx = db.transaction(STORE, 'readwrite')
    run(tx.objectStore(STORE))
    await finished(tx)
  }

  return {
    async push(scan) {
      const rows = await readAll()
      if (rows.some((r) => r.scanId === scan.scanId)) return
      const seq = rows.reduce((max, r) => Math.max(max, r.seq), 0) + 1
      await write((store) => store.put({ ...scan, seq }))
    },
    async all() {
      // Se copia campo a campo en vez de descartar `seq` con un resto: la variable
      // sobrante que eso deja es justo lo que el lint señala.
      return (await readAll()).map((row) => ({
        scanId: row.scanId,
        scanned: row.scanned,
        arrivedCount: row.arrivedCount,
        scannedAtMs: row.scannedAtMs,
        tries: row.tries,
        personIds: row.personIds ?? null,
      }))
    },
    async drop(scanIds) {
      await write((store) => {
        for (const id of scanIds) store.delete(id)
      })
    },
    async bumpTries(scanIds) {
      const rows = await readAll()
      const wanted = new Set(scanIds)
      await write((store) => {
        for (const row of rows) {
          if (wanted.has(row.scanId)) store.put({ ...row, tries: row.tries + 1 })
        }
      })
    },
    async count() {
      const tx = db.transaction(STORE, 'readonly')
      return request(tx.objectStore(STORE).count())
    },
  }
}
