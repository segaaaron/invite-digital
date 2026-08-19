/**
 * CSS-only phone mockup showing an editorial treatment of an opened invitation.
 * No WebGL, no external image assets — pure token-driven composition.
 */
export function MobilePhoneMockup() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[280px]">
      <div className="relative overflow-hidden rounded-[42px] border border-[var(--color-line)] bg-ink p-3 shadow-[var(--shadow-lift)]">
        <div className="absolute left-1/2 top-3 h-1.5 w-16 -translate-x-1/2 rounded-full bg-bg-sunken/40" />
        <div className="relative aspect-[9/19] overflow-hidden rounded-[30px] bg-gradient-to-br from-bg-raised via-bg to-bg-sunken">
          <div className="absolute inset-4 flex flex-col items-center justify-center gap-4 rounded-[20px] border border-[var(--color-line)] bg-bg-raised/80 px-6 text-center backdrop-blur-sm">
            <span className="text-[9px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep">Boda</span>
            <span className="font-display text-[24px] italic text-ink">Monograma en foil</span>
            <span className="h-px w-10 bg-gold/60" />
            <span className="text-[10px] uppercase tracking-[0.22em] text-ink-mute">17 · 10 · 2026</span>
            <span className="mt-2 rounded-full border border-[var(--color-line)] px-4 py-2 text-[9px] uppercase tracking-[0.2em] text-gold-deep">Confirmar</span>
          </div>
        </div>
      </div>
    </div>
  )
}
