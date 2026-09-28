import { PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import type { Aviso } from '../domain/hoy'

/**
 * Las piezas de «Hoy». Sin estado y sin acciones: todo lo que se hace desde aquí se hace
 * en la pantalla a la que lleva cada enlace, que es donde ya vive la lógica.
 */

/** Cuántos avisos se enseñan por grupo antes de plegar el resto. */
const TOPE = 5

function FilaAviso({ aviso }: { aviso: Aviso }) {
  return (
    <li className="flex flex-col gap-2 border-t border-line-panel py-3.5 min-[560px]:flex-row min-[560px]:items-center min-[560px]:gap-4">
      <span className="w-[118px] shrink-0">
        <Pill tone={aviso.tono}>{aviso.etiqueta}</Pill>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] text-ink">{aviso.titulo}</span>
        <span className="text-[12px] text-ink-mute">{aviso.detalle}</span>
      </span>
      <PanelButton className="self-start min-[560px]:self-auto" href={aviso.href}>
        {aviso.accion}
      </PanelButton>
    </li>
  )
}

/**
 * Un grupo de avisos. Los que pasan del tope **se despliegan aquí mismo**, no con un
 * enlace: un grupo mezcla clases —comprobantes y cambios de plan, accesos y pedidos sin
 * pago— y ningún enlace a una sola bandeja lleva a todos. La primera versión mandaba «Y N
 * más» a las consultas aunque lo escondido fueran pedidos, y en «Bodas en riesgo», sin
 * enlace, escondía la sexta boda sin decirlo.
 */
export function AvisoGrupo({ titulo, avisos, vacio }: { titulo: string; avisos: readonly Aviso[]; vacio: string }) {
  const visibles = avisos.slice(0, TOPE)
  const resto = avisos.slice(TOPE)

  return (
    <section className="flex flex-col">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h3 className="font-mono text-[10px] tracking-[0.16em] text-ink-mute uppercase">{titulo}</h3>
        <span className="font-mono text-[10px] text-ink-mute [font-variant-numeric:lining-nums]">{avisos.length}</span>
      </div>

      {avisos.length === 0 ? (
        <p className="border-t border-line-panel py-3.5 text-[13px] text-ink-mute">{vacio}</p>
      ) : (
        <ul className="flex flex-col">
          {visibles.map((aviso) => (
            <FilaAviso key={aviso.clave} aviso={aviso} />
          ))}
        </ul>
      )}

      {resto.length > 0 ? (
        <details className="group">
          <summary className="cursor-pointer list-none border-t border-line-panel pt-3 font-mono text-[10px] tracking-[0.25em] text-ink-soft uppercase hover:text-ink">
            <span className="group-open:hidden">Ver {resto.length} más</span>
            <span className="hidden group-open:inline">Ver menos</span>
          </summary>
          <ul className="flex flex-col">
            {resto.map((aviso) => (
              <FilaAviso key={aviso.clave} aviso={aviso} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  )
}
