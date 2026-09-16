import Link from 'next/link'

/**
 * El 404 de Next trae su propio estilo para modo oscuro: letra blanca sobre el fondo crema del
 * panel, una página que parece en blanco. Este se lee en los dos modos.
 */
export default function NoEncontrado() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-[480px] flex-col items-center justify-center gap-4 p-10 text-center">
      <h1 className="font-display text-[28px] font-light text-ink">Esta página no está disponible</h1>
      <p className="text-[14px] leading-relaxed text-ink-mute">No existe o tu cuenta no tiene acceso a ella.</p>
      <Link className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute underline underline-offset-4" href="/panel">
        Volver al panel
      </Link>
    </section>
  )
}
