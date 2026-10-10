import { CheckIcon } from '@/shared/design/ui/icons'
import { SectionHeading } from '@/shared/design/ui/SectionHeading'
import type { Dictionary } from '@/shared/i18n/dictionaries'

/**
 * **El panel** que acompaña a la invitación (tareas, presupuesto, mesas, regalos, recepción…). Lo vendían
 * solo las páginas de Bodas y XV; desde el 9 oct también la portada (informe de lanzamiento: «la home no
 * dice qué plan lo incluye»), con el enlace a la tabla, donde cada fila dice qué plan trae qué.
 */
export function HerramientasDelPanel({ dictionary, aLaTabla }: { dictionary: Dictionary; aLaTabla?: string }) {
  const { fiestas } = dictionary
  return (
    <section aria-labelledby="herramientas" className="px-6 py-20" id="panel">
      <div className="mx-auto max-w-[1080px]">
        <SectionHeading eyebrow={fiestas.toolsEyebrow} title={<span id="herramientas">{fiestas.toolsTitle}</span>} />
        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {fiestas.tools.map((herramienta) => (
            <li className="flex flex-col gap-2 rounded-[18px] border border-[var(--color-line)] bg-bg-raised p-6" key={herramienta.title}>
              <span aria-hidden className="grid size-8 place-items-center rounded-full bg-gold/15 text-gold-deep">
                <CheckIcon className="size-4" />
              </span>
              <h3 className="font-display text-[22px] leading-tight text-ink">{herramienta.title}</h3>
              <p className="text-[14px] leading-[1.65] text-ink-soft">{herramienta.body}</p>
            </li>
          ))}
        </ul>
        {aLaTabla ? (
          <p className="mt-10 text-center text-[14.5px] text-ink-soft">
            <a className="text-gold-deep underline decoration-gold/50 underline-offset-4 hover:decoration-gold-deep" href={aLaTabla}>
              {fiestas.toolsPlanes}
            </a>
          </p>
        ) : null}
      </div>
    </section>
  )
}
