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
    // Maqueta «Esmeralda y Latón» (M03): el rótulo al lado y el selector como un campo de 46 px.
    <label className="flex items-center gap-3 text-[15px] text-ink">
      <span className="shrink-0">{etiqueta}</span>
      <select
        className="h-12 min-w-0 flex-1 cursor-pointer rounded-[8px] border border-line-panel-strong bg-bg-raised px-3.5 text-[16px] outline-none focus:border-gold"
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
