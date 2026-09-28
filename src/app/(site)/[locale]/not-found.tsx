import { headers } from 'next/headers'
import { BRAND } from '@/shared/config/brand'
import { PATHNAME_HEADER } from '@/shared/config/headers'
import { Button } from '@/shared/design/ui/Button'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'

/**
 * El 404 de la web, dentro de su layout. Un `not-found` no recibe los parámetros de la ruta: el
 * idioma sale de la dirección que el proxy deja en `x-pathname` (`/es/…`, `/en/…`). Leer la cabecera
 * además lo hace dinámico, que es lo que le da el nonce de la CSP a sus scripts.
 */
export default async function NoEncontrado() {
  const ruta = (await headers()).get(PATHNAME_HEADER) ?? ''
  const locale = parseLocaleParam(ruta.split('/')[1] ?? '') ?? 'es'
  const t = getDictionary(locale).notFound

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-[620px] flex-col items-center justify-center gap-5 px-6 pt-32 pb-20 text-center">
      {/* React lo sube al <head>: un `not-found` no exporta `metadata`. */}
      <title>{`${t.title} · ${BRAND.siteName}`}</title>
      <meta content="noindex" name="robots" />
      <p className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">{t.kicker}</p>
      <h1 className="font-display text-[40px] leading-tight font-light text-ink">{t.title}</h1>
      <p className="max-w-[460px] text-[15px] leading-relaxed text-ink-soft">{t.text}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Button href={`/${locale}`}>{t.home}</Button>
        <Button href={`/${locale}/colecciones`} variant="ghost">
          {t.collections}
        </Button>
      </div>
    </section>
  )
}
