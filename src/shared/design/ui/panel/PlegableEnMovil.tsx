'use client'

import { useId, useSyncExternalStore, type ReactNode } from 'react'
import { ChevronIcon } from '@/shared/design/ui/icons'

/**
 * **Lo que en el celular y la tableta en vertical va plegado, y desde 860 px abierto** (6 de octubre).
 *
 * El inicio del evento apilaba trece bloques en el teléfono —4.279 px— y lo del día a día quedaba
 * enterrado bajo gráficos. Lo que se mira de vez en cuando (estadísticas, invitados recientes, mesas)
 * va aquí: una fila que se toca para abrir.
 *
 * **Lo decide el ancho, no el aparato** (7 de octubre): antes era el agente del navegador, y un iPad —que
 * se presenta como Mac— lo veía todo desplegado en vertical. El servidor pinta lo mismo para todos; por
 * debajo de 860 px el CSS lo pliega. Lo que cada quien abre se recuerda en la sesión de la pestaña, para que
 * guardar algo dentro (que vuelve a pintar la página) no lo cierre.
 *
 * Una tarjeta del panel puesta directamente dentro pierde su marco y su título en el celular: el título ya
 * está en la fila que se toca, y una tarjeta dentro de otra sobraba.
 */
export function PlegableEnMovil({
  titulo,
  resumen,
  children,
}: {
  titulo: string
  /** Una línea de lo que hay dentro, para decidir si abrirlo: «88 % respondió · 6 mensajes». */
  resumen?: string | undefined
  children: ReactNode
}) {
  const id = useId()
  const clave = `plegable:${titulo}`
  // Lo abierto vive en la sesión de la pestaña; en el servidor y en el primer pintado, plegado.
  const abierto = useSyncExternalStore(suscribirse, () => leer(clave), () => false)
  const alternar = () => escribir(clave, !abierto)

  return (
    <div className="max-[859px]:mb-4.5 max-[859px]:rounded-[18px] max-[859px]:border max-[859px]:border-line-panel max-[859px]:bg-linear-to-b max-[859px]:from-bg-top max-[859px]:to-white max-[859px]:shadow-card min-[860px]:contents">
      <button
        aria-controls={id}
        aria-expanded={abierto}
        className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-4.5 py-3.5 text-left min-[860px]:hidden"
        onClick={alternar}
        type="button"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[20px] leading-tight text-ink italic">{titulo}</span>
          {resumen === undefined ? null : <span className="mt-0.5 block truncate text-[13px] text-ink-soft">{resumen}</span>}
        </span>
        <ChevronIcon className={`size-5 shrink-0 text-ink-mute transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      <div
        className={`min-[860px]:contents ${
          abierto
            ? 'max-[859px]:flex max-[859px]:flex-col max-[859px]:gap-4.5 max-[859px]:px-2.5 max-[859px]:pb-3 max-[859px]:[&>section]:border-0 max-[859px]:[&>section]:bg-none max-[859px]:[&>section]:p-2 max-[859px]:[&>section]:shadow-none max-[859px]:[&>section>div:first-child>h2]:hidden'
            : 'max-[859px]:hidden'
        }`}
        id={id}
      >
        {children}
      </div>
    </div>
  )
}

const AVISO = 'plegable:cambio'

const suscribirse = (alCambiar: () => void): (() => void) => {
  window.addEventListener(AVISO, alCambiar)
  return () => window.removeEventListener(AVISO, alCambiar)
}

/** Lo abierto en esta pestaña. La sesión del navegador lo guarda además para una recarga; sin ella, basta esto. */
const memoria = new Map<string, boolean>()

const leer = (clave: string): boolean => {
  const recordado = memoria.get(clave)
  if (recordado !== undefined) return recordado
  try {
    return sessionStorage.getItem(clave) === '1'
  } catch {
    return false
  }
}

const escribir = (clave: string, abierto: boolean): void => {
  memoria.set(clave, abierto)
  try {
    sessionStorage.setItem(clave, abierto ? '1' : '0')
  } catch {
    // Sin almacenamiento (ventana privada, bloqueado): queda en memoria hasta recargar.
  }
  window.dispatchEvent(new Event(AVISO))
}
