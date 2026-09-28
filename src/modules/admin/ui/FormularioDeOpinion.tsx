'use client'

import { useActionState, useId } from 'react'
import { responderOpinionAction, type OpinionState } from '@/app/_acciones/events/opinion-actions'
import type { OpinionDictionary } from '@/shared/i18n/dictionary'

const INICIAL: OpinionState = { status: 'idle' }

/**
 * Las cinco estrellas, el comentario y el permiso de publicar. Es la web pública: dorado y
 * marfil, no la tinta del panel. Las estrellas son radios nativos —se eligen con teclado— y cada
 * una dice su palabra al lector de pantalla.
 */
export function FormularioDeOpinion({ token, textos: t }: { token: string; textos: OpinionDictionary }) {
  const [estado, enviar, enviando] = useActionState(responderOpinionAction, INICIAL)
  const id = useId()
  if (estado.status === 'success') {
    return (
      <section className="rounded-[18px] border border-line bg-bg-top/60 p-6">
        <p className="font-display text-[26px] text-ink">{t.thanksTitle}</p>
        <p className="mt-1 text-[14px] text-ink-soft">{t.thanksText}</p>
      </section>
    )
  }
  const error = estado.status === 'error' ? { rating: t.errorRating, failed: t.errorFailed, rateLimited: t.errorRateLimited }[estado.code] : null
  return (
    <form action={enviar} className="flex flex-col gap-6 rounded-[18px] border border-line bg-bg-top/60 p-6">
      <input name="token" type="hidden" value={token} />
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-[14px] text-ink">{t.rating}</legend>
        {/* De cinco a una en el DOM y al revés en pantalla: la elegida y las que la siguen en el DOM —las de su izquierda— se pintan doradas con `~`. */}
        <div className="flex flex-row-reverse justify-end gap-1.5">
          {[5, 4, 3, 2, 1].map((n) => (
            <label
              className="cursor-pointer has-[:checked]:[&_svg]:fill-gold hover:[&_svg]:fill-gold/60 [&:has(:checked)~label_svg]:fill-gold [&:hover~label_svg]:fill-gold/60"
              key={n}
            >
              <input className="peer sr-only" name="rating" required type="radio" value={n} />
              <span className="sr-only">{t.stars[n - 1]}</span>
              <svg
                aria-hidden
                className="size-9 fill-transparent stroke-gold transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold"
                strokeWidth="1.3"
                viewBox="0 0 24 24"
              >
                <path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z" />
              </svg>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-2" htmlFor={`${id}-c`}>
        <span className="text-[14px] text-ink">{t.comment}</span>
        <textarea className="min-h-28 rounded-[14px] border border-line bg-white/80 px-4 py-3 text-[14px] text-ink outline-none focus:border-gold" id={`${id}-c`} maxLength={2000} name="comentario" placeholder={t.commentPlaceholder} />
      </label>
      <label className="flex cursor-pointer items-start gap-3 text-[13px] text-ink-soft">
        <input className="mt-0.5 accent-gold" name="publicar" type="checkbox" />
        {t.allowPublish}
      </label>
      {error === null ? null : (
        <p className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}
      <button
        aria-busy={enviando}
        className="self-start rounded-[var(--radius-pill)] bg-gold px-6 py-3 font-mono text-[11px] tracking-[var(--tracking-luxe)] text-on-gold uppercase transition-colors hover:bg-gold-deep disabled:opacity-50"
        disabled={enviando}
        type="submit"
      >
        {enviando ? t.submitting : t.submit}
      </button>
    </form>
  )
}
