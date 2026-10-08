'use client'

import { useRouter } from 'next/navigation'
import type { OpcionDeFiltro } from './lista'

/**
 * El filtro de etapa en el celular: un `<select>` nativo —la rueda del sistema— en vez de un
 * carril de píldoras que se cortaba sin decir que había más. Elegir navega a su dirección.
 */
export function SelectorDeFiltro({ etiqueta, actual, opciones }: { etiqueta: string; actual: string; opciones: readonly OpcionDeFiltro[] }) {
  const router = useRouter()
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-full border border-line-panel-strong bg-white px-3.5 text-[13px] text-ink shadow-card">
      <span className="font-mono text-[9.5px] tracking-[0.18em] text-ink-mute uppercase">{etiqueta}</span>
      <select
        className="min-h-11 min-w-0 flex-1 cursor-pointer bg-transparent pr-1 text-[16px] outline-none min-[860px]:text-[13px]"
        onChange={(e) => {
          const destino = opciones.find((o) => o.key === e.target.value)
          if (destino !== undefined) router.push(destino.href, { scroll: false })
        }}
        value={actual}
      >
        {opciones.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
            {o.count === undefined ? '' : ` (${o.count})`}
          </option>
        ))}
      </select>
    </label>
  )
}
