'use client'

import { useState } from 'react'
import { HELP_CONTACT, HELP_TOPICS } from './topics'

/**
 * El centro de ayuda del panel. Cada pregunta se abre y se cierra por su cuenta: se
 * pueden leer dos a la vez, que es lo que hace falta cuando se está comparando lo que
 * trae un plan con lo que trae otro.
 */
export function HelpCenter() {
  const [abiertas, setAbiertas] = useState<readonly string[]>([])

  const alternar = (question: string) =>
    setAbiertas((previas) =>
      previas.includes(question) ? previas.filter((q) => q !== question) : [...previas, question],
    )

  return (
    <div className="flex flex-col gap-10">
      <ul className="flex flex-col">
        {HELP_TOPICS.map((topic) => {
          const abierta = abiertas.includes(topic.question)

          return (
            <li key={topic.question} className="border-b border-line">
              <button
                aria-expanded={abierta}
                className="flex w-full items-center justify-between gap-6 py-5 text-left text-[15px] text-ink"
                onClick={() => alternar(topic.question)}
                type="button"
              >
                {topic.question}
                <span aria-hidden className="font-mono text-[13px] text-ink-mute">
                  {abierta ? '−' : '+'}
                </span>
              </button>

              {abierta ? <p className="pb-5 text-[13px] leading-[1.8] text-ink-soft">{topic.answer}</p> : null}
            </li>
          )
        })}
      </ul>

      <section className="flex flex-col gap-3 rounded-card border border-line p-6">
        <h2 className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">¿Sigues con la duda?</h2>
        <p className="text-[13px] leading-[1.7] text-ink-soft">Escríbenos y lo vemos contigo.</p>
        <div className="flex flex-wrap items-center gap-5">
          <a
            className="text-[13px] text-gold-deep underline underline-offset-4"
            href={HELP_CONTACT.whatsappHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            WhatsApp {HELP_CONTACT.whatsappLabel}
          </a>
          <a className="text-[13px] text-gold-deep underline underline-offset-4" href={HELP_CONTACT.emailHref}>
            {HELP_CONTACT.emailLabel}
          </a>
        </div>
      </section>
    </div>
  )
}
