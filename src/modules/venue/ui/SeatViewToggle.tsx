import Link from 'next/link'

/**
 * El conmutador de la maqueta entre el plano del salón y las tarjetas de mesa.
 *
 * Vive en la URL y no en estado del cliente por dos razones: en la maqueta está **arriba**
 * —junto al buscador— y lo que gobierna está al final de la página, así que el estado
 * tiene que ser de la página y no del componente; y cada alta revalida el árbol, lo que
 * perdería un `useState` justo después de crear una mesa.
 */
export function SeatViewToggle({ base, current }: { base: string; current: 'mapa' | 'tarjetas' }) {
  const chip = (clave: 'mapa' | 'tarjetas', texto: string) => (
    <Link
      aria-current={current === clave ? 'page' : undefined}
      className={`rounded-[var(--radius-pill)] border px-3.5 py-2 font-mono text-[10px] tracking-[0.25em] whitespace-nowrap uppercase transition-colors ${
        current === clave ? 'border-ink bg-ink text-white' : 'border-line-panel-strong bg-white text-ink hover:border-ink'
      }`}
      href={clave === 'mapa' ? base : `${base}?vista=tarjetas`}
    >
      {texto}
    </Link>
  )

  return (
    <div className="flex flex-wrap gap-2.5">
      {chip('mapa', 'Vista de mapa')}
      {chip('tarjetas', 'Vista de tarjetas')}
    </div>
  )
}
