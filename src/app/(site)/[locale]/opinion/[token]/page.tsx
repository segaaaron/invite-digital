import { notFound } from 'next/navigation'
import { leerEncuesta } from '@/app/composition/container'
import { FormularioDeOpinion } from '@/modules/admin/ui/FormularioDeOpinion'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'

export const dynamic = 'force-dynamic'

/** Es de una persona: no se indexa. El título, «Tu opinión» en el idioma de la página. */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = parseLocaleParam((await params).locale)
  return { title: locale ? getDictionary(locale).opinion.kicker : undefined, robots: { index: false, follow: false } }
}

/**
 * **La opinión del cliente tras su evento**: le llega por correo unos días después. Estrellas, un
 * comentario y si nos deja publicarla. Sin sesión: el enlace es la llave, y uno desconocido es 404.
 */
export default async function OpinionPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale: crudo, token } = await params
  const locale = parseLocaleParam(crudo)
  if (!locale) notFound()
  const encuesta = await leerEncuesta(token)
  if (encuesta === null) notFound()
  const t = getDictionary(locale).opinion

  return (
    <main className="mx-auto flex w-full max-w-[600px] flex-col gap-6 px-6 pt-32 pb-20">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">{t.kicker}</p>
        <h1 className="font-display text-[34px] leading-tight font-light text-ink">{t.title.replace('{evento}', encuesta.eventTitle)}</h1>
        {encuesta.respondida ? null : <p className="text-[14px] leading-relaxed text-ink-soft">{t.intro}</p>}
      </header>
      {encuesta.respondida ? (
        <section className="rounded-[18px] border border-line bg-bg-top/60 p-6">
          <p className="font-display text-[22px] text-ink">{t.answeredTitle}</p>
          <p className="mt-1 text-[14px] text-ink-soft">{t.answeredText}</p>
        </section>
      ) : (
        <FormularioDeOpinion textos={t} token={token} />
      )}
    </main>
  )
}
