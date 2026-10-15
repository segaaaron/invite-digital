import Link from 'next/link'
import { enIngles } from '@/shared/i18n/en-ingles'
import { T } from '@/shared/i18n/idioma-navegador'

/**
 * Lo que se ve en lugar de una sección que el plan del evento no incluye. Dice qué plan
 * sí la trae y lleva a solicitarlo: una puerta cerrada sin indicación de por dónde se
 * pasa solo deja al atelier mirando una pantalla vacía.
 *
 * Esto es la cortesía, no la protección. Quien no vea esta pantalla porque llamó a la
 * acción a mano se encuentra el mismo corte en el servidor.
 */
export type Mejorar = { href: string; label: string } | null

/**
 * `mejorar` lo decide la página según quién mira: el atelier va a «Plan», el anfitrión a
 * «Extras». Quien no puede comprar no recibe enlace: «Plan» le da 404.
 */
/**
 * Lo que dice cuando el plan no trae algo: el motivo y el título llegan en español (del dominio o de la página) y
 * salen en el idioma de quien mira. Con `<T>` y no con `tr()`: el índice de `plans` lo exporta y un componente del
 * navegador que importe ese índice arrastraría `next/headers` (rompía el build).
 */
export function FeatureLocked({ title, reason, eventSlug, mejorar }: { title: string; reason: string; eventSlug: string; mejorar: Mejorar }) {
  return (
    <section className="mx-auto flex max-w-[640px] flex-col items-start gap-5 rounded-[18px] border border-line p-10">
      <h1 className="font-display text-[24px] font-light text-ink"><T en={enIngles(title) ?? title} es={title} /></h1>
      <p className="text-[14px] leading-relaxed text-ink-mute"><T en={enIngles(reason) ?? reason} es={reason} /></p>
      {mejorar === null ? <p className="text-[14px] leading-relaxed text-ink-mute"><T en="To add it, talk to whoever organizes your event." es="Para sumarla, habla con quien organiza tu evento." /></p> : null}
      <div className="flex items-center gap-4">
        {mejorar === null ? null : (
          <Link
            className="cursor-pointer rounded-[var(--radius-pill)] border border-shell-deep bg-linear-to-b from-shell to-shell-deep inline-flex min-h-11 items-center px-4.5 py-2.5 font-mono text-[10px] tracking-[0.25em] text-white uppercase transition-all duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
            href={mejorar.href}
          >
            {mejorar.label}
          </Link>
        )}
        <Link className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute" href={`/panel/eventos/${eventSlug}`}>
          <T en="Back to the event" es="Volver al evento" />
        </Link>
      </div>
    </section>
  )
}
