import Link from 'next/link'
import { tr } from '@/shared/i18n/idioma-servidor'

/**
 * El 404 de Next trae su propio estilo para modo oscuro: letra blanca sobre el fondo crema del
 * panel, una página que parece en blanco. Este se lee en los dos modos.
 *
 * Lleva su propio `<title>`: sin él la pestaña decía el de la página denegada («Hoy ·
 * Administración») y confirmaba que esa ruta existe, justo lo que el 404 quiere callar.
 */
export default async function NoEncontrado() {
  const t = await tr()
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-[480px] flex-col items-center justify-center gap-4 p-10 text-center">
      <title>{t('Página no disponible · Luxury Atelier', 'Page not available · Luxury Atelier')}</title>
      <h1 className="font-display text-[28px] font-light text-ink">{t('Esta página no está disponible', 'This page is not available')}</h1>
      <p className="text-[14px] leading-relaxed text-ink-mute">{t('No existe o tu cuenta no tiene acceso a ella.', 'It doesn’t exist or your account doesn’t have access to it.')}</p>
      <Link className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute underline underline-offset-4" href="/panel">
        {t('Volver al panel', 'Back to the panel')}
      </Link>
    </section>
  )
}
