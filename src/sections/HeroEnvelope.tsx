/**
 * Editorial CSS-only stand-in for the hero's 3D slot. Task 11 will replace this
 * with a WebGL canvas passed through the `slot` prop; until then this renders a
 * dignified envelope-and-seal composition instead of an empty rectangle.
 */
export function HeroEnvelope() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto flex h-full min-h-[420px] w-full max-w-[420px] items-center justify-center"
    >
      <div className="absolute inset-6 rounded-[32px] bg-[radial-gradient(circle_at_30%_20%,rgb(var(--color-gold-rgb)/0.24),transparent_60%)] blur-2xl" />
      <div className="relative aspect-[5/7] w-full max-w-[300px] overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-gradient-to-br from-bg-raised via-bg to-bg-sunken shadow-[var(--shadow-lift)]">
        <div className="absolute inset-3 rounded-[16px] border border-[var(--color-line)]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8 text-center">
          <span className="text-[10px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep">Alta costura</span>
          <span className="font-display text-[30px] italic text-ink">L &amp; M</span>
          <span className="h-px w-14 bg-gold/60" />
          <span className="text-[11px] uppercase tracking-[0.24em] text-ink-mute">17 · 10 · 2026</span>
        </div>
        <span className="absolute -top-3 left-1/2 h-16 w-9 -translate-x-1/2 rounded-b-full bg-gradient-to-b from-gold-light via-gold to-gold-deep shadow-[var(--shadow-float)]" />
      </div>
    </div>
  )
}
