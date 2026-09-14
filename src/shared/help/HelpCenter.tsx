'use client'

import { useMemo, useState } from 'react'
import { SearchField } from '@/shared/design/ui/panel/PanelKit'
import { enlaceWhatsapp } from '@/shared/whatsapp'
import { HELP_TOPICS, type HelpContact } from './topics'

/**
 * El centro de ayuda del panel. Cada pregunta se abre y se cierra por su cuenta: se
 * pueden leer dos a la vez, que es lo que hace falta cuando se está comparando lo que
 * trae un plan con lo que trae otro.
 */
export function HelpCenter({ contacto }: { contacto: HelpContact }) {
  const whatsapp = enlaceWhatsapp(contacto.numero, contacto.saludo)
  const [abiertas, setAbiertas] = useState<readonly string[]>([])
  const [busqueda, setBusqueda] = useState('')

  // Busca en la pregunta **y en la respuesta**: quien no sabe cómo se llama lo que busca
  // escribe la palabra que recuerda del texto, y eso es justo lo que hay que encontrar.
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase()
    if (q === '') return HELP_TOPICS
    return HELP_TOPICS.filter(
      (t) => t.question.toLocaleLowerCase().includes(q) || t.answer.toLocaleLowerCase().includes(q),
    )
  }, [busqueda])

  const alternar = (question: string) =>
    setAbiertas((previas) =>
      previas.includes(question) ? previas.filter((q) => q !== question) : [...previas, question],
    )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex">
        <SearchField
          label="Buscar en preguntas frecuentes"
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar en preguntas frecuentes…"
          value={busqueda}
        />
      </div>

      {visibles.length === 0 ? (
        <p className="text-[13px] text-ink-mute">
          Ninguna pregunta coincide con «{busqueda.trim()}». Escríbenos y te contestamos.
        </p>
      ) : null}

      <ul className="flex flex-col">
        {visibles.map((topic) => {
          const abierta = abiertas.includes(topic.question)

          return (
            <li key={topic.question} className="border-b border-line-panel">
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
        {whatsapp === null ? (
          <p className="text-[13px] leading-[1.7] text-ink-soft">El administrador todavía no ha configurado el WhatsApp de soporte.</p>
        ) : (
          <>
            <p className="text-[13px] leading-[1.7] text-ink-soft">Escríbenos y lo vemos contigo.</p>
            <div className="flex flex-wrap items-center gap-5">
              <a className="text-[13px] text-gold-deep underline underline-offset-4" href={whatsapp} rel="noopener noreferrer" target="_blank">
                WhatsApp {contacto.visible}
              </a>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
