import type { Embudo } from '../domain/ingresos'

/**
 * El recorrido de la venta en cuatro pasos, con qué parte de cada uno llegó al siguiente.
 * En el celular van de dos en dos; desde 760 px, en fila.
 */
export function EmbudoDeVentas({ embudo }: { embudo: Embudo }) {
  const techo = Math.max(1, ...embudo.pasos.map((p) => p.total))
  return (
    <div className="flex flex-col gap-4">
      <ol className="grid grid-cols-2 gap-3 min-[760px]:grid-cols-4">
        {embudo.pasos.map((paso, i) => (
          <li className="flex flex-col gap-2 rounded-[16px] border border-line-panel bg-white p-4" key={paso.clave}>
            <span className="font-mono text-[9px] tracking-[0.3em] text-ink-mute uppercase">{paso.titulo}</span>
            <span className="font-display text-[32px] leading-none text-ink [font-variant-numeric:lining-nums]">{paso.total}</span>
            <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-line-panel">
              <span className="block h-full rounded-full bg-gold" style={{ width: `${(paso.total / techo) * 100}%` }} />
            </span>
            <span className="text-[12px] text-ink-mute">
              {i === 0 ? 'El punto de partida' : paso.desdeElAnterior === null ? 'Sin datos del paso anterior' : `${paso.desdeElAnterior} % del paso anterior`}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-[12px] leading-[1.6] text-ink-mute">
        Últimos doce meses.{' '}
        {embudo.cierreDeConsultas === null
          ? 'Todavía no hay consultas para medir el cierre.'
          : `De las consultas del formulario, el ${embudo.cierreDeConsultas} % terminó en venta.`}{' '}
        Consultas y pedidos entran por puertas distintas, así que ese primer salto es orientativo.
      </p>
    </div>
  )
}
