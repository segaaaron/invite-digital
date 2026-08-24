import Link from 'next/link'

/**
 * Lo que se ve en lugar de una sección que el plan del evento no incluye. Dice qué plan
 * sí la trae y lleva a solicitarlo: una puerta cerrada sin indicación de por dónde se
 * pasa solo deja al atelier mirando una pantalla vacía.
 *
 * Esto es la cortesía, no la protección. Quien no vea esta pantalla porque llamó a la
 * acción a mano se encuentra el mismo corte en el servidor.
 */
export function FeatureLocked({ title, reason, eventSlug }: { title: string; reason: string; eventSlug: string }) {
  return (
    <section className="mx-auto flex max-w-[640px] flex-col items-start gap-5 rounded-[18px] border border-line p-10">
      <h1 className="font-display text-[24px] font-light text-ink">{title}</h1>
      <p className="text-[14px] leading-relaxed text-ink-mute">{reason}</p>
      <div className="flex items-center gap-4">
        <Link
          className="cursor-pointer rounded-[var(--radius-pill)] border border-shell-deep bg-linear-to-b from-shell to-shell-deep px-4.5 py-2.5 font-mono text-[10px] tracking-[0.25em] text-white uppercase transition-all duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
          href={`/panel/eventos/${eventSlug}/plan`}
        >
          Ver planes
        </Link>
        <Link className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute" href={`/panel/eventos/${eventSlug}`}>
          Volver al evento
        </Link>
      </div>
    </section>
  )
}
